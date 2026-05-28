"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadMeeting } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { Mark } from "@/components/Mark";
import { Waveform, LiveWaveform } from "@/components/Waveform";

const ACCEPTED_TYPES = [
  "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/m4a",
  "audio/aac", "audio/flac", "audio/ogg", "audio/opus", "audio/webm",
  "video/mp4", "video/quicktime", "video/x-matroska", "video/x-msvideo", "video/webm",
];
const MAX_SIZE_MB = 25;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function PipeStep({ n, label, sub, state }: { n: string; label: string; sub: string; state: "done" | "active" | "pending" }) {
  const done = state === "done";
  const active = state === "active";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, position: "relative" }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: done ? "#6366f1" : "var(--color-mm-bg)",
        border: `1.5px solid ${done ? "#6366f1" : active ? "#6366f1" : "var(--color-mm-border)"}`,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: done ? "#fff" : active ? "#6366f1" : "var(--color-mm-text4)",
        fontFamily: "var(--font-jetbrains-mono)", fontSize: 13, fontWeight: 500,
        position: "relative",
      }}>
        {done ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        ) : n}
        {active && (
          <span style={{
            position: "absolute", inset: -6, borderRadius: "50%",
            border: "1.5px solid #6366f1", opacity: 0.4,
            animation: "mm-pulse-ring 1.8s ease-out infinite",
          }} />
        )}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--font-space-grotesk)", fontSize: 14, fontWeight: 500,
          color: done || active ? "var(--color-mm-text)" : "var(--color-mm-text3)", marginBottom: 4,
        }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--color-mm-text3)" }}>{sub}</div>
      </div>
    </div>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isLoggedIn()) router.replace("/");
  }, [router]);

  useEffect(() => {
    if (!uploading) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [uploading]);

  function validateFile(f: File): string | null {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return "Unsupported file type. Please upload MP3, MP4, WAV, M4A, AAC, FLAC, OGG, MOV, MKV, or WEBM.";
    }
    if (f.size > MAX_SIZE_BYTES) {
      return `File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max is 25 MB.\nTip: Trim with QuickTime (Mac) or compress with HandBrake (free).`;
    }
    return null;
  }

  function handleFileChange(f: File) {
    const err = validateFile(f);
    if (err) { setError(err); setFile(null); }
    else { setError(""); setFile(f); }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileChange(dropped);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const meeting = await uploadMeeting(file);
      if (meeting.status === "failed") {
        setError(meeting.error_message || "Processing failed. You can retry from the dashboard.");
        setUploading(false);
      } else {
        router.push(`/meeting/${meeting.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }

  // ── Processing state ──────────────────────────────────────────────────────
  if (uploading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-mm-bg)", color: "var(--color-mm-text)", fontFamily: "var(--font-inter), sans-serif", overflowY: "auto" }}>
        {/* Top bar */}
        <header style={{
          height: 56, display: "flex", alignItems: "center", padding: "0 24px",
          borderBottom: "1px solid var(--color-mm-border)",
          background: "rgba(28,28,32,0.6)", backdropFilter: "blur(20px)",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--color-mm-text3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Step 02 / 02
            </span>
            <span style={{ width: 60, height: 1, background: "#6366f1", display: "inline-block" }} />
            <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 14, fontWeight: 500, color: "var(--color-mm-text)" }}>
              Processing
            </span>
          </div>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-mm-text3)", fontFamily: "var(--font-jetbrains-mono)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", display: "inline-block", animation: "mm-pulse 1s ease-in-out infinite" }} />
            Working
          </span>
        </header>

        <div style={{ padding: "56px 80px", display: "flex", flexDirection: "column", gap: 40, position: "relative", maxWidth: 1100, margin: "0 auto" }}>
          {/* Glow */}
          <div style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            width: 900, height: 400, pointerEvents: "none",
            background: "radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0) 60%)",
          }} />

          {/* File pill + headline */}
          <div style={{ position: "relative", textAlign: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "6px 14px", background: "var(--color-mm-surface)", border: "1px solid var(--color-mm-border)",
              borderRadius: 999, marginBottom: 24,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-mm-text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 12, color: "var(--color-mm-text2)" }}>
                {file?.name}
              </span>
              <span style={{ color: "var(--color-mm-text4)" }}>·</span>
              <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 12, color: "var(--color-mm-text3)" }}>
                {file ? (file.size / 1024 / 1024).toFixed(1) + " MB" : ""}
              </span>
            </div>

            <h1 style={{
              fontFamily: "var(--font-space-grotesk)", fontWeight: 600, fontSize: 48,
              letterSpacing: "-0.03em", color: "var(--color-mm-text)", margin: "0 0 14px", lineHeight: 1.05,
            }}>
              Listening to your meeting.
            </h1>
            <p style={{ fontSize: 15, color: "var(--color-mm-text2)", margin: "0 0 32px" }}>
              Transcribing audio and extracting insights. This usually takes 1–2 minutes.
            </p>

            {/* Live waveform with elapsed */}
            <div style={{
              display: "flex", alignItems: "center", gap: 28,
              padding: "20px 28px", background: "var(--color-mm-surface)",
              border: "1px solid var(--color-mm-border)", borderRadius: 16,
              maxWidth: 800, margin: "0 auto",
            }}>
              <div>
                <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, color: "var(--color-mm-text4)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4 }}>Elapsed</div>
                <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 20, color: "var(--color-mm-text)", fontWeight: 500 }}>{formatTime(elapsed)}</div>
              </div>
              <div style={{ flex: 1, height: 56 }}>
                <LiveWaveform bars={48} height={56} color="#6366f1" />
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 9, color: "var(--color-mm-text4)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4 }}>ETA</div>
                <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 20, color: "var(--color-mm-text2)", fontWeight: 500 }}>~02:00</div>
              </div>
            </div>
          </div>

          {/* Pipeline */}
          <div style={{ position: "relative", maxWidth: 920, margin: "0 auto", width: "100%" }}>
            <div style={{
              fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "var(--color-mm-text4)",
              letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 16, textAlign: "center",
            }}>
              Pipeline
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, position: "relative" }}>
              <div style={{
                position: "absolute", top: 18, left: "12%", right: "12%", height: 1,
                background: "linear-gradient(90deg, #6366f1 0%, #6366f1 28%, var(--color-mm-border) 28%, var(--color-mm-border) 100%)",
              }} />
              <PipeStep n="1" label="Upload" sub="Complete" state="done" />
              <PipeStep n="2" label="Transcribe" sub="In progress" state="active" />
              <PipeStep n="3" label="Extract" sub="Decisions + summary" state="pending" />
              <PipeStep n="4" label="Index" sub="For chat" state="pending" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Upload form ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-mm-bg)", color: "var(--color-mm-text)", fontFamily: "var(--font-inter), sans-serif", overflowY: "auto" }}>
      {/* Top bar */}
      <header style={{
        height: 56, display: "flex", alignItems: "center", padding: "0 24px",
        borderBottom: "1px solid var(--color-mm-border)",
        background: "rgba(28,28,32,0.6)", backdropFilter: "blur(20px)",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid var(--color-mm-border)",
              background: "var(--color-mm-surface)", color: "var(--color-mm-text2)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", marginRight: 6,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--color-mm-text3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
            Step 01 / 02
          </span>
          <span style={{ width: 60, height: 1, background: "var(--color-mm-border)", display: "inline-block", position: "relative" }}>
            <span style={{ position: "absolute", inset: 0, width: "50%", background: "#6366f1", display: "block" }} />
          </span>
          <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 14, fontWeight: 500, color: "var(--color-mm-text)" }}>
            New meeting
          </span>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            padding: "6px 14px", borderRadius: 8, border: "1px solid var(--color-mm-border)",
            background: "transparent", color: "var(--color-mm-text3)", fontSize: 13,
            cursor: "pointer", fontFamily: "var(--font-inter)",
          }}
        >
          Cancel
        </button>
      </header>

      {/* Glow */}
      <div style={{
        position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)",
        width: 900, height: 600, pointerEvents: "none",
        background: "radial-gradient(ellipse, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0) 60%)",
      }} />

      <div style={{ padding: "36px 56px 60px", position: "relative", maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{
          fontFamily: "var(--font-space-grotesk)", fontWeight: 600, fontSize: 44,
          letterSpacing: "-0.03em", color: "var(--color-mm-text)", margin: "0 0 8px", lineHeight: 1,
        }}>
          What did you record?
        </h1>
        <p style={{ fontSize: 15, color: "var(--color-mm-text2)", margin: "0 0 32px" }}>
          Drag a file in, or browse. We&apos;ll handle the rest.
        </p>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: dragOver
              ? "linear-gradient(180deg, rgba(99,102,241,0.08) 0%, var(--color-mm-bg) 100%)"
              : "linear-gradient(180deg, var(--color-mm-surface) 0%, var(--color-mm-bg) 100%)",
            border: `1.5px dashed ${dragOver ? "#6366f1" : "var(--color-mm-border-hi)"}`,
            borderRadius: 20, padding: "64px 48px",
            display: "flex", flexDirection: "column", alignItems: "center",
            position: "relative", overflow: "hidden", cursor: "pointer",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.mp4,.wav,.m4a,.aac,.flac,.ogg,.opus,.webm,.mov,.mkv,.avi"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
          />

          {/* Watermark waveform */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.05, padding: 80, display: "flex", alignItems: "center" }}>
            <Waveform seed="upload-bg" bars={120} height={200} color="var(--color-mm-text)" gap={4} barWidth={3} />
          </div>

          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            {/* Mark with pulse ring */}
            <div style={{ position: "relative", padding: 18 }}>
              <span style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: "1px solid oklch(0.55 0.16 268)", opacity: 0.4,
                animation: "mm-pulse-ring 2.2s ease-out infinite",
              }} />
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(99,102,241,0.08)" }} />
              <Mark size={64} />
            </div>

            <div style={{ textAlign: "center" }}>
              {file ? (
                <>
                  <h2 style={{
                    fontFamily: "var(--font-space-grotesk)", fontWeight: 600, fontSize: 28,
                    letterSpacing: "-0.02em", color: "var(--color-mm-text)", margin: "0 0 8px",
                  }}>
                    {file.name}
                  </h2>
                  <p style={{ fontSize: 14, color: "#6366f1", margin: 0 }}>
                    {(file.size / 1024 / 1024).toFixed(1)} MB · Ready to upload
                  </p>
                </>
              ) : (
                <>
                  <h2 style={{
                    fontFamily: "var(--font-space-grotesk)", fontWeight: 600, fontSize: 36,
                    letterSpacing: "-0.028em", color: "var(--color-mm-text)", margin: "0 0 10px",
                  }}>
                    Drop your recording here
                  </h2>
                  <p style={{ fontSize: 14, color: "var(--color-mm-text3)", margin: 0 }}>
                    or{" "}
                    <span style={{ color: "#6366f1", fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 3 }}>
                      browse from your computer
                    </span>
                  </p>
                </>
              )}
            </div>

            {/* Formats pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: 16, marginTop: 8,
              padding: "10px 18px", background: "var(--color-mm-bg)", border: "1px solid var(--color-mm-border)",
              borderRadius: 10,
            }}>
              <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "var(--color-mm-text3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Accepts
              </span>
              <span style={{ width: 1, height: 14, background: "var(--color-mm-border)", display: "inline-block" }} />
              <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--color-mm-text2)", letterSpacing: "0.04em" }}>
                MP3 · MP4 · WAV · M4A · AAC · FLAC · OGG · MOV · MKV · WEBM
              </span>
              <span style={{ width: 1, height: 14, background: "var(--color-mm-border)", display: "inline-block" }} />
              <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--color-mm-text2)" }}>
                ≤ <span style={{ color: "var(--color-mm-text)" }}>25 MB</span>
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 16, padding: "10px 14px", borderRadius: 8,
            background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)",
            fontSize: 13, color: "var(--color-mm-red)", fontFamily: "var(--font-inter)",
            whiteSpace: "pre-line",
          }}>
            {error}
          </div>
        )}

        {file && !error && (
          <button
            onClick={handleUpload}
            style={{
              marginTop: 20, width: "100%", padding: "14px 22px", borderRadius: 10,
              background: "#6366f1", color: "#fff",
              border: "1px solid oklch(0.55 0.16 268)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 18px -8px #6366f1",
              fontSize: 15, fontWeight: 500, fontFamily: "var(--font-inter)",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            Upload & Process
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* What happens next */}
        <div style={{ marginTop: 32 }}>
          <div style={{
            fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "var(--color-mm-text4)",
            letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 14,
          }}>
            What happens next
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { n: "01", title: "Transcribe", body: "Speech-to-text with smart formatting via Deepgram." },
              { n: "02", title: "Extract", body: "AI pulls decisions, action items, and a summary." },
              { n: "03", title: "Chat", body: "Ask the meeting anything — answers cite the transcript." },
            ].map(({ n, title, body }) => (
              <div key={n} style={{
                padding: "18px 20px", background: "var(--color-mm-surface)",
                border: "1px solid var(--color-mm-border)", borderRadius: 12,
                display: "flex", gap: 16,
              }}>
                <span style={{ fontSize: 22, color: "var(--color-mm-text4)", fontWeight: 500, letterSpacing: "-0.02em", fontFamily: "var(--font-jetbrains-mono)", flexShrink: 0 }}>
                  {n}
                </span>
                <div>
                  <div style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 600, fontSize: 15, color: "var(--color-mm-text)", marginBottom: 4 }}>
                    {title}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--color-mm-text2)", lineHeight: 1.5 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
