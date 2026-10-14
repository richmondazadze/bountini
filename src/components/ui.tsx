"use client";
import { DiagonalArrow } from "@/components/diagonal-arrow";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
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
      {pending && <span className="button-spinner" aria-hidden="true" />}
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
    <div
      className="banner transaction-feedback"
      data-status={status}
      role="status"
    >
      <span className="transaction-symbol" aria-hidden="true">
        <Icon
          name={
            status === "confirmed"
              ? "check"
              : status === "failed" ||
                  status === "rejected" ||
                  status === "unknown"
                ? "warning"
                : "wallet"
          }
        />
      </span>
      <div>
        <strong>
          {
            (
              {
                "waiting-wallet": "Review the request in your wallet",
                submitting: "Sending your signed request",
                confirming: "Waiting for network confirmation",
                confirmed: "Request confirmed",
                rejected: "Signing was declined",
                failed: "The request did not complete",
                unknown: "Confirmation needs checking",
              } as const
            )[status]
          }
        </strong>
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
            View Devnet receipt <DiagonalArrow />
          </a>
        )}
      </div>
    </div>
  );
}
export function Enter({ children }: { children: ReactNode }) {
  // CSS starting-style keeps content immediately present, with a modest first-paint transition.
  return <div className="motion-enter">{children}</div>;
}
export function Dialog({
  open,
  onClose,
  title,
  children,
  containFocus = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  containFocus?: boolean;
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
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={onClose}
      onClose={onClose}
      onKeyDown={(event) => {
        if (!containFocus || event.key !== "Tab") return;
        const targets = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((node) => node.getClientRects().length > 0);
        const first = targets[0],
          last = targets.at(-1);
        if (event.shiftKey && document.activeElement === first && last) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last &&
          first
        ) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <div className="dialog-heading">
        <h2 id={id}>{title}</h2>
        <Button variant="quiet" onClick={onClose} aria-label="Close dialog">
          <Icon name="close" />
        </Button>
      </div>
      <div className="dialog-content">{children}</div>
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
