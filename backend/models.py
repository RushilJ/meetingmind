from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# --- Auth ---

class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Meetings ---

class ActionItem(BaseModel):
    owner: str
    task: str
    due: Optional[str] = None

class MeetingResponse(BaseModel):
    id: str
    user_id: str
    title: str
    file_url: Optional[str] = None
    transcript: Optional[str] = None
    tldr: Optional[str] = None
    summary: Optional[str] = None
    decisions: Optional[List[str]] = None
    action_items: Optional[List[ActionItem]] = None
    topics: Optional[List[str]] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime

class UpdateTitleRequest(BaseModel):
    title: str


# --- Chat ---

class ChatRequest(BaseModel):
    question: str

class MessageResponse(BaseModel):
    id: str
    meeting_id: str
    role: str        # 'user' or 'assistant'
    content: str
    created_at: datetime

class ChatResponse(BaseModel):
    answer: str
    message: MessageResponse
