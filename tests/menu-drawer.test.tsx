// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MenuDrawer } from "../src/components/experience/menu-drawer";
let host: HTMLDivElement, root: Root;
let jobs: {
  finish: () => void;
  cancel: ReturnType<typeof vi.fn>;
  frames: Keyframe[];
  options: KeyframeAnimationOptions;
}[];
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  jobs = [];
  vi.spyOn(HTMLElement.prototype, "animate").mockImplementation(
    (frames, options) => {
      let finish!: () => void, reject!: (error: Error) => void;
      const finished = new Promise<void>((resolve, fail) => {
        finish = resolve;
        reject = fail;
      });
      const cancel = vi.fn(() => reject(new Error("cancelled")));
      jobs.push({
        finish,
        cancel,
        frames: frames as Keyframe[],
        options: options as KeyframeAnimationOptions,
      });
      return { finished, cancel } as unknown as Animation;
    },
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  document.body.style.overflow = "";
  delete document.documentElement.dataset.input;
  vi.restoreAllMocks();
});
const render = (open: boolean, onClose = vi.fn()) =>
  act(async () =>
    root.render(
      <MenuDrawer open={open} onClose={onClose} title="Menu">
        <a href="/discover">Find quests</a>
      </MenuDrawer>,
    ),
  );
it("enters from the right and retains modal/scroll lock until exit completes", async () => {
  document.body.style.overflow = "auto";
  await render(true);
  expect(jobs[0].frames[0].transform).toBe("translateX(100%)");
  expect(jobs[0].frames[1].transform).toBe("translateX(0)");
  expect(jobs[0].options.duration).toBe(260);
  await render(false);
  expect(host.querySelector("dialog")!.open).toBe(true);
  expect(document.body.style.overflow).toBe("hidden");
  expect(
    jobs.findLast((j) => j.frames[1].transform === "translateX(100%)")!
      .frames[1].transform,
  ).toBe("translateX(100%)");
  expect(
    jobs.findLast((j) => j.frames[1].transform === "translateX(100%)")!.options
      .duration,
  ).toBe(190);
  await act(async () =>
    jobs
      .findLast((j) => j.frames[1].transform === "translateX(100%)")!
      .finish(),
  );
  expect(host.querySelector("dialog")!.open).toBe(false);
  expect(document.body.style.overflow).toBe("auto");
});
it("ignores stale completion after rapid close/reopen", async () => {
  await render(true);
  await render(false);
  const exit = jobs.findLast(
    (j) => j.frames[1].transform === "translateX(100%)",
  )!;
  await render(true);
  await act(async () => exit.finish());
  expect(exit.cancel).toHaveBeenCalled();
  expect(host.querySelector("dialog")!.open).toBe(true);
  expect(document.body.style.overflow).toBe("hidden");
  await render(false);
  await act(async () => jobs.at(-2)!.finish());
  expect(host.querySelector("dialog")!.open).toBe(false);
});
it("keyboard navigation closes immediately and restores focus", async () => {
  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();
  document.documentElement.dataset.input = "keyboard";
  await render(true);
  await render(false);
  expect(jobs).toHaveLength(0);
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});
it("Escape requests controlled closure rather than bypassing exit", async () => {
  const close = vi.fn();
  await render(true, close);
  const cancel = new Event("cancel", { cancelable: true });
  host.querySelector("dialog")!.dispatchEvent(cancel);
  expect(cancel.defaultPrevented).toBe(true);
  expect(close).toHaveBeenCalledOnce();
  expect(host.querySelector("dialog")!.open).toBe(true);
});
it("reduced motion opens and closes without translating", async () => {
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches: true,
  } as MediaQueryList);
  await render(true);
  expect(host.querySelector("dialog")!.open).toBe(true);
  await render(false);
  expect(host.querySelector("dialog")!.open).toBe(false);
  expect(jobs).toHaveLength(0);
});
