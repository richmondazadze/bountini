"use client";
import { useEffect, useRef, type ReactNode } from "react";

type AudioSource = {
  getInputVolume: () => number;
  getOutputVolume: () => number;
};
export function VoiceStage({
  state,
  getAudio,
  children,
}: {
  state:
    | "idle"
    | "connecting"
    | "listening"
    | "speaking"
    | "muted"
    | "preparing"
    | "ready"
    | "failure";
  getAudio: () => AudioSource | null;
  children: ReactNode;
}) {
  const visual = useRef<HTMLDivElement>(null);
  const source = useRef(getAudio);
  source.current = getAudio;
  useEffect(() => {
    const node = visual.current;
    if (!node) return;
    node.style.setProperty("--voice-level", "0");
    if (state !== "listening" && state !== "speaking") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let level = 0;
    const timer = window.setInterval(() => {
      if (reduced.matches) {
        node.style.setProperty("--voice-level", "0");
        return;
      }
      const audio = source.current();
      const raw =
        state === "speaking"
          ? audio?.getOutputVolume?.()
          : audio?.getInputVolume?.();
      const target =
        typeof raw === "number" && Number.isFinite(raw)
          ? Math.min(1, Math.max(0, raw) * 3)
          : 0;
      level += (target - level) * 0.4;
      node.style.setProperty("--voice-level", level.toFixed(3));
    }, 60);
    return () => {
      window.clearInterval(timer);
      node.style.setProperty("--voice-level", "0");
    };
  }, [state]);
  const labels = {
    idle: "Ready when you are",
    connecting: "Connecting…",
    listening: "Listening to you",
    speaking: "Bountini is speaking",
    muted: "Microphone muted",
    preparing: "Preparing your draft…",
    ready: "Ready to review",
    failure: "Connection or drafting needs attention",
  };
  return (
    <div className="voice-stage" data-state={state}>
      <span className="voice-eyebrow">YOUR BRIEF, IN YOUR WORDS</span>
      <div ref={visual} className="voice-visual" aria-hidden="true">
        <div className="voice-halo" />
        <div className="voice-mic">
          <div className="voice-mic-head">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="voice-mic-yoke" />
          <div className="voice-mic-stem" />
          <div className="voice-mic-base" />
        </div>
        <div className="voice-wave">
          {[0, 1, 2, 3, 4, 3, 2, 1, 0].map((height, index) => (
            <i key={index} style={{ height: `${8 + height * 5}px` }} />
          ))}
        </div>
      </div>
      <strong className="voice-state" role="status">
        {labels[state]}
      </strong>
      <p className="helper">
        {state === "idle"
          ? "Talk through your task with Bountini, or type it alongside."
          : state === "muted"
            ? "Unmute when you’re ready to continue."
            : state === "speaking"
              ? "You can speak to interrupt and add a detail."
              : state === "listening"
                ? "Tell Bountini what you need and what success looks like."
                : "Your conversation stays here for you to review."}
      </p>
      <div className="actions voice-controls">{children}</div>
    </div>
  );
}

export function transcriptMessages(text: string) {
  const messages: { role: "user" | "agent"; content: string }[] = [];
  for (const line of text.split("\n")) {
    const match = /^(You|Bountini):\s?(.*)$/.exec(line);
    if (match)
      messages.push({
        role: match[1] === "You" ? "user" : "agent",
        content: match[2],
      });
    else if (messages.length)
      messages[messages.length - 1].content += `\n${line}`;
    else if (line.trim()) messages.push({ role: "user", content: line });
  }
  return messages;
}
