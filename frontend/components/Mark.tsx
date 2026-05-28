interface MarkProps {
  size?: number;
  accent?: string;
  base?: string;
  className?: string;
}

export function Mark({
  size = 32,
  accent = "#6366f1",
  base = "oklch(0.975 0.005 280)",
  className,
}: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      style={{ display: "block", flexShrink: 0 }}
      aria-hidden
    >
      <rect x="6"  y="22" width="9" height="20" rx="2" fill={base} opacity="0.55" />
      <rect x="19" y="14" width="9" height="36" rx="2" fill={base} opacity="0.85" />
      <rect x="32" y="8"  width="9" height="48" rx="2" fill={accent} />
      <rect x="45" y="20" width="9" height="24" rx="2" fill={base} opacity="0.7" />
    </svg>
  );
}

interface WordmarkProps {
  size?: number;
}

export function Wordmark({ size = 18 }: WordmarkProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.55,
        fontFamily: "var(--font-space-grotesk), sans-serif",
        fontWeight: 600,
        fontSize: size,
        color: "oklch(0.975 0.005 280)",
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      <Mark size={size * 1.3} />
      <span>MeetingMind</span>
    </div>
  );
}
