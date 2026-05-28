"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { Mark } from "@/components/Mark";
import { Waveform } from "@/components/Waveform";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        await register(username, password);
      }
      const data = await login(username, password);
      setToken(data.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1.15fr 1fr",
      minHeight: "100vh",
      background: "var(--color-mm-bg)",
      color: "var(--color-mm-text)",
      fontFamily: "var(--font-inter), sans-serif",
    }}>
      {/* Left — editorial brand statement */}
      <div style={{
        position: "relative",
        padding: 64,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRight: "1px solid var(--color-mm-border)",
        overflow: "hidden",
      }}>
        {/* Radial glow */}
        <div style={{
          position: "absolute", top: "-15%", left: "-15%", width: 600, height: 600,
          background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0) 60%)",
          pointerEvents: "none",
        }} />
        {/* Watermark mark */}
        <div style={{ position: "absolute", right: -40, bottom: -40, opacity: 0.04, pointerEvents: "none" }}>
          <Mark size={520} base="oklch(0.975 0.005 280)" accent="oklch(0.975 0.005 280)" />
        </div>

        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "var(--font-space-grotesk)", fontWeight: 600, fontSize: 18, letterSpacing: "-0.02em" }}>
            <Mark size={24} />
            <span>MeetingMind</span>
          </div>
        </div>

        {/* Hero */}
        <div style={{ position: "relative", maxWidth: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--color-mm-text3)", letterSpacing: "0.16em", textTransform: "uppercase" }}>
            <span style={{ width: 32, height: 1, background: "#6366f1", display: "inline-block" }} />
            Meeting intelligence
          </div>
          <h1 style={{
            fontFamily: "var(--font-space-grotesk)",
            fontWeight: 600, fontSize: 88,
            lineHeight: 0.95, letterSpacing: "-0.045em",
            color: "var(--color-mm-text)", margin: "0 0 28px",
          }}>
            Record once.<br />
            <span style={{ color: "var(--color-mm-text3)" }}>Understand</span><br />
            <span style={{ display: "inline-flex", alignItems: "baseline", gap: 18 }}>
              <span>everything.</span>
              <Mark size={56} />
            </span>
          </h1>
          <p style={{ fontFamily: "var(--font-inter)", fontSize: 16, color: "var(--color-mm-text2)", lineHeight: 1.55, maxWidth: 480, margin: 0 }}>
            Upload a recording. Get back a transcript, a summary, the decisions, the action items — and a meeting you can talk to.
          </p>
        </div>

        {/* Bottom row */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 11, color: "var(--color-mm-text4)" }}>v2.0</span>
          <div style={{ flex: 1, maxWidth: 360 }}>
            <Waveform seed="login-hero" bars={56} height={28} color="var(--color-mm-text4)" progress={0.62} accent="#6366f1" />
          </div>
          <span style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: "var(--color-mm-text3)" }}>
            Trusted by teams who&apos;d rather build than recap.
          </span>
        </div>
      </div>

      {/* Right — form */}
      <div style={{ padding: 64, display: "flex", flexDirection: "column", justifyContent: "center", background: "var(--color-mm-bg)" }}>
        <div style={{ maxWidth: 380, width: "100%", margin: "0 auto" }}>
          {/* Segmented toggle */}
          <div style={{
            display: "inline-flex", padding: 4, borderRadius: 10,
            background: "var(--color-mm-surface)", border: "1px solid var(--color-mm-border)",
            marginBottom: 36,
          }}>
            {(["signin", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                style={{
                  padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 500,
                  background: mode === m ? "var(--color-mm-surface2)" : "transparent",
                  color: mode === m ? "var(--color-mm-text)" : "var(--color-mm-text3)",
                  border: "none", cursor: "pointer",
                  boxShadow: mode === m ? "0 1px 0 var(--color-mm-border-hi) inset" : "none",
                  fontFamily: "var(--font-inter)",
                }}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <h2 style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 600, fontSize: 32, letterSpacing: "-0.025em", color: "var(--color-mm-text)", margin: "0 0 8px" }}>
            {mode === "signin" ? "Welcome back." : "Create an account."}
          </h2>
          <p style={{ fontSize: 14, color: "var(--color-mm-text3)", margin: "0 0 36px", fontFamily: "var(--font-inter)" }}>
            {mode === "signin" ? "Pick up where your last meeting left off." : "Start capturing your meeting intelligence."}
          </p>

          <form onSubmit={handleSubmit}>
            {/* Username field */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "var(--color-mm-text3)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
                Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "var(--color-mm-surface)", border: "1px solid var(--color-mm-border)",
                  borderRadius: 9, padding: "12px 14px", fontSize: 14,
                  color: "var(--color-mm-text)", fontFamily: "var(--font-inter)",
                  outline: "none",
                }}
                onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                onBlur={(e) => e.target.style.borderColor = "var(--color-mm-border)"}
              />
            </div>

            {/* Password field */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "var(--color-mm-text3)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "var(--color-mm-surface)", border: "1px solid var(--color-mm-border)",
                  borderRadius: 9, padding: "12px 14px", fontSize: 14,
                  color: "var(--color-mm-text)", fontFamily: "var(--font-inter)",
                  outline: "none",
                }}
                onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                onBlur={(e) => e.target.style.borderColor = "var(--color-mm-border)"}
              />
            </div>

            {error && (
              <div style={{
                marginBottom: 16, padding: "10px 14px", borderRadius: 8,
                background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)",
                fontSize: 13, color: "var(--color-mm-red)", fontFamily: "var(--font-inter)",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "14px 22px", borderRadius: 10,
                background: "#6366f1", color: "#fff",
                border: "1px solid oklch(0.55 0.16 268)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 18px -8px #6366f1",
                fontSize: 15, fontWeight: 500, fontFamily: "var(--font-inter)",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                marginTop: 12,
              }}
            >
              {loading ? "Please wait..." : "Continue"}
              {!loading && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </form>

          <div style={{
            marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--color-mm-border)",
            fontSize: 12, color: "var(--color-mm-text3)", textAlign: "center", lineHeight: 1.6,
            fontFamily: "var(--font-inter)",
          }}>
            {mode === "signin" ? (
              <>
                New here?{" "}
                <button onClick={() => { setMode("register"); setError(""); }} style={{ color: "var(--color-mm-text)", fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 3, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-inter)", fontSize: 12 }}>
                  Create an account
                </button>
                <br />Free for your first 10 meetings.
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => { setMode("signin"); setError(""); }} style={{ color: "var(--color-mm-text)", fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 3, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-inter)", fontSize: 12 }}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
