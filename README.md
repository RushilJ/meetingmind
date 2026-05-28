# MeetingMind

**AI-powered meeting intelligence.** Upload a recording, get back a transcript, a summary, the decisions, the action items — and a meeting you can talk to.

![MeetingMind Dashboard](https://github.com/RushilJ/meetingmind/raw/main/design_handoff_meetingmind/preview.png)

---

## What it does

Most meeting notes get written once and never read again. MeetingMind turns any audio or video recording into a structured, searchable, conversational knowledge base.

| Feature | Description |
|---|---|
| **Transcription** | Deepgram nova-2 converts audio to text with smart formatting |
| **AI Extraction** | Gemini 2.5 Flash pulls out a TL;DR, full summary, key decisions, and structured action items (owner + task + due date) |
| **Chat** | Ask the meeting anything — get answers grounded in the transcript, plus AI recommendations |
| **Dashboard** | Search across all your meetings by keyword |
| **Inline editing** | Rename any meeting title in place |
| **Persistent history** | Chat messages saved to DB — pick up where you left off |

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | Supabase (Postgres + Storage) |
| Transcription | Deepgram nova-2 |
| AI | Google Gemini 2.5 Flash |
| Auth | JWT (HS256, stored in localStorage) |
| Deployment | Vercel (frontend) · Railway (backend) |

---

## Getting started

### Prerequisites
- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) project
- A [Deepgram](https://deepgram.com) API key (free tier)
- A [Gemini](https://aistudio.google.com) API key (free tier)

### 1. Clone the repo

```bash
git clone https://github.com/RushilJ/meetingmind.git
cd meetingmind
```

### 2. Database setup

Run the following SQL in your Supabase SQL editor:

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

Create a Storage bucket named `meetings` and set it to public.

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
JWT_SECRET=your_random_32_char_secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
```

```bash
uvicorn main:app --reload
# Backend running at http://localhost:8000
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
# Frontend running at http://localhost:3000
```

---

## API reference

### Auth
```
POST /auth/register    → { user_id, username }
POST /auth/login       → { access_token, token_type }
```

### Meetings
```
GET    /meetings                → list all meetings (supports ?search=)
POST   /meetings/upload         → upload file → transcribe → extract → return meeting
GET    /meetings/{id}           → get single meeting
PUT    /meetings/{id}           → update title
DELETE /meetings/{id}           → delete meeting + storage file
POST   /meetings/{id}/retry     → re-run pipeline on existing file
```

### Chat
```
GET  /meetings/{id}/messages    → get chat history
POST /meetings/{id}/chat        → send message, get AI response
```

---

## Supported file formats

`MP3 · MP4 · WAV · M4A · AAC · FLAC · OGG · MOV · MKV · WEBM` — max 25 MB

---

## Project structure

```
meetingmind/
├── backend/
│   ├── main.py          # FastAPI app, CORS, router registration
│   ├── auth.py          # Register, login, JWT utils
│   ├── meetings.py      # Upload, list, get, update, delete, retry
│   ├── chat.py          # Chat endpoints
│   ├── ai.py            # Deepgram + Gemini API calls
│   ├── database.py      # Supabase client
│   ├── models.py        # Pydantic models
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx              # Login / register
    │   ├── dashboard/page.tsx    # Meeting list + search
    │   ├── upload/page.tsx       # Upload + processing state
    │   └── meeting/[id]/page.tsx # Meeting detail + chat rail
    ├── components/
    │   ├── Mark.tsx       # Brand mark SVG
    │   └── Waveform.tsx   # Deterministic + live waveform
    └── lib/
        ├── api.ts         # Typed API client
        └── auth.ts        # Token helpers
```

---

## Deployment

**Backend → Railway**
1. New project → deploy from GitHub → set root directory to `backend`
2. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Add all env vars from `backend/.env`

**Frontend → Vercel**
1. New project → import from GitHub → set root directory to `frontend`
2. Add env var: `NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app`

---

## License

MIT
