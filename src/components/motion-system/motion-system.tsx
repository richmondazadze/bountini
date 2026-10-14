"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { MotionConfig } from "motion/react";

export const motionTiming = {
  press: 0.12,
  feedback: 0.16,
  panel: 0.22,
  exit: 0.14,
  marketing: 0.5,
} as const;
export const motionEase = [0.23, 1, 0.32, 1] as const;
export const motionSpring = {
  type: "spring",
  duration: 0.5,
  bounce: 0.2,
} as const;
export function MotionSystem({ children }: { children: ReactNode }) {
  // Capture opt-in before discovery normalizes its supported query parameters.
  const reviewEnabled = useRef(
    typeof window !== "undefined" &&
      process.env.NODE_ENV === "development" &&
      new URLSearchParams(window.location.search).has("motion-review"),
  );
  useEffect(() => {
    if (!reviewEnabled.current) return;
    let cancelled = false,
      cleanup: (() => void) | undefined;
    void import("./development-profiler").then(
      ({ installDevelopmentProfiler }) => {
        if (!cancelled) cleanup = installDevelopmentProfiler();
      },
    );
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const pointer = () => {
      root.dataset.input = "pointer";
    };
    const keyboard = () => {
      root.dataset.input = "keyboard";
    };
    document.addEventListener("pointerdown", pointer, { passive: true });
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", keyboard);
      delete root.dataset.input;
    };
  }, []);
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: motionTiming.panel, ease: motionEase }}
    >
      {children}
    </MotionConfig>
  );
}
