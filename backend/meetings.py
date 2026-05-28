import os
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from dotenv import load_dotenv

from database import supabase, STORAGE_BUCKET
from auth import get_current_user
from models import MeetingResponse, UpdateTitleRequest
from ai import transcribe_audio, process_transcript

load_dotenv()

ALLOWED_TYPES = {"audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4",
                 "video/mp4", "audio/x-m4a", "audio/m4a"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB in bytes

router = APIRouter(prefix="/meetings", tags=["meetings"])


def run_pipeline(meeting_id: str, file_bytes: bytes, filename: str):
    """
    Core processing pipeline: Whisper → Claude → update meeting in DB.
    Called by both upload and retry endpoints.
    """
    try:
        # Step 1: Transcribe with Whisper
        transcript = transcribe_audio(file_bytes, filename)

        # Step 2: Extract structured info with Claude
        extracted = process_transcript(transcript)

        # Step 3: Save everything to DB
        supabase.table("meetings").update({
            "transcript": transcript,
            "title": extracted.get("title", filename),
            "tldr": extracted.get("tldr", None),
            "summary": extracted.get("summary", ""),
            "decisions": extracted.get("decisions", []),
            "action_items": extracted.get("action_items", []),
            "topics": extracted.get("topics", []),
            "status": "completed",
            "error_message": None,
        }).eq("id", meeting_id).execute()

    except Exception as e:
        supabase.table("meetings").update({
            "status": "failed",
            "error_message": str(e),
        }).eq("id", meeting_id).execute()
        raise


@router.post("/upload")
def upload_meeting(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user),
):
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload MP3, MP4, WAV, or M4A."
        )

    # Read file into memory and check size
    file_bytes = file.file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File exceeds 25MB limit. Try trimming with QuickTime or compressing with HandBrake."
        )

    # Upload to Supabase Storage
    storage_path = f"{current_user}/{uuid.uuid4()}_{file.filename}"
    supabase.storage.from_(STORAGE_BUCKET).upload(
        path=storage_path,
        file=file_bytes,
        file_options={"content-type": file.content_type},
    )

    # Get the public URL for the stored file
    file_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)

    # Strip extension from filename for the default title
    default_title = os.path.splitext(file.filename)[0]

    # Create the meeting record in DB (status: processing)
    result = supabase.table("meetings").insert({
        "user_id": current_user,
        "title": default_title,
        "file_url": file_url,
        "status": "processing",
    }).execute()

    meeting = result.data[0]
    meeting_id = meeting["id"]

    # Run the Whisper + Claude pipeline (synchronous — user waits)
    try:
        run_pipeline(meeting_id, file_bytes, file.filename)
    except Exception:
        # Pipeline failed — fetch the updated (failed) meeting and return it
        failed = supabase.table("meetings").select("*").eq("id", meeting_id).execute()
        return failed.data[0]

    # Return the completed meeting
    completed = supabase.table("meetings").select("*").eq("id", meeting_id).execute()
    return completed.data[0]


@router.get("")
def list_meetings(
    search: str = Query(None, description="Filter by title or summary keyword"),
    current_user: str = Depends(get_current_user),
):
    query = supabase.table("meetings").select("*").eq("user_id", current_user).order("created_at", desc=True)

    result = query.execute()
    meetings = result.data

    # Word-by-word search across title, summary, and tldr
    if search:
        words = search.lower().split()
        meetings = [
            m for m in meetings
            if all(
                w in (m.get("title") or "").lower()
                or w in (m.get("summary") or "").lower()
                or w in (m.get("tldr") or "").lower()
                for w in words
            )
        ]

    return meetings


@router.get("/{meeting_id}")
def get_meeting(meeting_id: str, current_user: str = Depends(get_current_user)):
    result = supabase.table("meetings").select("*").eq("id", meeting_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting = result.data[0]
    if meeting["user_id"] != current_user:
        raise HTTPException(status_code=403, detail="Access denied")

    return meeting


@router.put("/{meeting_id}")
def update_title(
    meeting_id: str,
    body: UpdateTitleRequest,
    current_user: str = Depends(get_current_user),
):
    # Verify ownership first
    result = supabase.table("meetings").select("user_id").eq("id", meeting_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if result.data[0]["user_id"] != current_user:
        raise HTTPException(status_code=403, detail="Access denied")

    updated = supabase.table("meetings").update({"title": body.title}).eq("id", meeting_id).execute()
    return updated.data[0]


@router.delete("/{meeting_id}")
def delete_meeting(meeting_id: str, current_user: str = Depends(get_current_user)):
    # Verify ownership and get file_url for storage cleanup
    result = supabase.table("meetings").select("*").eq("id", meeting_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting = result.data[0]
    if meeting["user_id"] != current_user:
        raise HTTPException(status_code=403, detail="Access denied")

    # Delete file from Supabase Storage (extract the path from the URL)
    if meeting.get("file_url"):
        try:
            # file_url looks like: https://<project>.supabase.co/storage/v1/object/public/meetings/<path>
            url_parts = meeting["file_url"].split(f"/object/public/{STORAGE_BUCKET}/")
            if len(url_parts) == 2:
                storage_path = url_parts[1]
                supabase.storage.from_(STORAGE_BUCKET).remove([storage_path])
        except Exception:
            pass  # Don't fail the delete if storage cleanup fails

    # Delete the meeting row (cascades to messages table)
    supabase.table("meetings").delete().eq("id", meeting_id).execute()
    return {"message": "Meeting deleted"}


@router.post("/{meeting_id}/retry")
def retry_meeting(meeting_id: str, current_user: str = Depends(get_current_user)):
    result = supabase.table("meetings").select("*").eq("id", meeting_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting = result.data[0]
    if meeting["user_id"] != current_user:
        raise HTTPException(status_code=403, detail="Access denied")
    if not meeting.get("file_url"):
        raise HTTPException(status_code=400, detail="No file to retry processing")

    # Reset status to processing
    supabase.table("meetings").update({"status": "processing", "error_message": None}).eq("id", meeting_id).execute()

    # Download the file from Supabase Storage to re-process it
    url_parts = meeting["file_url"].split(f"/object/public/{STORAGE_BUCKET}/")
    if len(url_parts) != 2:
        raise HTTPException(status_code=400, detail="Could not retrieve stored file")

    storage_path = url_parts[1]
    filename = storage_path.split("/")[-1]

    # Download file bytes from storage
    file_bytes = supabase.storage.from_(STORAGE_BUCKET).download(storage_path)

    try:
        run_pipeline(meeting_id, file_bytes, filename)
    except Exception:
        pass

    updated = supabase.table("meetings").select("*").eq("id", meeting_id).execute()
    return updated.data[0]
