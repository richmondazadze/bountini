/** Opt-in local instrumentation. Excluded from production; no account or network access. */
export function installDevelopmentProfiler() {
  let raf = 0,
    observer: PerformanceObserver | undefined;
  const samples: unknown[] = [];
  let active = false;
  const profile = (label: string) => {
    active = true;
    cancelAnimationFrame(raf);
    observer?.disconnect();
    const start = performance.now(),
      intervals: number[] = [],
      positions: { time: number; x: number; modal: boolean }[] = [];
    let previous = start,
      longTasks = 0;
    const supported =
      PerformanceObserver.supportedEntryTypes.includes("longtask");
    if (supported) {
      observer = new PerformanceObserver((list) => {
        longTasks += list.getEntries().length;
      });
      observer.observe({ type: "longtask" });
    }
    const tick = (now: number) => {
      intervals.push(now - previous);
      previous = now;
      const panel = document.querySelector<HTMLElement>(".menu-drawer-panel"),
        dialog =
          document.querySelector<HTMLDialogElement>("dialog.menu-drawer");
      if (panel && dialog?.open)
        positions.push({
          time: Math.round(now - start),
          x: Math.round(panel.getBoundingClientRect().x),
          modal: dialog.open,
        });
      if (now - start < 700) {
        raf = requestAnimationFrame(tick);
        return;
      }
      observer?.disconnect();
      active = false;
      const sorted = intervals.slice(1).sort((a, b) => a - b),
        percentile = (p: number) =>
          Number(
            (
              sorted[
                Math.min(sorted.length - 1, Math.floor(sorted.length * p))
              ] || 0
            ).toFixed(2),
          );
      samples.push({
        control: label,
        layerSummary: document.documentElement.dataset.motionLayers,
        viewport: `${innerWidth}x${innerHeight}`,
        durationMs: Math.round(now - start),
        samples: sorted.length,
        medianFrameMs: percentile(0.5),
        p95FrameMs: percentile(0.95),
        maxFrameMs: percentile(1),
        framesAbove25Ms: sorted.filter((n) => n > 25).length,
        longTasks: supported ? longTasks : null,
        positions,
        modalAtEnd: dialog?.open,
        bodyOverflowAtEnd: document.body.style.overflow,
        focusAtEnd: document.activeElement?.getAttribute("aria-label"),
      });
      document.documentElement.dataset.motionMeasurement = JSON.stringify(
        samples.slice(-10),
      );
    };
    raf = requestAnimationFrame(tick);
  };
  const pointer = (event: PointerEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest(
      ".experience-menu-button,.menu-drawer button,.menu-drawer-backdrop,.aw-nav a,.discovery-quest,.pp-categories > a,.pp-demo-tabs button",
    );
    if (control)
      profile(
        control.getAttribute("aria-label") ||
          control.textContent?.trim().slice(0, 80) ||
          "Pointer interaction",
      );
  };
  const scroll = () => {
    if (!active) profile("Real scroll / visible scene choreography");
  };
  const hover = (event: PointerEvent) => {
    if (
      !active &&
      event.target instanceof Element &&
      event.target.closest(".discovery-quest")
    )
      profile("Quest card pointer reaction");
  };
  document.addEventListener("pointerdown", pointer, { passive: true });
  document.addEventListener("pointermove", hover, { passive: true });
  document.addEventListener("scroll", scroll, { passive: true, capture: true });
  if (location.pathname === "/")
    profile("Landing choreography / visible artwork");
  return () => {
    document.removeEventListener("pointerdown", pointer);
    document.removeEventListener("pointermove", hover);
    document.removeEventListener("scroll", scroll, true);
    cancelAnimationFrame(raf);
    observer?.disconnect();
    delete document.documentElement.dataset.motionMeasurement;
  };
}
