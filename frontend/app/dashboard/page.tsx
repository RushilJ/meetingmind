"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMeetings, deleteMeeting, retryMeeting, type Meeting } from "@/lib/api";
import { isLoggedIn, clearToken } from "@/lib/auth";
import { Mark } from "@/components/Mark";
import { Waveform, LiveWaveform } from "@/components/Waveform";

type Filter = "all" | "completed" | "processing" | "failed";

export default function DashboardPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) router.replace("/");
  }, [router]);

  const fetchMeetings = useCallback(async (query: string) => {
    try {
      const data = await getMeetings(query || undefined);
      setMeetings(data);
    } catch {
      clearToken();
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => fetchMeetings(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchMeetings]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this meeting?")) return;
    await deleteMeeting(id);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleRetry(id: string) {
    const updated = await retryMeeting(id);
    setMeetings((prev) => prev.map((m) => (m.id === id ? updated : m)));
  }

  function handleLogout() {
    clearToken();
    router.replace("/");
  }

  const filtered = meetings.filter((m) => {
    if (filter === "all") return true;
    if (filter === "completed") return m.status === "completed";
    if (filter === "processing") return m.status === "processing";
    if (filter === "failed") return m.status === "failed";
    return true;
  });

  // Compute stats
  const processedCount = meetings.filter((m) => m.status === "completed").length;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-mm-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 20, height: 20, border: "2px solid #6366f1", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontFamily: "var(--font-inter)", fontSize: 14, color: "var(--color-mm-text3)" }}>Loading meetings…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-mm-bg)", color: "var(--color-mm-text)", fontFamily: "var(--font-inter)" }}>
      {/* Top bar */}
      <header style={{
        height: 64, display: "flex", alignItems: "center",
        padding: "0 32px", borderBottom: "1px solid var(--color-mm-border)",
        background: "rgba(28,28,32,0.6)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        {/* Left: wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto", minWidth: 280 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, fontFamily: "var(--font-space-grotesk)", fontWeight: 600, fontSize: 16, letterSpacing: "-0.02em", color: "var(--color-mm-text)" }}>
            <Mark size={22} />
            <span>MeetingMind</span>
          </div>
        </div>

        {/* Center: search */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "0 32px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 480,
            padding: "8px 14px", background: "var(--color-mm-surface)",
            border: "1px solid var(--color-mm-border)", borderRadius: 10,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-mm-text3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, decision, person…"
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: 13, color: "var(--color-mm-text)", fontFamily: "var(--font-inter)",
              }}
            />
          </div>
        </div>

        {/* Right: actions */}
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 10, minWidth: 280, justifyContent: "flex-end" }}>
          <button onClick={handleLogout} style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px",
            borderRadius: 8, background: "transparent", border: "1px solid transparent",
            color: "var(--color-mm-text2)", fontSize: 13, fontWeight: 500, cursor: "pointer",
            fontFamily: "var(--font-inter)",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3h5v18h-5"/><path d="M10 17l-5-5 5-5M5 12h11"/>
            </svg>
            Log out
          </button>
          <button onClick={() => router.push("/upload")} style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px",
            borderRadius: 8, background: "#6366f1", border: "1px solid oklch(0.55 0.16 268)",
            color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer",
            fontFamily: "var(--font-inter)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 12px -6px #6366f1",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Upload meeting
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ padding: "40px 56px 0" }}>
        {meetings.length === 0 && search.trim() ? (
          /* Search no-results state */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 180px)" }}>
            <div style={{ textAlign: "center", maxWidth: 420 }}>
              <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "var(--color-mm-text4)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 12 }}>
                No results
              </div>
              <h2 style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 600, fontSize: 28, letterSpacing: "-0.02em", color: "var(--color-mm-text)", margin: "0 0 10px" }}>
                Nothing found for &ldquo;{search}&rdquo;
              </h2>
              <p style={{ fontSize: 14, color: "var(--color-mm-text3)", lineHeight: 1.6, margin: 0 }}>
                Try a different keyword, or check if the meeting was uploaded under a different title.
              </p>
            </div>
          </div>
        ) : meetings.length === 0 ? (
          /* Empty state */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 180px)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 45%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 50%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", textAlign: "center", maxWidth: 540 }}>
              <div style={{ display: "inline-flex", marginBottom: 32 }}>
                <Mark size={72} />
              </div>
              <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--color-mm-text3)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 14 }}>
                Your library is quiet
              </div>
              <h1 style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 600, fontSize: 56, letterSpacing: "-0.035em", color: "var(--color-mm-text)", margin: "0 0 18px", lineHeight: 1 }}>
                Let&apos;s hear something.
              </h1>
              <p style={{ fontSize: 15, color: "var(--color-mm-text2)", lineHeight: 1.6, margin: "0 0 32px" }}>
                Upload your first meeting recording. MeetingMind will transcribe it, extract the decisions, and let you chat with it.
              </p>
              <button onClick={() => router.push("/upload")} style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 22px",
                borderRadius: 10, background: "#6366f1", color: "#fff",
                border: "1px solid oklch(0.55 0.16 268)", fontSize: 15, fontWeight: 500,
                cursor: "pointer", fontFamily: "var(--font-inter)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 18px -8px #6366f1",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/>
                </svg>
                Upload your first meeting
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7"/>
                </svg>
              </button>
              <div style={{ marginTop: 28, fontSize: 12, color: "var(--color-mm-text4)", fontFamily: "var(--font-jetbrains-mono)", letterSpacing: "0.05em" }}>
                MP3 · MP4 · WAV · M4A · AAC · FLAC · OGG · MOV · MKV · WEBM
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Heading */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--color-mm-text3)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 10 }}>
                Library · {processedCount} of {meetings.length} processed
              </div>
              <h1 style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 600, fontSize: 56, letterSpacing: "-0.035em", color: "var(--color-mm-text)", margin: 0, lineHeight: 1 }}>
                Your meetings.
              </h1>
            </div>

            {/* Filter chips */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              {([
                ["all", "All", meetings.length],
                ["completed", "Processed", meetings.filter(m => m.status === "completed").length],
                ["processing", "Processing", meetings.filter(m => m.status === "processing").length],
                ["failed", "Failed", meetings.filter(m => m.status === "failed").length],
              ] as [Filter, string, number][]).map(([f, label, count]) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "6px 12px", borderRadius: 999,
                    background: filter === f ? "var(--color-mm-surface2)" : "transparent",
                    border: `1px solid ${filter === f ? "var(--color-mm-border-hi)" : "var(--color-mm-border)"}`,
                    fontSize: 13, color: filter === f ? "var(--color-mm-text)" : "var(--color-mm-text2)",
                    cursor: "pointer", fontFamily: "var(--font-inter)",
                  }}
                >
                  {label}
                  <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--color-mm-text3)" }}>{count}</span>
                </button>
              ))}
            </div>

            {/* Meeting list */}
            <div style={{ background: "var(--color-mm-surface)", border: "1px solid var(--color-mm-border)", borderRadius: 14, overflow: "hidden", marginBottom: 48 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: "48px 28px", textAlign: "center" }}>
                  {search.trim() ? (
                    <>
                      <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "var(--color-mm-text4)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 10 }}>
                        No results
                      </div>
                      <div style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 600, fontSize: 20, color: "var(--color-mm-text)", marginBottom: 8 }}>
                        Nothing found for &ldquo;{search}&rdquo;
                      </div>
                      <div style={{ fontSize: 13, color: "var(--color-mm-text3)" }}>
                        Try a different keyword, or check if the meeting was uploaded under a different title.
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 14, color: "var(--color-mm-text3)" }}>
                      No meetings match this filter.
                    </div>
                  )}
                </div>
              ) : (
                filtered.map((m, i) => (
                  <MeetingRow
                    key={m.id}
                    meeting={m}
                    hovered={hoveredId === m.id}
                    last={i === filtered.length - 1}
                    onHover={() => setHoveredId(m.id)}
                    onLeave={() => setHoveredId(null)}
                    onDelete={() => handleDelete(m.id)}
                    onRetry={() => handleRetry(m.id)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


function MeetingRow({ meeting: m, hovered, last, onHover, onLeave, onDelete, onRetry }: {
  meeting: Meeting;
  hovered: boolean;
  last: boolean;
  onHover: () => void;
  onLeave: () => void;
  onDelete: () => void;
  onRetry: () => void;
}) {
  const statusColor = m.status === "completed" ? "#6366f1" : m.status === "processing" ? "#facc15" : "#f87171";

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        display: "grid",
        gridTemplateColumns: "28px 1.6fr 220px 1fr auto",
        gap: 28, alignItems: "center",
        padding: "22px 28px",
        borderBottom: last ? "none" : "1px solid var(--color-mm-border)",
        background: hovered ? "var(--color-mm-surface2)" : "transparent",
        transition: "background 120ms ease",
        position: "relative",
      }}
    >
      {/* Status dot */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        {m.status === "processing" ? (
          <span style={{ position: "relative", display: "inline-block", width: 8, height: 8 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: statusColor }} />
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: statusColor, animation: "mm-pulse-ring 1.8s ease-out infinite" }} />
          </span>
        ) : (
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, display: "inline-block", opacity: 0.85 }} />
        )}
      </div>

      {/* Title + meta + snippet */}
      <Link href={`/meeting/${m.id}`} style={{ textDecoration: "none", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h3 style={{
            fontFamily: "var(--font-space-grotesk)", fontWeight: 500, fontSize: 18,
            letterSpacing: "-0.018em", color: "var(--color-mm-text)", margin: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{m.title}</h3>
          {m.status === "processing" && (
            <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.3)", color: "#facc15", fontSize: 11, fontWeight: 500, letterSpacing: "0.02em", textTransform: "uppercase" }}>Processing</span>
          )}
          {m.status === "failed" && (
            <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: 11, fontWeight: 500, letterSpacing: "0.02em", textTransform: "uppercase" }}>Failed</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--color-mm-text3)" }}>
            {new Date(m.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
          </span>
          {m.status === "completed" && (
            <>
              <span style={{ color: "var(--color-mm-text4)" }}>·</span>
              <span style={{ fontSize: 11, color: "var(--color-mm-text3)", fontFamily: "var(--font-inter)" }}>
                <span style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--color-mm-text2)" }}>{m.decisions?.length || 0}</span> decisions
                <span style={{ margin: "0 6px", color: "var(--color-mm-text4)" }}>·</span>
                <span style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--color-mm-text2)" }}>{m.action_items?.length || 0}</span> actions
              </span>
            </>
          )}
        </div>
        <div style={{
          fontSize: 13, color: m.status === "failed" ? "#f87171" : "var(--color-mm-text2)",
          lineHeight: 1.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 600,
        }}>
          {m.tldr || m.summary || m.error_message || ""}
        </div>
      </Link>

      {/* Waveform fingerprint */}
      <div style={{ width: 220, height: 36 }}>
        {m.status === "processing" ? (
          <LiveWaveform bars={28} height={36} color="#facc15" />
        ) : m.status === "failed" ? (
          <Waveform seed={m.id} bars={48} height={36} color="var(--color-mm-text4)" accent="var(--color-mm-text4)" />
        ) : (
          <Waveform seed={m.id} bars={48} height={36} color="var(--color-mm-text3)" accent="#6366f1" progress={hovered ? 0.55 : 0} />
        )}
      </div>

      {/* Tags / chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {m.status === "processing" && (
          <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--color-mm-text2)" }}>
            Transcribing…
          </span>
        )}
        {m.status === "failed" && (
          <button onClick={onRetry} style={{ padding: "7px 12px", borderRadius: 8, background: "var(--color-mm-surface2)", border: "1px solid var(--color-mm-border)", color: "var(--color-mm-text2)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-inter)" }}>
            Retry upload
          </button>
        )}
        {m.status === "completed" && (
          <>
            <ChipTag>summary</ChipTag>
            <ChipTag>{m.action_items?.length || 0} actions</ChipTag>
            <ChipTag>chat ready</ChipTag>
          </>
        )}
      </div>

      {/* Hover actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, opacity: hovered ? 1 : 0.4, transition: "opacity 120ms ease" }}>
        <button
          onClick={onDelete}
          style={{
            width: 32, height: 32, borderRadius: 8, border: "none",
            background: "transparent", color: "var(--color-mm-text3)", cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
          title="Delete"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function ChipTag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "var(--color-mm-text3)",
      letterSpacing: "0.06em", textTransform: "uppercase",
      padding: "3px 7px", border: "1px solid var(--color-mm-border)",
      borderRadius: 5, background: "var(--color-mm-bg)",
    }}>
      {children}
    </span>
  );
}
