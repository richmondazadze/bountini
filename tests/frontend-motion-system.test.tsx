// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MotionSystem } from "../src/components/motion-system/motion-system";
import { BriefExample } from "../src/components/public-product/brief-example";
import { VoiceStage } from "../src/components/voice-stage";
let root: Root, host: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it("tracks pointer and keyboard modality without persisting account state and removes listeners on unmount", async () => {
  const storage = vi.spyOn(Storage.prototype, "setItem");
  await act(async () =>
    root.render(
      <MotionSystem>
        <button>Action</button>
      </MotionSystem>,
    ),
  );
  document.dispatchEvent(new PointerEvent("pointerdown"));
  expect(document.documentElement.dataset.input).toBe("pointer");
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
  expect(document.documentElement.dataset.input).toBe("keyboard");
  expect(storage).not.toHaveBeenCalled();
  await act(async () => root.render(null));
  expect(document.documentElement.dataset.input).toBeUndefined();
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
  expect(document.documentElement.dataset.input).toBeUndefined();
});
it("lets keyboard users explore the marketing brief with one tab stop, linked panels and no generation request", async () => {
  const request = vi.spyOn(globalThis, "fetch");
  await act(async () => root.render(<BriefExample />));
  const tabs = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  expect(tabs.filter((b) => b.tabIndex === 0)).toHaveLength(1);
  tabs[0].focus();
  await act(async () =>
    tabs[0].dispatchEvent(
      new KeyboardEvent("keydown", { key: "End", bubbles: true }),
    ),
  );
  expect(document.activeElement).toBe(tabs[2]);
  expect(tabs[2].getAttribute("aria-selected")).toBe("true");
  const panel = host.querySelector(
    '[id="' + tabs[2].getAttribute("aria-controls") + '"]',
  );
  expect(panel?.hasAttribute("hidden")).toBe(false);
  expect(panel?.textContent).toContain("Preserve the date");
  await act(async () =>
    tabs[2].dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    ),
  );
  expect(tabs[0].getAttribute("aria-selected")).toBe("true");
  expect(request).not.toHaveBeenCalled();
});
it("never samples audio or applies transforms when reduced motion is requested", async () => {
  vi.useFakeTimers();
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches: true,
  } as MediaQueryList);
  const input = vi.fn(() => 0.5),
    output = vi.fn(() => 0.5);
  await act(async () =>
    root.render(
      <VoiceStage
        state="listening"
        getAudio={() => ({ getInputVolume: input, getOutputVolume: output })}
      >
        No recording
      </VoiceStage>,
    ),
  );
  await act(async () => vi.advanceTimersByTimeAsync(180));
  expect(input).not.toHaveBeenCalled();
  expect(output).not.toHaveBeenCalled();
  expect(host.querySelector<HTMLElement>(".voice-halo")?.style.transform).toBe(
    "",
  );
  expect(host.textContent).toContain("Listening to you");
});
