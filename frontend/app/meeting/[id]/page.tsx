"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getMeeting, getMessages, sendChatMessage, updateMeetingTitle, deleteMeeting,
  type Meeting, type Message,
} from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { Mark } from "@/components/Mark";

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function SectionLabel({ n, label, count }: { n: string; label: string; count?: string | number }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline", gap: 14, marginBottom: 16,
      paddingBottom: 12, borderBottom: "1px solid var(--color-mm-border)",
    }}>
      <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 12, color: "#6366f1", fontWeight: 500, letterSpacing: "0.04em" }}>
        {n}
      </span>
      <span style={{
        fontFamily: "var(--font-space-grotesk)", fontSize: 13, fontWeight: 500,
        textTransform: "uppercase" as const, letterSpacing: "0.14em", color: "var(--color-mm-text)",
      }}>
        {label}
      </span>
      {count != null && (
        <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--color-mm-text3)" }}>
          {count}
        </span>
      )}
    </div>
  );
}

function DecisionRow({ n, text }: { n: string; text: string }) {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      <div style={{
        flexShrink: 0, width: 40, height: 40, borderRadius: 8,
        background: "rgba(99,102,241,0.12)", color: "#6366f1",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-jetbrains-mono)", fontSize: 12, fontWeight: 500,
        border: "1px solid rgba(99,102,241,0.25)",
      }}>{n}</div>
      <div style={{ paddingTop: 8, fontSize: 14, lineHeight: 1.55, color: "var(--color-mm-text)", maxWidth: 640 }}>
        {text}
      </div>
    </div>
  );
}

function ActionRow({ owner, task, due }: { owner: string; task: string; due?: string | null }) {
  const ownerInitials = initials(owner);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto",
      gap: 14, alignItems: "center", padding: "12px 14px",
      background: "var(--color-mm-surface)", border: "1px solid var(--color-mm-border)", borderRadius: 10,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: "var(--color-mm-surface2)", border: "1px solid var(--color-mm-border-hi)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "var(--color-mm-text)", fontWeight: 600,
      }}>{ownerInitials}</div>
      <div style={{ fontSize: 14, color: "var(--color-mm-text)", lineHeight: 1.45 }}>
        <span style={{ color: "var(--color-mm-text3)" }}>{owner} · </span>{task}
      </div>
      {due && (
        <span style={{
          fontFamily: "var(--font-jetbrains-mono)", fontSize: 11,
          color: "var(--color-mm-text3)", padding: "3px 8px", borderRadius: 5,
          border: "1px solid var(--color-mm-border)",
        }}>{due}</span>
      )}
    </div>
  );
}

// ── Chat components ───────────────────────────────────────────────────────────

function AiMessage({ text }: { text: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 12 }}>
      <div style={{ paddingTop: 4 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7l3-7z" />
        </svg>
      </div>
      <div style={{
        fontSize: 14, lineHeight: 1.6, color: "var(--color-mm-text)",
        paddingLeft: 14, borderLeft: "1.5px solid oklch(0.55 0.16 268)",
      }}>
        {text}
      </div>
    </div>
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{
        maxWidth: "80%", background: "#6366f1", color: "#fff",
        padding: "10px 14px", borderRadius: 14, borderTopRightRadius: 4,
        fontSize: 14, lineHeight: 1.55,
        boxShadow: "0 1px 0 rgba(255,255,255,0.15) inset, 0 4px 14px -6px #6366f1",
      }}>
        {text}
      </div>
    </div>
  );
}

function AiTyping() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 12 }}>
      <div style={{ paddingTop: 4 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7l3-7z" />
        </svg>
      </div>
      <div style={{
        paddingLeft: 14, borderLeft: "1.5px solid oklch(0.55 0.16 268)",
        display: "flex", alignItems: "center", gap: 6, paddingTop: 4,
      }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: "50%", background: "#6366f1",
            animation: "mm-typing 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
            display: "inline-block",
          }} />
        ))}
      </div>
    </div>
  );
}

function QuickChip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <span
      onClick={onClick}
      style={{
        padding: "5px 10px", borderRadius: 999,
        border: "1px solid var(--color-mm-border)", background: "var(--color-mm-surface)",
        fontSize: 12, color: "var(--color-mm-text2)", cursor: "pointer",
        whiteSpace: "nowrap" as const,
        fontFamily: "var(--font-inter)",
      }}
    >
      {children}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MeetingPage() {
  const router = useRouter();
  const params = useParams();
  const meetingId = params.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"summary" | "transcript">("summary");

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoggedIn()) router.replace("/");
  }, [router]);

  useEffect(() => {
    async function load() {
      try {
        const [m, msgs] = await Promise.all([getMeeting(meetingId), getMessages(meetingId)]);
        setMeeting(m);
        setTitleValue(m.title);
        setMessages(msgs);
      } catch {
        router.replace("/dashboard");
      } finally {
        setPageLoading(false);
      }
    }
    load();
  }, [meetingId, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  async function saveTitle() {
    if (!meeting || titleValue.trim() === meeting.title) { setEditingTitle(false); return; }
    const updated = await updateMeetingTitle(meeting.id, titleValue.trim());
    setMeeting(updated);
    setEditingTitle(false);
  }

  async function handleDelete() {
    if (!meeting || !confirm("Delete this meeting? This cannot be undone.")) return;
    await deleteMeeting(meeting.id);
    router.replace("/dashboard");
  }

  async function handleSend(text?: string) {
    const q = (text ?? question).trim();
    if (!q || chatLoading) return;
    setQuestion("");
    setChatLoading(true);

    const optimisticMsg: Message = {
      id: "temp-" + Date.now(), meeting_id: meetingId,
      role: "user", content: q, created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await sendChatMessage(meetingId, q);
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== optimisticMsg.id);
        return [...without, { ...optimisticMsg, id: "u-" + Date.now() }, res.message];
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setChatLoading(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--color-mm-bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--color-mm-text3)" }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            border: "2px solid #6366f1", borderTopColor: "transparent",
            animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: 14, fontFamily: "var(--font-inter)" }}>Loading meeting...</span>
        </div>
      </div>
    );
  }

  if (!meeting) return null;

  const completedHeight = "calc(100vh - 64px)";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--color-mm-bg)", color: "var(--color-mm-text)", fontFamily: "var(--font-inter), sans-serif", overflow: "hidden" }}>
      {/* ── Header ── */}
      <header style={{
        height: 64, display: "flex", alignItems: "center", flexShrink: 0,
        padding: "0 24px", borderBottom: "1px solid var(--color-mm-border)",
        background: "rgba(28,28,32,0.6)", backdropFilter: "blur(20px)",
      }}>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            width: 32, height: 32, borderRadius: 8, border: "1px solid var(--color-mm-border)",
            background: "var(--color-mm-surface)", color: "var(--color-mm-text2)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", marginRight: 14, flexShrink: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <Mark size={20} />
        <span style={{ width: 1, height: 22, background: "var(--color-mm-border)", margin: "0 18px", flexShrink: 0 }} />

        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flex: 1, minWidth: 0 }}>
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              style={{
                fontFamily: "var(--font-space-grotesk)", fontWeight: 500, fontSize: 17,
                letterSpacing: "-0.015em", color: "var(--color-mm-text)",
                background: "transparent", border: "none", borderBottom: "1.5px solid #6366f1",
                outline: "none", flex: 1, minWidth: 0,
              }}
            />
          ) : (
            <h1
              onClick={() => setEditingTitle(true)}
              style={{
                fontFamily: "var(--font-space-grotesk)", fontWeight: 500, fontSize: 17,
                letterSpacing: "-0.015em", color: "var(--color-mm-text)", margin: 0,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              }}
              title="Click to edit title"
            >
              {meeting.title}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-mm-text4)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </h1>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--color-mm-text3)", flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-mm-text4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {new Date(meeting.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>

        <button
          onClick={handleDelete}
          style={{
            width: 32, height: 32, borderRadius: 8, border: "none",
            background: "transparent", color: "var(--color-mm-text3)", cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginLeft: 8,
          }}
          title="Delete meeting"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
        </button>
      </header>

      {/* ── 2-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 460px", height: completedHeight, overflow: "hidden" }}>

        {/* ── LEFT: tabs ── */}
        <div style={{
          padding: "32px 40px 0", borderRight: "1px solid var(--color-mm-border)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Tab bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 28, flexShrink: 0 }}>
            {(["summary", "transcript"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "8px 14px", borderRadius: 9,
                  background: activeTab === tab ? "var(--color-mm-surface2)" : "transparent",
                  border: `1px solid ${activeTab === tab ? "var(--color-mm-border-hi)" : "transparent"}`,
                  color: activeTab === tab ? "var(--color-mm-text)" : "var(--color-mm-text3)",
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                  boxShadow: activeTab === tab ? "0 1px 0 var(--color-mm-border-hi) inset" : "none",
                  fontFamily: "var(--font-inter)",
                }}
              >
                {tab === "summary" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={activeTab === tab ? "#6366f1" : "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7l3-7z" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={activeTab === tab ? "#6366f1" : "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                )}
                {tab === "summary" ? "Summary" : "Transcript"}
                {tab === "summary" && meeting.decisions && (
                  <span style={{
                    fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--color-mm-text3)",
                    padding: "1px 6px", borderRadius: 4,
                    background: activeTab === tab ? "var(--color-mm-bg)" : "transparent",
                    border: activeTab === tab ? "1px solid var(--color-mm-border)" : "1px solid transparent",
                  }}>
                    {meeting.decisions.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Summary tab ── */}
          {activeTab === "summary" && (
            <div style={{ overflowY: "auto", paddingRight: 8, paddingBottom: 40, flex: 1 }}>
              {meeting.status !== "completed" ? (
                <div style={{
                  padding: "20px 24px", background: "var(--color-mm-surface)",
                  border: "1px solid var(--color-mm-border)", borderRadius: 12,
                  fontSize: 14, color: "var(--color-mm-text3)",
                }}>
                  {meeting.status === "processing"
                    ? "This meeting is still being processed..."
                    : `Processing failed: ${meeting.error_message}`}
                </div>
              ) : (
                <>
                  {/* TL;DR + summary */}
                  {(meeting.tldr || meeting.summary) && (
                    <div style={{ marginBottom: 40 }}>
                      <SectionLabel n="01" label="Summary" />
                      {meeting.tldr && (
                        <div style={{
                          fontFamily: "var(--font-space-grotesk)", fontWeight: 500, fontSize: 20,
                          letterSpacing: "-0.018em", lineHeight: 1.4, color: "var(--color-mm-text)",
                          marginBottom: 16, maxWidth: 720,
                        }}>
                          {meeting.tldr}
                        </div>
                      )}
                      {meeting.summary && (
                        <div style={{ fontSize: 14, lineHeight: 1.65, color: "var(--color-mm-text2)", maxWidth: 720 }}>
                          {meeting.summary}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Topics */}
                  {meeting.topics && meeting.topics.length > 0 && (
                    <div style={{ marginBottom: 32, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {meeting.topics.map((topic, i) => (
                        <span key={i} style={{
                          fontSize: 12, padding: "4px 10px", borderRadius: 999,
                          background: "var(--color-mm-surface)", border: "1px solid var(--color-mm-border)",
                          color: "var(--color-mm-text3)", fontFamily: "var(--font-inter)",
                        }}>
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Decisions */}
                  {meeting.decisions && meeting.decisions.length > 0 && (
                    <div style={{ marginBottom: 40 }}>
                      <SectionLabel n="02" label="Key decisions" count={meeting.decisions.length} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {meeting.decisions.map((d, i) => (
                          <DecisionRow key={i} n={(i + 1).toString().padStart(2, "0")} text={d} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action items */}
                  {meeting.action_items && meeting.action_items.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <SectionLabel n="03" label="Action items" count={meeting.action_items.length} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {meeting.action_items.map((a, i) => (
                          <ActionRow key={i} owner={a.owner} task={a.task} due={a.due} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Transcript tab ── */}
          {activeTab === "transcript" && (
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {meeting.transcript ? (
                <div style={{ overflowY: "auto", paddingRight: 8, paddingBottom: 40, flex: 1 }}>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-mm-text2)", whiteSpace: "pre-wrap" }}>
                    {meeting.transcript}
                  </p>
                </div>
              ) : (
                <div style={{ padding: "20px 24px", background: "var(--color-mm-surface)", border: "1px solid var(--color-mm-border)", borderRadius: 12, fontSize: 14, color: "var(--color-mm-text3)" }}>
                  No transcript available yet.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: persistent chat rail ── */}
        <div style={{
          display: "flex", flexDirection: "column", height: "100%",
          background: "var(--color-mm-bg)", position: "relative", overflow: "hidden",
        }}>
          {/* Rail header */}
          <div style={{
            padding: "20px 24px", borderBottom: "1px solid var(--color-mm-border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 28, height: 28, borderRadius: 7, background: "rgba(99,102,241,0.12)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: "#6366f1", border: "1px solid rgba(99,102,241,0.25)",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7l3-7z" />
                </svg>
              </span>
              <div>
                <div style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 500, fontSize: 14, color: "var(--color-mm-text)" }}>
                  Ask this meeting
                </div>
                <div style={{ fontSize: 11, color: "var(--color-mm-text3)", marginTop: 2 }}>
                  Answers cite the transcript.
                </div>
              </div>
            </div>
            {messages.length > 0 && (
              <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "var(--color-mm-text3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {messages.length} turn{messages.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "24px 24px 16px",
            display: "flex", flexDirection: "column", gap: 22,
          }}>
            {messages.length === 0 && !chatLoading && meeting.status === "completed" && (
              <div style={{ textAlign: "center", paddingTop: 40 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "var(--color-mm-surface)", border: "1px solid var(--color-mm-border)",
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px",
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7l3-7z" />
                  </svg>
                </div>
                <p style={{ fontSize: 13, color: "var(--color-mm-text3)", fontFamily: "var(--font-inter)" }}>
                  Ask anything about this meeting
                </p>
              </div>
            )}
            {meeting.status !== "completed" && (
              <div style={{ textAlign: "center", paddingTop: 40 }}>
                <p style={{ fontSize: 13, color: "var(--color-mm-text3)", fontFamily: "var(--font-inter)" }}>
                  Chat is available once the meeting is processed.
                </p>
              </div>
            )}
            {messages.map((msg) =>
              msg.role === "user"
                ? <UserMessage key={msg.id} text={msg.content} />
                : <AiMessage key={msg.id} text={msg.content} />
            )}
            {chatLoading && <AiTyping />}
            <div ref={chatEndRef} />
          </div>

          {/* Composer */}
          {meeting.status === "completed" && (
            <div style={{
              padding: "12px 16px 16px", borderTop: "1px solid var(--color-mm-border)",
              background: "var(--color-mm-bg)", flexShrink: 0,
            }}>
              {/* Quick prompts */}
              <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                <QuickChip onClick={() => handleSend("What were the key decisions?")}>
                  What were the decisions?
                </QuickChip>
                <QuickChip onClick={() => handleSend("Who owns what action items?")}>
                  Who owns what?
                </QuickChip>
                <QuickChip onClick={() => handleSend("What risks were raised?")}>
                  Risks raised?
                </QuickChip>
              </div>

              {/* Input box */}
              <div style={{
                background: "var(--color-mm-surface)", border: "1px solid var(--color-mm-border-hi)",
                borderRadius: 12, padding: "12px 14px",
                display: "flex", alignItems: "flex-end", gap: 10,
                boxShadow: "0 0 0 4px rgba(99,102,241,0.06)",
              }}>
                <textarea
                  ref={textareaRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask anything about this meeting…"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  style={{
                    flex: 1, background: "transparent", border: "none", outline: "none",
                    fontSize: 14, color: "var(--color-mm-text)", lineHeight: 1.5, minHeight: 22,
                    resize: "none", fontFamily: "var(--font-inter)",
                    maxHeight: 120, overflowY: "auto",
                  }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!question.trim() || chatLoading}
                  style={{
                    width: 34, height: 34, borderRadius: 8,
                    border: "1px solid oklch(0.55 0.16 268)",
                    background: !question.trim() || chatLoading ? "var(--color-mm-surface2)" : "#6366f1",
                    color: "#fff", cursor: !question.trim() || chatLoading ? "not-allowed" : "pointer",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, opacity: !question.trim() || chatLoading ? 0.5 : 1,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
              <div style={{
                marginTop: 10, fontSize: 11, color: "var(--color-mm-text4)", textAlign: "center",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontFamily: "var(--font-inter)",
              }}>
                <span style={{ fontFamily: "var(--font-jetbrains-mono)" }}>↵</span> to send
                <span>·</span>
                <span style={{ fontFamily: "var(--font-jetbrains-mono)" }}>⇧↵</span> for newline
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
