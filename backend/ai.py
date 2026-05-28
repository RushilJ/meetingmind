import os
import json
import asyncio
import google.generativeai as genai
from deepgram import DeepgramClient, PrerecordedOptions
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
deepgram_client = DeepgramClient(api_key=os.getenv("DEEPGRAM_API_KEY"))

GEMINI_MODEL = "gemini-2.5-flash"


def transcribe_audio(file_bytes: bytes, filename: str) -> str:
    """Send audio/video file to Deepgram, return transcript text."""
    options = PrerecordedOptions(model="nova-2", smart_format=True)
    payload = {"buffer": file_bytes}

    response = asyncio.run(
        deepgram_client.listen.asyncprerecorded.v("1").transcribe_file(payload, options)
    )

    return response.results.channels[0].alternatives[0].transcript


def process_transcript(transcript: str) -> dict:
    """
    Send transcript to Gemini. Returns dict with:
      title, tldr, summary, decisions (list), action_items (list of objects), topics (list)
    """
    prompt = f"""You are an expert meeting analyst with deep experience in business communication, project management, and organizational decision-making.

Your task is to analyze the meeting transcript provided and extract structured, actionable intelligence from it.

## Output Requirements
- Return ONLY valid, parseable JSON — no markdown, no code fences, no preamble, no explanation.
- Do not fabricate, infer beyond reasonable context, or hallucinate details not present in the transcript.
- If a field has no data, return an empty array [] or null — never omit the key.

## Extraction Rules

**Title**
- Max 6 words. Describe what the meeting was *actually* about (e.g., "Q3 Budget Cut Decisions" not "Team Meeting").

**TL;DR**
- One sentence only. Capture: what this meeting was fundamentally about + what the net outcome was.

**Summary**
- Exactly 3–4 sentences covering in order:
  1. Why this meeting was called / what triggered it
  2. The main topics discussed (use names, numbers, specifics)
  3. The key conclusions reached
  4. What happens next / immediate next steps

**Decisions**
- Only include *definitive conclusions* — not options floated, not topics discussed.
- Each decision must state: what was decided + relevant context or rationale if mentioned.
- Format: "The team decided to [X] because [Y]." (when Y is known)

**Action Items**
- Every item MUST have a clear owner (use the person's name if stated; infer from context if reasonable; use "Team" only as a last resort).
- Task descriptions must be specific and executable — not vague (e.g., "Sarah to send revised Q3 budget to stakeholders by Friday" not "discuss budget").
- Include deadline if explicitly mentioned; otherwise set due to null.

**Topics**
- 3–6 short topic tags that reflect the actual subjects covered (e.g., "budget cuts", "hiring freeze", "vendor contract renewal").

## JSON Structure (return exactly this shape)
{{
  "title": "string",
  "tldr": "string",
  "summary": "string",
  "decisions": [
    "string"
  ],
  "action_items": [
    {{
      "owner": "string",
      "task": "string",
      "due": "string | null"
    }}
  ],
  "topics": ["string", "string", "string"]
}}

## TRANSCRIPT
{transcript}"""

    model = genai.GenerativeModel(GEMINI_MODEL)
    response = model.generate_content(prompt)
    raw = response.text.strip()

    # Strip markdown code fences if Gemini adds them
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    return json.loads(raw)


def chat_with_transcript(transcript: str, message_history: list, question: str) -> str:
    """
    Send a user question + the meeting transcript to Gemini.
    message_history is a list of {"role": "user"/"assistant", "content": "..."} dicts.
    Returns Gemini's answer as a string.
    """
    # Build conversation history in Gemini's format (roles: "user" / "model")
    history = []
    for msg in message_history:
        role = "model" if msg["role"] == "assistant" else "user"
        history.append({"role": role, "parts": [msg["content"]]})

    system_prompt = f"""You are an expert meeting analyst and strategic advisor with deep experience \
in business communication, project management, and organizational decision-making.

You have access to the meeting transcript below. When answering questions, you operate in two modes simultaneously:

## Mode 1 — Transcript Analysis
- Extract and present only what is explicitly stated in the transcript.
- Use names, numbers, and concrete details — avoid vague summaries.
- Label this section: "📋 From the Transcript"

## Mode 2 — AI Recommendations
- Go beyond the transcript: offer your own analysis, suggestions, risks, patterns, or recommendations.
- Draw from your own knowledge and reasoning — no external sources.
- Clearly flag when something is your suggestion and not from the transcript.
- Label this section: "⚡ AI Recommendations"

## Response Format
Always structure your response like this:

📋 From the Transcript
[What the transcript directly says about this question]

⚡ AI Recommendations
[Your independent analysis, suggestions, or additional context based on your own reasoning]

## Rules
- Never mix the two sections — keep transcript facts and your suggestions strictly separate.
- If the transcript has nothing relevant to the question, say so in the first section, then proceed with insights.
- If you have nothing to add beyond the transcript, say: "No additional insights for this one."
- Be concise but complete. No filler.

## MEETING TRANSCRIPT
{transcript}"""

    model = genai.GenerativeModel(GEMINI_MODEL, system_instruction=system_prompt)
    chat = model.start_chat(history=history)
    response = chat.send_message(question)
    return response.text
