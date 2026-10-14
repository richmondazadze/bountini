"use client";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { motionEase } from "../motion-system/motion-system";
const stages = ["The request", "The brief", "The requirements"];
/** Explicit marketing illustration: never invokes drafting, media, account or payment APIs. */
export function BriefExample() {
  const [stage, setStage] = useState(0);
  const [pointer, setPointer] = useState(false);
  const id = useId();
  const reduced = useReducedMotion();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let target: number | undefined;
    if (event.key === "ArrowRight") target = (index + 1) % 3;
    if (event.key === "ArrowLeft") target = (index + 2) % 3;
    if (event.key === "Home") target = 0;
    if (event.key === "End") target = 2;
    if (target !== undefined) {
      event.preventDefault();
      setPointer(false);
      setStage(target);
      refs.current[target]?.focus();
    }
  }
  return (
    <details className="pp-brief-demo" data-pointer={pointer}>
      <summary>Explore a voice-to-brief example</summary>
      <span className="pp-story-wave" aria-hidden="true">
        {[16, 28, 42, 32, 20, 38, 24].map((height, i) => (
          <i key={i} style={{ height }} />
        ))}
      </span>
      <div
        className="pp-demo-tabs"
        role="tablist"
        aria-label="Example brief stages"
      >
        {stages.map((label, index) => (
          <button
            key={label}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={stage === index}
            tabIndex={stage === index ? 0 : -1}
            onKeyDown={(e) => navigate(e, index)}
            onClick={(e) => {
              setPointer(e.detail > 0);
              setStage(index);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {stages.map((label, index) => (
        <motion.div
          key={label}
          hidden={stage !== index}
          id={`${id}-panel-${index}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${index}`}
          className="pp-demo-panel"
          initial={false}
          animate={{
            opacity: stage === index ? 1 : 0.9,
            transform:
              stage === index
                ? "perspective(900px) translateX(0px) rotateY(0deg)"
                : "perspective(900px) translateX(24px) rotateY(-5deg)",
          }}
          transition={{
            duration: reduced || !pointer ? 0 : 0.44,
            ease: motionEase,
          }}
        >
          {index === 0 ? (
            <>
              <h4>A possible request</h4>
              <p>
                “Help me translate our neighborhood workshop invitation. Keep
                the date and location, make the Spanish welcoming, and provide
                editable text.”
              </p>
            </>
          ) : index === 1 ? (
            <>
              <h4>A possible brief</h4>
              <p>
                Translate the supplied invitation into welcoming, neutral
                Spanish.
              </p>
              <p className="helper">
                One specific task. An editable written response.
              </p>
            </>
          ) : (
            <>
              <h4>A possible set of requirements</h4>
              <ul>
                <li>Preserve the date, location and links.</li>
                <li>Use natural, welcoming language.</li>
                <li>Deliver editable written copy.</li>
              </ul>
            </>
          )}
        </motion.div>
      ))}
    </details>
  );
}
