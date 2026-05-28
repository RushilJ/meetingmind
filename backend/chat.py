from fastapi import APIRouter, HTTPException, Depends

from database import supabase
from auth import get_current_user
from models import ChatRequest
from ai import chat_with_transcript

router = APIRouter(tags=["chat"])


def _verify_meeting_ownership(meeting_id: str, user_id: str) -> dict:
    """Shared helper: fetch meeting and verify it belongs to user_id."""
    result = supabase.table("meetings").select("*").eq("id", meeting_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")
    meeting = result.data[0]
    if meeting["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return meeting


@router.get("/meetings/{meeting_id}/messages")
def get_messages(meeting_id: str, current_user: str = Depends(get_current_user)):
    _verify_meeting_ownership(meeting_id, current_user)

    result = supabase.table("messages") \
        .select("*") \
        .eq("meeting_id", meeting_id) \
        .order("created_at", desc=False) \
        .execute()

    return result.data


@router.post("/meetings/{meeting_id}/chat")
def send_message(
    meeting_id: str,
    body: ChatRequest,
    current_user: str = Depends(get_current_user),
):
    meeting = _verify_meeting_ownership(meeting_id, current_user)

    if meeting.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Meeting is not ready for chat yet")

    transcript = meeting.get("transcript", "")

    # Fetch last 10 messages for context
    history_result = supabase.table("messages") \
        .select("role, content") \
        .eq("meeting_id", meeting_id) \
        .order("created_at", desc=True) \
        .limit(10) \
        .execute()

    # Reverse so oldest messages are first (chronological order for Claude)
    message_history = list(reversed(history_result.data))

    # Get Claude's answer
    answer = chat_with_transcript(transcript, message_history, body.question)

    # Save user message
    user_msg = supabase.table("messages").insert({
        "meeting_id": meeting_id,
        "role": "user",
        "content": body.question,
    }).execute().data[0]

    # Save assistant message
    assistant_msg = supabase.table("messages").insert({
        "meeting_id": meeting_id,
        "role": "assistant",
        "content": answer,
    }).execute().data[0]

    return {"answer": answer, "message": assistant_msg}
