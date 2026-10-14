"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button, Icon } from "../ui";

/** Native modal semantics stay active until the exit animation finishes. */
export function MenuDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const animations = useRef<Animation[]>([]);
  const generation = useRef(0);
  const restore = useRef<{
    overflow: string;
    focus: HTMLElement | null;
  } | null>(null);
  const id = useId();
  useEffect(() => {
    const node = dialog.current!,
      surface = panel.current!,
      shade = backdrop.current!;
    const token = ++generation.current;
    if (!open && !node.open) return;
    const entering = open && !node.open;
    if (entering) {
      restore.current = {
        overflow: document.body.style.overflow,
        focus:
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null,
      };
      document.body.style.overflow = "hidden";
      node.showModal();
    }
    // Snapshot the current visual position before cancelling a reversed animation.
    const fromTransform = entering
      ? "translateX(100%)"
      : getComputedStyle(surface).transform;
    const fromOpacity = entering ? "0" : getComputedStyle(shade).opacity;
    animations.current.forEach((animation) => animation.cancel());
    const finish = () => {
      if (token !== generation.current) return;
      if (!open) {
        node.close();
        if (restore.current) {
          document.body.style.overflow = restore.current.overflow;
          if (!document.querySelector("dialog[open]"))
            restore.current.focus?.focus();
          restore.current = null;
        }
      }
    };
    const immediate =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.input === "keyboard" ||
      !surface.animate;
    surface.style.transform = open ? "translateX(0)" : "translateX(100%)";
    shade.style.opacity = open ? "1" : "0";
    if (immediate) {
      finish();
      return;
    }
    const duration = open ? 260 : 190;
    const options = { duration, easing: "cubic-bezier(0.32, 0.72, 0, 1)" };
    const slide = surface.animate(
      [{ transform: fromTransform }, { transform: surface.style.transform }],
      options,
    );
    const fade = shade.animate(
      [{ opacity: fromOpacity }, { opacity: shade.style.opacity }],
      { ...options, duration: open ? 200 : 160 },
    );
    const children = Array.from(
      surface.querySelectorAll<HTMLElement>(
        ".menu-drawer-content nav a, .experience-account-menu, .experience-menu-network",
      ),
    );
    const childJobs = open
      ? children.map((child, i) => {
          const animation = child.animate(
            [{ transform: "translateX(24px)" }, { transform: "translateX(0)" }],
            {
              duration: 340,
              delay: Math.min(i, 6) * 24,
              easing: "cubic-bezier(0.23, 1, 0.32, 1)",
            },
          );
          void animation.finished.catch(() => {});
          return animation;
        })
      : [];
    animations.current = [slide, fade, ...childJobs];
    void fade.finished.catch(() => {});
    void slide.finished.then(finish, () => {});
  }, [open]);
  useEffect(
    () => () => {
      ++generation.current;
      animations.current.forEach((animation) => animation.cancel());
      if (restore.current)
        document.body.style.overflow = restore.current.overflow;
    },
    [],
  );
  return (
    <dialog
      ref={dialog}
      className="menu-drawer"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const targets = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href],button:not([disabled]),select:not([disabled]),[tabindex="0"]',
          ),
        ).filter((node) => node.getClientRects().length > 0);
        const first = targets[0],
          last = targets.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <div
        ref={backdrop}
        className="menu-drawer-backdrop"
        aria-hidden="true"
        onClick={onClose}
      />
      <div ref={panel} className="menu-drawer-panel">
        <div className="dialog-heading">
          <h2 id={id}>{title}</h2>
          <Button variant="quiet" onClick={onClose} aria-label="Close menu">
            <Icon name="close" />
          </Button>
        </div>
        <div className="menu-drawer-content">{children}</div>
      </div>
    </dialog>
  );
}
