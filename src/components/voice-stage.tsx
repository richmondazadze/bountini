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
    const halo = node.querySelector<HTMLElement>(".voice-halo");
    const mic = node.querySelector<HTMLElement>(".voice-mic");
    const bars = Array.from(
      node.querySelectorAll<HTMLElement>(".voice-wave i"),
    );
    // Write only to the animated nodes; no inherited variable or React render per sample.
    const draw = (level: number) => {
      if (halo) {
        halo.style.transform = `scale(${1 + level * 0.22})`;
        halo.style.opacity = String(0.5 + level * 0.5);
      }
      if (mic)
        mic.style.transform = `perspective(600px) rotateY(-14deg) rotateX(5deg) translateY(${-level * 4}px)`;
      bars.forEach((bar, index) => {
        bar.style.transform = `scaleY(${0.3 + level * (1 + (index % 3) * 0.2)})`;
        bar.style.opacity = String(0.25 + level * 0.75);
      });
    };
    const reset = () => {
      [halo, mic, ...bars].forEach((el) => {
        if (el) {
          el.style.removeProperty("transform");
          el.style.removeProperty("opacity");
        }
      });
    };
    reset();
    if (state !== "listening" && state !== "speaking") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let level = 0;
    const timer = window.setInterval(() => {
      if (
        reduced.matches ||
        document.visibilityState === "hidden" ||
        node.closest(".voice-stage")?.getAttribute("data-motion-in-view") ===
          "false"
      ) {
        reset();
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
      draw(level);
    }, 60);
    return () => {
      window.clearInterval(timer);
      reset();
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
