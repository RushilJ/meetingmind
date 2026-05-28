import { getAuthHeaders } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Types ---

export interface ActionItem {
  owner: string;
  task: string;
  due: string | null;
}

export interface Meeting {
  id: string;
  user_id: string;
  title: string;
  file_url?: string;
  transcript?: string;
  tldr?: string;
  summary?: string;
  decisions?: string[];
  action_items?: ActionItem[];
  topics?: string[];
  status: "processing" | "completed" | "failed";
  error_message?: string;
  created_at: string;
}

export interface Message {
  id: string;
  meeting_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// --- Core fetch helper ---

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    // Token expired or invalid — redirect to login
    if (typeof window !== "undefined") {
      localStorage.removeItem("meetingmind_token");
      window.location.href = "/";
    }
  }

  return res;
}

// --- Auth ---

export async function register(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Registration failed");
  }
  return res.json();
}

export async function login(username: string, password: string): Promise<{ access_token: string }> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Login failed");
  }
  return res.json();
}

// --- Meetings ---

export async function getMeetings(search?: string): Promise<Meeting[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await apiFetch(`/meetings${params}`);
  if (!res.ok) throw new Error("Failed to fetch meetings");
  return res.json();
}

export async function getMeeting(id: string): Promise<Meeting> {
  const res = await apiFetch(`/meetings/${id}`);
  if (!res.ok) throw new Error("Meeting not found");
  return res.json();
}

export async function uploadMeeting(file: File): Promise<Meeting> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/meetings/upload`, {
    method: "POST",
    headers: getAuthHeaders(), // No Content-Type — browser sets it with boundary for multipart
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function updateMeetingTitle(id: string, title: string): Promise<Meeting> {
  const res = await apiFetch(`/meetings/${id}`, {
    method: "PUT",
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to update title");
  return res.json();
}

export async function deleteMeeting(id: string): Promise<void> {
  const res = await apiFetch(`/meetings/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete meeting");
}

export async function retryMeeting(id: string): Promise<Meeting> {
  const res = await apiFetch(`/meetings/${id}/retry`, { method: "POST" });
  if (!res.ok) throw new Error("Retry failed");
  return res.json();
}

// --- Chat ---

export async function getMessages(meetingId: string): Promise<Message[]> {
  const res = await apiFetch(`/meetings/${meetingId}/messages`);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export async function sendChatMessage(meetingId: string, question: string): Promise<{ answer: string; message: Message }> {
  const res = await apiFetch(`/meetings/${meetingId}/chat`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}
