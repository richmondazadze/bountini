"use client";
import { useEffect } from "react";

/** Presentation only: never calls an API, remounts an editor, or derives domain state. */
export function installExpressiveMotion(root: HTMLElement = document.body) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const seen = new WeakSet<Element>();
  const observed = new Set<Element>();
  const jobs = new Set<Animation>();
  const ambient = new Map<
    Element,
    { animation: Animation; visible: boolean }
  >();
  const states = new WeakMap<Element, string>();
  const celebrated = new WeakSet<Element>();
  const sparkNodes = new Set<HTMLElement>();
  const debug =
    process.env.NODE_ENV === "development" &&
    new URLSearchParams(location.search).has("motion-review");
  let disposed = false;
  const audit = () => {
    if (!debug || disposed) return;
    document.documentElement.dataset.motionLayers = JSON.stringify({
      finite: jobs.size,
      ambient: ambient.size,
      runningAmbient: [...ambient.values()].filter(
        (v) => v.animation.playState === "running",
      ).length,
      pausedAmbient: [...ambient.values()].filter(
        (v) => v.animation.playState === "paused",
      ).length,
      reduced: reduced.matches,
      hidden: document.hidden,
    });
  };
  const intro = (
    node: Element,
    frames: Keyframe[],
    duration = 520,
    delay = 0,
  ) => {
    if (reduced.matches || document.hidden || !node.animate) return;
    const animation = node.animate(frames, {
      duration,
      delay,
      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
    });
    jobs.add(animation);
    audit();
    void animation.finished.then(
      () => {
        jobs.delete(animation);
        audit();
      },
      () => {
        jobs.delete(animation);
        audit();
      },
    );
  };
  const syncAmbient = () => {
    for (const { animation, visible } of ambient.values()) {
      if (reduced.matches || document.hidden || !visible) animation.pause();
      else animation.play();
    }
    audit();
  };
  const float = (node: Element) => {
    if (ambient.has(node) || reduced.matches || !node.animate) return;
    const image = node.matches("img");
    const wave = node.matches(".pp-story-wave i");
    const animation = node.animate(
      wave
        ? [
            { transform: "scaleY(.35)" },
            { transform: "scaleY(1)" },
            { transform: "scaleY(.35)" },
          ]
        : image
          ? [
              { transform: "translateY(0px) rotate(-2deg)" },
              { transform: "translateY(-10px) rotate(2deg)" },
              { transform: "translateY(0px) rotate(-2deg)" },
            ]
          : [
              { transform: "translateY(0px) rotate(0deg)" },
              { transform: "translateY(-8px) rotate(0deg)" },
              { transform: "translateY(0px) rotate(0deg)" },
            ],
      {
        duration: wave
          ? 1500 + Array.from(node.parentElement!.children).indexOf(node) * 90
          : image
            ? 7200
            : 9000,
        iterations: Infinity,
        easing: "ease-in-out",
      },
    );
    void animation.finished.catch(() => {});
    animation.pause();
    ambient.set(node, { animation, visible: true });
    syncAmbient();
  };
  const reveal = (node: Element) => {
    if (seen.has(node)) return;
    seen.add(node);
    if (node.matches(".pp-hero")) {
      const parts = [
        [".eyebrow", "translateX(-24px)", 0],
        [".pp-headline-main", "translateY(42px) rotate(-2deg)", 40],
        ["h1 em", "perspective(900px) translateY(48px) rotateX(14deg)", 100],
        [".pp-lead", "translateY(18px)", 160],
        [".pp-actions", "translateY(16px) scale(.97)", 200],
        [".pp-hero-visual", "translateX(32px) rotate(3deg) scale(.97)", 60],
        [".pp-product-note > div", "translateY(28px) rotate(-3deg)", 240],
      ] as const;
      for (const [selector, transform, delay] of parts) {
        const child = node.querySelector(selector);
        if (child)
          intro(child, [{ transform }, { transform: "none" }], 720, delay);
      }
      return;
    }
    if (
      node.matches(
        ".qd-context,.qd-decision,.aw-context,.aw-next,.account-context,.create-page .page-heading,.dashboard-page > h1,.dashboard-updates > h2",
      )
    ) {
      intro(
        node,
        [{ transform: "translateY(14px)" }, { transform: "none" }],
        320,
      );
      return;
    }
    const origin = node.matches(".pp-proof,.pp-usecases")
      ? "translateX(-30px)"
      : node.matches(".pp-voice")
        ? "translateY(28px) rotate(-1deg)"
        : "translateY(24px)";
    intro(node, [{ transform: origin }, { transform: "none" }], 580);
    node
      .querySelectorAll(".pp-steps article img")
      .forEach((image, i) =>
        intro(
          image,
          [
            { transform: "translateY(24px) rotate(-8deg) scale(.92)" },
            { transform: "none" },
          ],
          700,
          i * 60,
        ),
      );
  };
  const visibility = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const orbit = ambient.get(entry.target);
        if (orbit) orbit.visible = entry.isIntersecting;
        if (entry.target.matches(".voice-stage,.aw-upload")) {
          (entry.target as HTMLElement).dataset.motionInView = String(
            entry.isIntersecting,
          );
          continue;
        }
        if (entry.isIntersecting) {
          if (
            entry.target.matches(
              ".pp-product-note,.pp-steps article img,.pp-story-wave i",
            )
          )
            float(entry.target);
          else {
            reveal(entry.target);
            visibility.unobserve(entry.target);
            observed.delete(entry.target);
          }
        }
      }
      syncAmbient();
    },
    { threshold: 0.12 },
  );
  const watched = new WeakSet<Element>();
  const selectors =
    ".voice-stage,.aw-upload,.pp-hero,.pp-section-top,.pp-categories,.pp-steps,.pp-voice,.pp-proof,.pp-usecases,.pp-faq,.pp-about,.qd-context,.qd-decision,.aw-context,.aw-next,.account-context,.create-page .page-heading,.dashboard-page > h1,.dashboard-updates > h2,.pp-product-note,.pp-steps article img,.pp-story-wave i";
  const scan = (scope: ParentNode) => {
    const nodes = [...scope.querySelectorAll(selectors)];
    if (scope instanceof Element && scope.matches(selectors)) nodes.push(scope);
    nodes.forEach((node) => {
      if (!watched.has(node)) {
        watched.add(node);
        visibility.observe(node);
        observed.add(node);
      }
    });
  };
  const burst = (node: HTMLElement) => {
    if (
      reduced.matches ||
      document.hidden ||
      node.closest("[hidden]") ||
      !node.getClientRects().length
    )
      return;
    // Only a real paid settlement or authoritative confirmed transaction reaches here.
    const anchor = document.createElement("span");
    anchor.className = "motion-confirmation-burst";
    anchor.setAttribute("aria-hidden", "true");
    celebrated.add(node);
    node.append(anchor);
    sparkNodes.add(anchor);
    for (let i = 0; i < 10; i++) {
      const spark = document.createElement("i");
      anchor.append(spark);
      const angle = i * 36;
      intro(
        spark,
        [
          {
            transform: `rotate(${angle}deg) translateY(-10px) scaleY(.3)`,
            opacity: 0,
          },
          {
            transform: `rotate(${angle}deg) translateY(-25px) scaleY(1)`,
            opacity: 1,
            offset: 0.3,
          },
          {
            transform: `rotate(${angle}deg) translateY(-42px) scaleY(.4)`,
            opacity: 0,
          },
        ],
        650,
        (i % 2) * 30,
      );
    }
    const fade = anchor.animate([{ opacity: 1 }, { opacity: 1 }], {
      duration: 720,
    });
    jobs.add(fade);
    const done = () => {
      jobs.delete(fade);
      sparkNodes.delete(anchor);
      anchor.remove();
    };
    void fade.finished.then(done, done);
  };
  const stateCue = (node: Element) => {
    if (!(node instanceof HTMLElement)) return;
    if (node.matches(".assistant-proposal")) {
      if (seen.has(node)) return;
      seen.add(node);
      if (document.documentElement.dataset.input !== "keyboard") {
        intro(
          node,
          [
            {
              transform:
                "perspective(1200px) translateY(22px) rotateX(4deg) scale(.98)",
            },
            { transform: "none" },
          ],
          440,
        );
        node
          .querySelectorAll("li")
          .forEach((item, i) =>
            intro(
              item,
              [{ transform: "translateX(14px)" }, { transform: "none" }],
              320,
              Math.min(i, 5) * 30,
            ),
          );
      }
    }
    if (node.matches(".aw-upload")) {
      const uploadState = node.dataset.uploadState || "";
      if (states.get(node) === uploadState) return;
      states.set(node, uploadState);
      if (uploadState === "uploaded")
        intro(
          node,
          [
            { transform: "scale(.985)" },
            { transform: "scale(1.012)", offset: 0.5 },
            { transform: "scale(1)" },
          ],
          260,
        );
    }
    if (node.matches(".transaction-feedback,.rv-settlement")) {
      const status = node.dataset.status || "";
      if (status !== "confirmed" && status !== "paid") {
        node
          .querySelectorAll<HTMLElement>(".motion-confirmation-burst")
          .forEach((anchor) => {
            sparkNodes.delete(anchor);
            anchor.remove();
          });
      }
      if (states.get(node) === status) {
        if (
          (status === "confirmed" || status === "paid") &&
          !celebrated.has(node)
        )
          burst(node);
        return;
      }
      states.set(node, status);
      const symbol = node.querySelector(".transaction-symbol");
      if (symbol)
        intro(
          symbol,
          [{ transform: "rotate(-15deg) scale(.85)" }, { transform: "none" }],
          260,
        );
      if (status === "confirmed" || status === "paid") burst(node);
    }
  };
  const scanState = (scope: ParentNode) =>
    scope
      .querySelectorAll(
        ".assistant-proposal,.transaction-feedback,.rv-settlement,.aw-upload",
      )
      .forEach(stateCue);
  scan(root);
  scanState(root);
  const mutations = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "childList")
        for (const child of record.addedNodes) {
          if (child instanceof HTMLElement) {
            scan(child);
            scanState(child);
            stateCue(child);
          }
        }
      else if (record.target instanceof HTMLElement) {
        if (record.attributeName === "hidden" && !record.target.hidden)
          scanState(record.target);
        else stateCue(record.target);
      }
    }
    for (const node of observed)
      if (!node.isConnected) {
        visibility.unobserve(node);
        observed.delete(node);
      }
    // Release detached ambient layers rather than retaining old pages after navigation.
    for (const [node, orbit] of ambient)
      if (!node.isConnected) {
        orbit.animation.cancel();
        ambient.delete(node);
        visibility.unobserve(node);
      }
  });
  mutations.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-status", "data-upload-state", "hidden"],
  });
  let tilted: HTMLElement | null = null,
    box: DOMRect | null = null,
    raf = 0;
  const move = (event: PointerEvent) => {
    if (
      !fine.matches ||
      reduced.matches ||
      event.pointerType === "touch" ||
      document.hidden
    )
      return;
    const card = (event.target as Element)?.closest<HTMLElement>(
      ".discovery-quest,.pp-categories > a",
    );
    if (!card) return;
    if (tilted !== card) {
      tilted?.style.removeProperty("transform");
      tilted = card;
      box = card.getBoundingClientRect();
    }
    const rect = box!;
    const x = Math.max(
      -1,
      Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1),
    );
    const y = Math.max(
      -1,
      Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1),
    );
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      if (tilted === card)
        card.style.transform = `perspective(1100px) translateY(-6px) rotateX(${-y * 1.5}deg) rotateY(${x * 1.5}deg)`;
    });
  };
  const reset = () => {
    cancelAnimationFrame(raf);
    tilted?.style.removeProperty("transform");
    tilted = null;
    box = null;
  };
  const out = (event: PointerEvent) => {
    if (
      tilted &&
      !(
        event.relatedTarget instanceof Node &&
        tilted.contains(event.relatedTarget)
      )
    )
      reset();
  };
  const press = (event: PointerEvent) => {
    if (reduced.matches || event.pointerType === "touch") return;
    const control = (event.target as Element)?.closest<HTMLElement>(
      ".discovery-categories button,.pp-demo-tabs button,.pp-role button,.aw-nav a",
    );
    if (!control || control.hasAttribute("disabled")) return;
    if (control.matches(".aw-nav a")) {
      const heading = root.querySelector(".aw-section-heading");
      if (heading)
        intro(
          heading,
          [{ transform: "translateX(14px)" }, { transform: "none" }],
          240,
        );
    }
    const child = control.querySelector("svg,img");
    if (child)
      intro(
        child,
        [{ transform: "rotate(-12deg) scale(.8)" }, { transform: "none" }],
        240,
      );
  };
  const key = () => {
    reset();
    for (const job of jobs) job.cancel();
  };
  const preference = () => {
    reset();
    if (reduced.matches) {
      for (const job of jobs) job.cancel();
      for (const { animation } of ambient.values()) animation.cancel();
      ambient.clear();
    } else {
      root
        .querySelectorAll(".pp-product-note,.pp-steps article img")
        .forEach((node) => {
          visibility.unobserve(node);
          visibility.observe(node);
        });
      scan(root);
    }
    syncAmbient();
  };
  const hidden = () => {
    document.documentElement.dataset.motionPaused = String(document.hidden);
    if (document.hidden) reset();
    syncAmbient();
  };
  root.addEventListener("pointermove", move, { passive: true });
  root.addEventListener("pointerout", out, { passive: true });
  root.addEventListener("pointerdown", press, { passive: true });
  document.addEventListener("keydown", key);
  window.addEventListener("resize", reset);
  document.addEventListener("scroll", reset, { passive: true, capture: true });
  document.addEventListener("visibilitychange", hidden);
  reduced.addEventListener("change", preference);
  document.documentElement.dataset.motion = "expressive";
  document.documentElement.dataset.motionPaused = String(document.hidden);
  return () => {
    disposed = true;
    visibility.disconnect();
    mutations.disconnect();
    reset();
    for (const job of jobs) job.cancel();
    for (const { animation } of ambient.values()) animation.cancel();
    sparkNodes.forEach((node) => node.remove());
    root.removeEventListener("pointermove", move);
    root.removeEventListener("pointerout", out);
    root.removeEventListener("pointerdown", press);
    document.removeEventListener("keydown", key);
    window.removeEventListener("resize", reset);
    document.removeEventListener("scroll", reset, true);
    document.removeEventListener("visibilitychange", hidden);
    reduced.removeEventListener("change", preference);
    delete document.documentElement.dataset.motion;
    delete document.documentElement.dataset.motionPaused;
    delete document.documentElement.dataset.motionLayers;
    root
      .querySelectorAll("[data-motion-in-view]")
      .forEach((node) => node.removeAttribute("data-motion-in-view"));
  };
}
export function ExpressiveMotion() {
  useEffect(() => installExpressiveMotion(), []);
  return null;
}
