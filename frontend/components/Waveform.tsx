"use client";

import { useMemo } from "react";

function seedRand(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function waveformHeights(seed: string, n: number): number[] {
  const rand = seedRand(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.sin(Math.PI * t) * 0.6 + 0.4;
    const wobble =
      Math.sin(t * 14 + rand() * 6) * 0.2 + Math.sin(t * 31) * 0.15;
    const noise = (rand() - 0.5) * 0.6;
    out.push(Math.max(0.08, Math.min(1, env + wobble + noise * 0.7)));
  }
  return out;
}

interface WaveformProps {
  seed: string;
  bars?: number;
  height?: number;
  color?: string;
  accent?: string;
  progress?: number;
  gap?: number;
  barWidth?: number;
  style?: React.CSSProperties;
}

export function Waveform({
  seed,
  bars = 48,
  height = 40,
  color = "oklch(0.58 0.008 280)",
  accent = "#6366f1",
  progress = 0,
  gap = 2,
  barWidth = 2,
  style,
}: WaveformProps) {
  const heights = useMemo(() => waveformHeights(seed, bars), [seed, bars]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: `${gap}px`,
        height,
        width: "100%",
        ...style,
      }}
    >
      {heights.map((h, i) => {
        const active = i / bars < progress;
        return (
          <div
            key={i}
            style={{
              width: barWidth,
              flex: "1 1 0",
              minWidth: 0,
              height: `${h * 100}%`,
              background: active ? accent : color,
              opacity: active ? 1 : 0.55,
              borderRadius: barWidth,
            }}
          />
        );
      })}
    </div>
  );
}

interface LiveWaveformProps {
  bars?: number;
  height?: number;
  color?: string;
  gap?: number;
  style?: React.CSSProperties;
}

export function LiveWaveform({
  bars = 32,
  height = 40,
  color = "#6366f1",
  gap = 3,
  style,
}: LiveWaveformProps) {
  const offsets = useMemo(
    () => Array.from({ length: bars }, (_, i) => (i * 0.17) % 1.5),
    [bars]
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: `${gap}px`,
        height,
        width: "100%",
        ...style,
      }}
    >
      {offsets.map((o, i) => (
        <div
          key={i}
          style={{
            width: 3,
            flex: "1 1 0",
            height: "100%",
            background: color,
            borderRadius: 2,
            transformOrigin: "center",
            animation: `mm-bar 1.${(i * 7) % 9}s ease-in-out ${o}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
