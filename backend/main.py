from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import router as auth_router
from meetings import router as meetings_router
from chat import router as chat_router

app = FastAPI(title="MeetingMind API", version="1.0.0")

# CORS — allows the Next.js frontend to call this API from the browser.
# In production, replace "*" origins with your actual Vercel URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(meetings_router)
app.include_router(chat_router)


@app.get("/health")
def health():
    return {"status": "ok"}
