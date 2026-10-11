"use client";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import type { BountyStatus, TransactionStatus } from "@/domain/bounty";
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "quiet" | "danger";
    size?: "compact" | "default" | "large";
    pending?: boolean;
  }
>(
  (
    {
      variant = "primary",
      size = "default",
      pending,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      className={`button ${variant} ${size} ${className}`}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {children}
    </button>
  ),
);
Button.displayName = "Button";
export function Icon({ name }: { name: string }) {
  return (
    <img
      src={`/brand/icons/${name}.svg`}
      alt=""
      width="20"
      height="20"
      aria-hidden="true"
    />
  );
}
export function Banner({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`banner ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
const labels: Record<BountyStatus, string> = {
  draft: "Draft",
  open: "Open",
  "in-progress": "In progress",
  "in-review": "In review",
  "revision-requested": "Revision requested",
  paid: "Payment confirmed",
  refunded: "Refund confirmed",
};
export function Badge({ status }: { status: BountyStatus }) {
  return <span className={`badge ${status}`}>{labels[status]}</span>;
}
export function TransactionStatusView({
  status,
  signature,
}: {
  status: TransactionStatus;
  signature?: string;
}) {
  return (
    <Banner>
      <strong>Transaction: {status.replaceAll("-", " ")}</strong>
      {status === "unknown" && (
        <p>
          Check this transaction before trying again. Funds have not been
          verified.
        </p>
      )}
      {signature && (
        <a
          href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
        >
          View Devnet receipt ↗
        </a>
      )}
    </Banner>
  );
}
export function Enter({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
    >
      {children}
    </motion.div>
  );
}
export function Dialog({
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
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);
  return (
    <dialog ref={ref} aria-labelledby={id} onCancel={onClose} onClose={onClose}>
      <div className="dialog-heading">
        <h2 id={id}>{title}</h2>
        <Button variant="quiet" onClick={onClose} aria-label="Close dialog">
          <Icon name="close" />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function Countdown({
  deadline,
  serverTime,
}: {
  deadline: number;
  serverTime: number;
}) {
  const ref = useRef<HTMLTimeElement>(null);
  useEffect(() => {
    const start = performance.now();
    const update = () => {
      const remaining = Math.max(
        0,
        deadline - Math.floor((serverTime + performance.now() - start) / 1000),
      );
      if (ref.current)
        ref.current.textContent = remaining
          ? `${Math.floor(remaining / 60)}m ${remaining % 60}s remaining`
          : "Deadline reached — settlement still requires a transaction";
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [deadline, serverTime]);
  return (
    <div>
      <time ref={ref} dateTime={new Date(deadline * 1000).toISOString()} />
      <p className="muted">
        Deadline: {new Date(deadline * 1000).toLocaleString()}
      </p>
    </div>
  );
}
