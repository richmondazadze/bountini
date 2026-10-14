"use client";
import { DiagonalArrow } from "@/components/diagonal-arrow";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import type { Bounty, TransactionStatus } from "@/domain/bounty";
import { Banner, Button, Countdown } from "../ui";
import { StatusPill } from "../experience/primitives";
import "./active-workroom.css";
export const workroomSections = [
  "overview",
  "messages",
  "deliverables",
  "review",
  "activity",
] as const;
export type WorkroomSection = (typeof workroomSections)[number];
export function readWorkroomSection(hash: string): WorkroomSection {
  const value = hash.replace(/^#/, "");
  return workroomSections.includes(value as WorkroomSection)
    ? (value as WorkroomSection)
    : "overview";
}
export function workroomNextStep({
  b,
  requester,
  worker,
  ready,
  now,
  transaction,
}: {
  b: Bounty;
  requester: boolean;
  worker: boolean;
  ready: boolean;
  now: number;
  transaction?: TransactionStatus;
}) {
  if (transaction && !["confirmed", "failed", "rejected"].includes(transaction))
    return {
      title:
        transaction === "waiting-wallet"
          ? "Review the request in your wallet"
          : transaction === "unknown"
            ? "Check the existing request"
            : "Waiting for confirmation",
      description:
        "Your quest changes only after confirmation. Check this request before signing another one.",
      action: "check",
      label: "Check confirmation",
    };
  if (b.status === "paid" || b.status === "refunded")
    return {
      title: b.status === "paid" ? "Payment confirmed" : "Refund confirmed",
      description:
        "This quest is closed. Your confirmed delivery and history remain available.",
      action: b.status === "paid" ? "review" : "activity",
      label: b.status === "paid" ? "View confirmed work" : "View quest history",
    };
  if (!requester && !worker)
    return {
      title: "Participant access required",
      description:
        "Only the requester and assigned contributor can access private work and messages.",
      action: "overview",
      label: "View agreement",
    };
  if (b.deadline !== null && now >= b.deadline)
    return {
      title: "The deadline has passed",
      description:
        "The timer does not refund the reward. The requester must confirm the refund; work may remain unpaid.",
      action: requester ? (ready ? "expire" : "wallet") : "activity",
      label: requester
        ? ready
          ? "Review refund action"
          : "Connect participant wallet"
        : "View quest history",
    };
  if (b.status === "draft")
    return {
      title: "Review your unfunded draft",
      description:
        "Funding locks the requirements and reward. This draft is not available to claim.",
      action: "overview",
      label: "Review agreement",
    };
  if (!ready)
    return {
      title: "Connect and verify the participant wallet",
      description:
        "Your account can read this workroom. Signed actions require the original participant wallet and ownership verification.",
      action: "wallet",
      label: "Connect participant wallet",
    };
  if (worker && ["in-progress", "revision-requested"].includes(b.status))
    return {
      title:
        b.status === "revision-requested"
          ? "Make the requested revision"
          : "Deliver your work",
      description:
        "Prepare your files, links or written response, review the submission summary, then sign before the deadline.",
      action: "deliverables",
      label:
        b.status === "revision-requested"
          ? "Prepare revision"
          : "Prepare delivery",
    };
  if (requester && b.status === "in-review")
    return {
      title: "The delivery is ready for review",
      description:
        "Compare the confirmed submission with the funded requirements. Payment requires your approval; AI feedback is optional.",
      action: "review",
      label: "Review delivery",
    };
  return {
    title: worker
      ? "Waiting for requester review"
      : b.status === "open"
        ? "Waiting for a contributor"
        : "Your contributor is working",
    description:
      "Messages do not change the funded agreement or extend deadlines. Payment requires requester approval.",
    action: "messages",
    label: "Open messages",
  };
}
export function ActiveWorkroom({
  b,
  requester,
  worker,
  ready,
  now,
  serverTime,
  operation,
  pending,
  statusFresh,
  error,
  onCheck,
  onRetry,
  onExpire,
  sections,
  controls,
  confirmation,
}: {
  b: Bounty;
  requester: boolean;
  worker: boolean;
  ready: boolean;
  now: number;
  serverTime: number;
  operation: { status: TransactionStatus; signature?: string } | null;
  pending: boolean;
  statusFresh: boolean;
  error: string;
  onCheck: () => void;
  onRetry: () => void;
  onExpire: () => void;
  sections: Record<WorkroomSection, ReactNode>;
  controls: ReactNode;
  confirmation: ReactNode;
}) {
  const [section, setSection] = useState<WorkroomSection>("overview");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const sync = () => setSection(readWorkroomSection(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [b.id]);
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const indicatorAnimation = useRef<Animation | undefined>(undefined);
  useEffect(() => () => indicatorAnimation.current?.cancel(), []);
  useLayoutEffect(() => {
    const nav = navRef.current,
      line = indicatorRef.current;
    if (!nav || !line) return;
    const update = (animate = false) => {
      const selected = nav.querySelector<HTMLElement>("a[aria-current]");
      if (!selected) return;
      const previous = getComputedStyle(line).transform;
      indicatorAnimation.current?.cancel();
      const target = `translateX(${selected.offsetLeft}px) scaleX(${selected.offsetWidth})`;
      const hasPrevious = Boolean(line.style.transform);
      line.style.transform = target;
      if (
        animate &&
        hasPrevious &&
        line.animate &&
        document.documentElement.dataset.input !== "keyboard" &&
        !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ) {
        indicatorAnimation.current = line.animate(
          [{ transform: previous }, { transform: target }],
          { duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
        );
        void indicatorAnimation.current.finished.catch(() => {});
      }
    };
    update(true);
    const resize = () => update();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      indicatorAnimation.current?.cancel();
    };
  }, [section]);
  function navigate(value: WorkroomSection, focus = false) {
    window.history.pushState(null, "", `#${value}`);
    setSection(value);
    if (focus) requestAnimationFrame(() => heading.current?.focus());
  }
  const nextStep = workroomNextStep({
    b,
    requester,
    worker,
    ready,
    now,
    transaction: operation?.status,
  });
  const model =
    !statusFresh && !operation
      ? {
          title: "Refresh the quest before taking action",
          description:
            "Your agreement and work are preserved. Load current status before preparing or signing another request.",
          action: "refresh",
          label: "Refresh quest status",
        }
      : nextStep;
  const participant = requester || worker;
  function action() {
    if (model.action === "refresh") onRetry();
    else if (model.action === "check") onCheck();
    else if (model.action === "wallet")
      window.dispatchEvent(new Event("bountini-open-wallet"));
    else if (model.action === "expire") onExpire();
    else navigate(readWorkroomSection(model.action), true);
  }
  return (
    <div className="aw-page">
      <Link className="aw-back" href={`/bounties/${b.id}`}>
        ← Quest details
      </Link>
      <header className="aw-context">
        <div>
          <p className="eyebrow">Quest workspace · {b.category}</p>
          <h1>{b.title}</h1>
          <StatusPill
            tone={
              b.status === "paid" || b.status === "open"
                ? "success"
                : b.status === "refunded" || b.status === "revision-requested"
                  ? "warning"
                  : "neutral"
            }
          >
            {b.status === "paid"
              ? "Payment confirmed"
              : b.status === "refunded"
                ? "Refund confirmed"
                : b.status.replaceAll("-", " ")}
          </StatusPill>
        </div>
        <div className="aw-summary">
          <strong>{b.reward} test SOL</strong>
          <span className="helper">Solana Devnet · No cash value</span>
          {b.deadline && !["paid", "refunded"].includes(b.status) && (
            <>
              <span className="helper">
                {b.status === "in-review"
                  ? "Review"
                  : b.status === "revision-requested"
                    ? "Revision"
                    : "Delivery"}{" "}
                deadline
              </span>
              <Countdown deadline={b.deadline} serverTime={serverTime} />
            </>
          )}
        </div>
      </header>
      {error && (
        <Banner error>
          {error}{" "}
          <Button variant="secondary" onClick={onRetry}>
            Refresh quest status
          </Button>
        </Banner>
      )}
      <section
        className="aw-next"
        aria-label="Your next action"
        data-state={operation?.status || b.status}
      >
        <div>
          <p className="eyebrow">Your next step</p>
          <h2>{model.title}</h2>
          <p>{model.description}</p>
          {operation && (
            <p role="status">
              {operation.status === "rejected"
                ? "Signing was declined. Your draft is preserved."
                : operation.status === "failed"
                  ? "The request did not complete. Your draft is preserved."
                  : operation.status === "confirmed"
                    ? "Request confirmed."
                    : "Confirmation is not yet complete."}
            </p>
          )}
        </div>
        <Button
          onClick={action}
          disabled={
            pending ||
            (model.action === "check" && !ready) ||
            (model.action === "expire" && !statusFresh)
          }
        >
          {model.label}
        </Button>
      </section>
      {operation?.signature && (
        <a
          className="aw-receipt"
          href={`https://explorer.solana.com/tx/${operation.signature}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
        >
          View signed Devnet request <DiagonalArrow />
        </a>
      )}
      <nav ref={navRef} className="aw-nav" aria-label="Workroom sections">
        {workroomSections.map((value) => (
          <a
            key={value}
            href={`#${value}`}
            aria-current={section === value ? "page" : undefined}
            onClick={(e) => {
              if (
                e.button === 0 &&
                !e.metaKey &&
                !e.ctrlKey &&
                !e.shiftKey &&
                !e.altKey
              ) {
                e.preventDefault();
                navigate(value);
              }
            }}
          >
            {value[0].toUpperCase() + value.slice(1)}
          </a>
        ))}
        <span
          ref={indicatorRef}
          className="aw-moving-indicator"
          aria-hidden="true"
        />
      </nav>
      <div className="aw-grid">
        <div className="aw-content">
          <h2 ref={heading} tabIndex={-1} className="aw-section-heading">
            {section[0].toUpperCase() + section.slice(1)}
          </h2>
          {workroomSections.map((value) => (
            <section
              key={value}
              hidden={section !== value}
              aria-label={`${value} content`}
              className="aw-section"
            >
              {value === "overview" || participant ? (
                sections[value]
              ) : (
                <Banner>
                  Sign in to a participant account to access this section.
                </Banner>
              )}
            </section>
          ))}
        </div>
        <aside className="aw-controls" aria-label="Quest controls">
          {controls}
        </aside>
      </div>
      {confirmation}
    </div>
  );
}
