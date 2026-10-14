"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Dialog, TransactionStatusView } from "../ui";
import { VoiceStage } from "../voice-stage";
import type { TransactionStatus } from "@/domain/bounty";
type Sample = {
  viewport: string;
  reducedMotion: boolean;
  samples: number;
  medianFrameMs: number;
  p95FrameMs: number;
  maximumFrameMs: number;
  framesAbove25Ms: number;
  longTasks: number | null;
  longTaskObserverSupported: boolean;
  durationMs: number;
};
/** Isolated component reference. Never imported by account, quest, or wallet controllers. */
export function MotionShowcase() {
  const [voice, setVoice] = useState<
    | "idle"
    | "connecting"
    | "listening"
    | "speaking"
    | "muted"
    | "preparing"
    | "ready"
    | "failure"
  >("idle");
  const [transaction, setTransaction] =
    useState<TransactionStatus>("waiting-wallet");
  const [open, setOpen] = useState(false);
  const [proposal, setProposal] = useState(false);
  const [sampling, setSampling] = useState(false);
  const [sample, setSample] = useState<Sample | null>(null);
  const samplingCleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => samplingCleanup.current?.(), []);
  function profile() {
    samplingCleanup.current?.();
    setSample(null);
    setSampling(true);
    setOpen(true);
    const start = performance.now();
    const frames: number[] = [];
    let previous = start;
    let raf = 0;
    const longTaskObserverSupported =
      typeof PerformanceObserver !== "undefined" &&
      PerformanceObserver.supportedEntryTypes.includes("longtask");
    let longTasks: number | null = longTaskObserverSupported ? 0 : null;
    let observer: PerformanceObserver | null = null;
    if (longTaskObserverSupported) {
      observer = new PerformanceObserver((list) => {
        longTasks = (longTasks ?? 0) + list.getEntries().length;
      });
      observer.observe({ type: "longtask" });
    }
    const closeTimer = window.setTimeout(() => setOpen(false), 450);
    samplingCleanup.current = () => {
      cancelAnimationFrame(raf);
      clearTimeout(closeTimer);
      observer?.disconnect();
    };
    const tick = (time: number) => {
      frames.push(time - previous);
      previous = time;
      if (time - start < 1400) {
        raf = requestAnimationFrame(tick);
        return;
      }
      observer?.disconnect();
      const sorted = frames.slice(1).sort((a, b) => a - b);
      const percentile = (fraction: number) =>
        Number(
          (
            sorted[
              Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))
            ] || 0
          ).toFixed(2),
        );
      setSample({
        viewport: `${innerWidth} × ${innerHeight}`,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        samples: sorted.length,
        medianFrameMs: percentile(0.5),
        p95FrameMs: percentile(0.95),
        maximumFrameMs: percentile(1),
        framesAbove25Ms: sorted.filter((n) => n > 25).length,
        longTasks,
        longTaskObserverSupported,
        durationMs: Number((time - start).toFixed(2)),
      });
      setSampling(false);
      samplingCleanup.current = null;
    };
    raf = requestAnimationFrame(tick);
  }
  return (
    <section
      className="motion-showcase stack"
      aria-label="Visual and motion reference"
    >
      <div className="panel">
        <p className="eyebrow">Common Table / local review</p>
        <h2>Feel the shared system.</h2>
        <p>
          Component samples only. These controls do not record audio, upload
          files, persist account data or submit transactions.
        </p>
        <div className="actions">
          <Button onClick={() => setOpen(true)}>Open reference dialog</Button>
          <Button variant="secondary" onClick={profile} pending={sampling}>
            Measure panel transition
          </Button>
        </div>
        {sample && (
          <pre
            className="motion-measurement"
            aria-label="Animation measurement"
          >
            {JSON.stringify(sample, null, 2)}
          </pre>
        )}
        <p className="helper">
          A 1.4-second requestAnimationFrame sample around this panel’s opening
          and closing. It measures this browser on this machine, not device-wide
          FPS or compositor costs.
        </p>
      </div>
      <div className="panel">
        <p className="eyebrow">Expressive motion / isolated illustration</p>
        <h2>A proposal takes shape.</h2>
        <p>
          Reference only. No generation, saved draft, upload or wallet request.
        </p>
        <Button
          variant="secondary"
          onClick={() => setProposal((value) => !value)}
          aria-expanded={proposal}
        >
          Toggle proposal transformation
        </Button>
        {proposal && (
          <section className="assistant-proposal">
            <h3>Reference proposal</h3>
            <p>
              An illustrated draft arrives as a readable sheet. Actual generated
              proposals remain editable and require review before funding.
            </p>
            <ul>
              <li>Read the brief.</li>
              <li>Check each requirement.</li>
              <li>Review the reward before signing.</li>
            </ul>
          </section>
        )}
      </div>
      <div className="panel">
        <h2>Voice state reference</h2>
        <label className="field">
          Sample voice state
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value as typeof voice)}
          >
            {[
              "idle",
              "connecting",
              "listening",
              "speaking",
              "muted",
              "preparing",
              "ready",
              "failure",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <VoiceStage state={voice} getAudio={() => null}>
          <span className="helper">
            Visual sample · No recording or audio input
          </span>
        </VoiceStage>
      </div>
      <div className="panel">
        <h2>Signing and confirmation reference</h2>
        <label className="field">
          Sample request state
          <select
            value={transaction}
            onChange={(e) =>
              setTransaction(e.target.value as TransactionStatus)
            }
          >
            {[
              "waiting-wallet",
              "submitting",
              "confirming",
              "unknown",
              "rejected",
              "failed",
              "confirmed",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <TransactionStatusView status={transaction} />
        <div className="aw-upload" aria-busy="true">
          <span>Upload sample · Indeterminate transfer</span>
          <progress aria-label="Indeterminate sample upload" />
        </div>
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="A clear next step"
        containFocus
      >
        <p>
          This reference panel uses the same native dialog and focus behavior as
          the application. Escape closes it immediately.
        </p>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Back to components
        </Button>
      </Dialog>
    </section>
  );
}
