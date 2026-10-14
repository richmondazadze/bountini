// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { installExpressiveMotion } from "../src/components/motion-system/expressive-motion";
let root: HTMLDivElement, cleanup: (() => void) | undefined;
let callback: IntersectionObserverCallback;
let jobs: {
  node: Element;
  frames: Keyframe[];
  options: KeyframeAnimationOptions;
  cancel: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
}[];
let preference: ((event: MediaQueryListEvent) => void) | undefined;
let reduce = false;
beforeEach(() => {
  root = document.createElement("div");
  document.body.append(root);
  jobs = [];
  reduce = false;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query.includes("reduced-motion") ? reduce : true;
    },
    addEventListener: (_: string, fn: typeof preference) => {
      if (query.includes("reduced-motion")) preference = fn;
    },
    removeEventListener: vi.fn(),
  }));
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    new DOMRect(0, 0, 100, 100),
  ] as unknown as DOMRectList);
  vi.spyOn(Element.prototype, "animate").mockImplementation(function (
    this: Element,
    frames,
    options,
  ) {
    const job = {
      node: this,
      frames: frames as Keyframe[],
      options: options as KeyframeAnimationOptions,
      cancel: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(),
    };
    jobs.push(job);
    return {
      ...job,
      finished: new Promise(() => {}),
    } as unknown as Animation;
  });
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  root.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function intersect(node: Element, visible: boolean) {
  callback(
    [{ target: node, isIntersecting: visible } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  );
}
it("choreographs hero layers without hiding content, invoking APIs or changing logo geometry", () => {
  root.innerHTML =
    '<section class="pp-hero"><p class="eyebrow">Useful work</p><h1><span class="pp-headline-main">Small work.</span><em>Shared momentum.</em></h1><figure class="pp-hero-visual"><img alt="Illustration" /></figure></section><svg id="logo"><path d="M0 0h10v10z"/></svg>';
  const before = root.querySelector("svg")!.outerHTML,
    fetcher = vi.spyOn(window, "fetch");
  cleanup = installExpressiveMotion(root);
  intersect(root.querySelector(".pp-hero")!, true);
  expect(jobs.length).toBe(4);
  expect(jobs.some((j) => j.frames.some((f) => f.opacity === 0))).toBe(false);
  expect(jobs.map((j) => j.options.delay)).toEqual([0, 40, 100, 60]);
  expect(fetcher).not.toHaveBeenCalled();
  expect(root.querySelector("svg")!.outerHTML).toBe(before);
});
it("pauses offscreen ambient layers and cancels them on cleanup", () => {
  root.innerHTML = '<div class="pp-product-note">Illustration</div>';
  cleanup = installExpressiveMotion(root);
  const card = root.firstElementChild!;
  intersect(card, true);
  expect(jobs[0].options.iterations).toBe(Infinity);
  expect(jobs[0].play).toHaveBeenCalled();
  intersect(card, false);
  expect(jobs[0].pause).toHaveBeenCalled();
  cleanup();
  cleanup = undefined;
  expect(jobs[0].cancel).toHaveBeenCalled();
});
it("reduced motion never starts choreography or ambient loops", () => {
  reduce = true;
  root.innerHTML =
    '<section class="pp-hero"><h1><span class="pp-headline-main">Work</span></h1></section><div class="pp-product-note">Example</div>';
  cleanup = installExpressiveMotion(root);
  intersect(root.firstElementChild!, true);
  intersect(root.lastElementChild!, true);
  expect(jobs).toHaveLength(0);
});
it("cancels active motion if reduced motion is enabled during an animation", () => {
  root.innerHTML = '<div class="pp-product-note">Example</div>';
  cleanup = installExpressiveMotion(root);
  intersect(root.firstElementChild!, true);
  reduce = true;
  preference?.({ matches: true } as MediaQueryListEvent);
  expect(jobs[0].cancel).toHaveBeenCalled();
});
it("never celebrates pending/unknown requests, celebrates only authoritative status and only once", async () => {
  root.innerHTML =
    '<section class="transaction-feedback" data-status="unknown"><span class="transaction-symbol">?</span></section>';
  cleanup = installExpressiveMotion(root);
  expect(root.querySelector(".motion-confirmation-burst")).toBeNull();
  const panel = root.firstElementChild as HTMLElement;
  panel.dataset.status = "confirmed";
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(root.querySelectorAll(".motion-confirmation-burst")).toHaveLength(1);
  panel.hidden = true;
  panel.hidden = false;
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(root.querySelectorAll(".motion-confirmation-burst")).toHaveLength(1);
  panel.dataset.status = "unknown";
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(root.querySelector(".motion-confirmation-burst")).toBeNull();
});
it("does not animate message content or remount editor drafts", () => {
  root.innerHTML =
    '<section class="message-list"><p>Private message</p><textarea>Retained draft</textarea></section>';
  const field = root.querySelector("textarea")!;
  cleanup = installExpressiveMotion(root);
  expect(root.querySelector("textarea")).toBe(field);
  expect(field.value).toBe("Retained draft");
  expect(jobs).toHaveLength(0);
});
it("pauses visible ambient scenes while the document is hidden", () => {
  root.innerHTML = '<div class="pp-product-note">Example</div>';
  cleanup = installExpressiveMotion(root);
  intersect(root.firstElementChild!, true);
  jobs[0].pause.mockClear();
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  document.dispatchEvent(new Event("visibilitychange"));
  expect(jobs[0].pause).toHaveBeenCalled();
});
