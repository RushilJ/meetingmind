# MeetingMind

**Upload a meeting recording. Get back a transcript, a summary, key decisions, and action items — then ask the meeting anything.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-meetingmind--alpha--puce.vercel.app-6366f1?style=flat-square)](https://meetingmind-alpha-puce.vercel.app)
[![Backend](https://img.shields.io/badge/API-Railway-6366f1?style=flat-square)](https://meetingmind-production-d2ec.up.railway.app/health)
[![TypeScript](https://img.shields.io/badge/TypeScript-79%25-3178c6?style=flat-square)](https://github.com/RushilJ/meetingmind)
[![Python](https://img.shields.io/badge/Python-16%25-3776ab?style=flat-square)](https://github.com/RushilJ/meetingmind)

---

## What it does

Most meeting notes get written once and never read again. MeetingMind turns any audio or video recording into a structured, conversational knowledge base.

| | Feature | Detail |
|---|---|---|
| 🎙️ | **Transcription** | Deepgram nova-2 with smart formatting (punctuation, paragraphs) |
| 🤖 | **AI Extraction** | Gemini 2.5 Flash → TL;DR, full summary, key decisions, action items (owner + task + due date), topic tags |
| 💬 | **Chat** | Ask anything about the meeting — answers grounded in the transcript, plus independent AI recommendations |
| 🔍 | **Search** | Keyword search across all meetings (all words must match, anywhere in title/summary/TL;DR) |
| ✏️ | **Inline editing** | Rename meeting titles in place — auto-saves on blur or Enter |
| 💾 | **Persistent chat** | All messages saved to DB — pick up any conversation where you left off |
| 🔄 | **Retry** | Failed processing jobs show the error and can be re-run on the stored file |

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | Supabase (PostgreSQL + Storage) |
| Transcription | Deepgram nova-2 |
| AI | Google Gemini 2.5 Flash |
| Auth | JWT HS256 · 24-hour expiry |
| Deployment | Vercel (frontend) · Railway (backend) |

---

## Running locally

### Prerequisites

- Node.js 18+
- Python 3.11+
- [Supabase](https://supabase.com) project (free tier works)
- [Deepgram](https://deepgram.com) API key (free tier)
- [Gemini](https://aistudio.google.com) API key (free tier)

### 1. Clone

```bash
git clone https://github.com/RushilJ/meetingmind.git
cd meetingmind
```

### 2. Database

Run this SQL in your Supabase SQL editor:

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text,
  transcript text,
  tldr text,
  summary text,
  decisions jsonb,
  action_items jsonb,
  topics jsonb,
  status text DEFAULT 'processing',
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

Then create a Storage bucket named `meetings` and set it to **public**.

### 3. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DEEPGRAM_API_KEY=your_deepgram_key
GEMINI_API_KEY=your_gemini_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=meetings
JWT_SECRET=any_random_32_char_string
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
```

```bash
uvicorn main:app --reload
# http://localhost:8000
```

### 4. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
# http://localhost:3000
```

---

## API reference

All meeting and chat endpoints require `Authorization: Bearer <token>`.

### Auth
```
POST /auth/register    { username, password }  →  { user_id, username }
POST /auth/login       { username, password }  →  { access_token, token_type }
```

### Meetings
```
GET    /meetings                →  list all meetings for user (?search= supported)
POST   /meetings/upload         →  upload file → transcribe → extract → return meeting
GET    /meetings/{id}           →  single meeting details
PUT    /meetings/{id}           →  update title
DELETE /meetings/{id}           →  delete meeting + storage file
POST   /meetings/{id}/retry     →  re-run pipeline on existing stored file
```

### Chat
```
GET  /meetings/{id}/messages    →  full chat history (chronological)
POST /meetings/{id}/chat        →  { question }  →  { answer, message }
```

### Health
```
GET  /health  →  { status: "ok" }
```

---

## Supported formats

`MP3 · MP4 · WAV · M4A · AAC · FLAC · OGG · MOV · MKV · WEBM` — max 25 MB

---

## Project structure

```
meetingmind/
├── backend/
│   ├── main.py          # FastAPI app, CORS, router registration
│   ├── auth.py          # Register, login, JWT utils, get_current_user dependency
│   ├── meetings.py      # Upload, list, get, update, delete, retry endpoints
│   ├── chat.py          # Chat message endpoints
│   ├── ai.py            # Deepgram + Gemini API calls, prompt logic
│   ├── database.py      # Supabase client init
│   ├── models.py        # Pydantic request/response models
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx               # Login / register
    │   ├── dashboard/page.tsx     # Meeting list + search
    │   ├── upload/page.tsx        # Upload + processing state
    │   └── meeting/[id]/page.tsx  # Meeting detail + chat rail
    ├── components/
    │   ├── Mark.tsx       # Brand mark SVG
    │   └── Waveform.tsx   # Deterministic + live waveform
    └── lib/
        ├── api.ts         # Typed API client, auto-redirect on 401
        └── auth.ts        # Token helpers (localStorage)
```

---

## Deploying

**Backend → Railway**
1. New project → deploy from GitHub → root directory: `backend`
2. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Add all env vars from `backend/.env` in the Variables tab

**Frontend → Vercel**
1. New project → import from GitHub → root directory: `frontend`
2. Add env var: `NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app`

Both auto-deploy on every push to `main`.

---

*Built by Rushil Jain (BITS Pilani) — KVGAI Tech PS-I 2026*
