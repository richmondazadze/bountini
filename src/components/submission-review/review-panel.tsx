"use client";
import { useState, type ReactNode } from "react";
import type { Bounty, Action } from "@/domain/bounty";
import type { ChainAction } from "@/chain/escrow";
import type { ConfirmedSubmission } from "@/domain/deliverables";
import { ConfirmedDeliverables } from "../deliverables";
import { AdvisoryReview } from "../assistance";
import { Banner, Button } from "../ui";
import "./review-panel.css";
export type ConfirmedActivity = {
  action: string;
  signature: string;
  updated_at: string;
};
const names: Record<string, string> = {
  fund: "Escrow funded",
  claim: "Contributor assigned",
  submit: "Delivery confirmed",
  revise: "Revision requested",
  reject: "Rejection recorded",
  approve: "Payment confirmed",
  cancel: "Cancellation refund confirmed",
  expire: "Expiry refund confirmed",
  withdraw: "Withdrawal refund confirmed",
};
export function SettlementSummary({
  b,
  activity,
}: {
  b: Bounty;
  activity: ConfirmedActivity[];
}) {
  const terminal = b.status === "paid" || b.status === "refunded";
  const matching = activity
    .filter((e) =>
      b.status === "paid"
        ? e.action === "approve"
        : b.status === "refunded"
          ? ["cancel", "expire", "withdraw"].includes(e.action)
          : false,
    )
    .at(-1);
  return (
    <section className="rv-settlement" aria-label="Reward and settlement">
      <p className="eyebrow">Reward and settlement</p>
      <h3>{b.reward} test SOL</h3>
      <p>
        {b.status === "paid"
          ? "Payment to the assigned contributor is confirmed."
          : b.status === "refunded"
            ? "The reward’s return to the requester is confirmed."
            : b.status === "draft"
              ? "This draft is not funded."
              : "The reward remains in escrow. Payment requires requester approval."}
      </p>
      <p className="helper">
        Solana Devnet · Test tokens have no cash value. Network fees and rent
        are separate.
      </p>
      {matching && (
        <a
          href={`https://explorer.solana.com/tx/${matching.signature}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
        >
          View confirmed {b.status === "paid" ? "payment" : "refund"} receipt ↗
        </a>
      )}
      {terminal && !matching && (
        <p className="helper">
          A matching settlement receipt is not available in the loaded history.
        </p>
      )}
      {!terminal && (
        <p className="helper">
          A countdown ending is not a payment or refund. Rejection records
          feedback and leaves funds locked until review expiry. Expiry needs a
          confirmed requester action; withdrawal closes the quest and refunds
          the requester atomically.
        </p>
      )}
    </section>
  );
}
export function ReviewActivity({
  b,
  activity,
}: {
  b: Bounty;
  activity: ConfirmedActivity[];
}) {
  return (
    <section className="rv-activity">
      <h3>Confirmed quest history</h3>
      <p className="helper">
        Draft created · {new Date(b.createdAt).toLocaleString()}
      </p>
      {activity.length ? (
        <ol>
          {activity.map((e) => (
            <li key={e.signature}>
              <strong>{names[e.action] || "Quest action confirmed"}</strong>
              <time dateTime={e.updated_at}>
                {new Date(e.updated_at).toLocaleString()}
              </time>
              <details>
                <summary>Transaction record</summary>
                <a
                  href={`https://explorer.solana.com/tx/${e.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View verified Devnet transaction ↗
                </a>
                <p className="helper address">{e.signature}</p>
              </details>
            </li>
          ))}
        </ol>
      ) : (
        <p>No confirmed activity is available in the loaded history.</p>
      )}
    </section>
  );
}
export function ReviewPanel({
  b,
  requester,
  worker,
  blocked,
  ready,
  advisoryReady,
  allowed,
  feedback,
  setFeedback,
  onAction,
  activity,
  feedbackHistory,
}: {
  b: Bounty;
  requester: boolean;
  worker: boolean;
  blocked: boolean;
  ready: boolean;
  advisoryReady: boolean;
  allowed: (a: Action) => boolean;
  feedback: string;
  setFeedback: (s: string) => void;
  onAction: (a: ChainAction) => void;
  activity: ConfirmedActivity[];
  feedbackHistory: ReactNode;
}) {
  const [versions, setVersions] = useState<ConfirmedSubmission[] | null>(null);
  if (!requester && !worker)
    return (
      <Banner>Only quest participants can review private submissions.</Banner>
    );
  const decision = requester && b.status === "in-review";
  const terminal = ["paid", "refunded"].includes(b.status);
  return (
    <div className="rv-panel">
      <header className="rv-intro">
        <p className="eyebrow">Human review</p>
        <h2>
          {terminal
            ? "The quest is settled"
            : b.status === "revision-requested"
              ? "A revision has been requested"
              : "Compare the delivery with the agreement"}
        </h2>
        <p>
          {worker
            ? "Read confirmed feedback and the submission history. Only the requester can approve payment or request a revision."
            : "Use the fixed requirements to make your decision. Gemini can help identify evidence, but the decision remains yours."}
        </p>
      </header>
      <SettlementSummary b={b} activity={activity} />
      <div className="rv-comparison">
        <section className="rv-delivery">
          <h3>Confirmed delivery</h3>
          <ConfirmedDeliverables
            id={b.id}
            onLoaded={setVersions}
            selectVersions
          />
        </section>
        <section className="rv-agreement">
          <p className="eyebrow">Fixed at funding</p>
          <h3>Acceptance criteria</h3>
          <ol>
            {b.requirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
          <details>
            <summary>Funded brief and agreement record</summary>
            <p className="submission-text">{b.description}</p>
            <p className="helper address">
              Agreement SHA-256: {b.requirementsHash}
            </p>
          </details>
        </section>
      </div>
      <section
        className="rv-feedback-history"
        aria-label="Confirmed requester feedback"
      >
        {feedbackHistory}
      </section>
      {!terminal && (
        <details className="rv-advisory">
          <summary>Optional Gemini advisory review</summary>
          <AdvisoryReview bountyId={b.id} eligible={advisoryReady} />
        </details>
      )}
      {decision && (
        <section className="rv-decision" aria-label="Requester decision">
          <h3>Your review decision</h3>
          <p>
            Approve only when the confirmed delivery meets the funded
            requirements. One revision gives the contributor 10 minutes,
            followed by a fresh 10-minute review.
          </p>
          {!ready && (
            <Banner>
              Connect and verify the original requester wallet before signing a
              decision.{" "}
              <Button
                variant="secondary"
                onClick={() =>
                  window.dispatchEvent(new Event("bountini-open-wallet"))
                }
              >
                Connect requester wallet
              </Button>
            </Banner>
          )}
          {!versions && (
            <p role="status">Load the confirmed delivery before deciding.</p>
          )}
          <div className="field">
            <label htmlFor="feedback">Specific feedback</label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              maxLength={20000}
              disabled={blocked}
            />
            <p className="helper">
              Required for revision or rejection. Describe what needs to change
              against the funded criteria.
            </p>
          </div>
          <div className="rv-decisions">
            <Button
              disabled={blocked || !versions?.length || !allowed("approve")}
              onClick={() => onAction("approve")}
            >
              Approve & pay
            </Button>
            <Button
              variant="secondary"
              disabled={
                blocked ||
                !versions?.length ||
                !allowed("revise") ||
                !feedback.trim()
              }
              onClick={() => onAction("revise")}
            >
              Request one revision
            </Button>
            <Button
              variant="quiet"
              disabled={
                blocked ||
                !versions?.length ||
                !allowed("reject") ||
                !feedback.trim()
              }
              onClick={() => onAction("reject")}
            >
              Record rejection
            </Button>
          </div>
          <p className="helper">
            Rejection records feedback without payment, refund or a deadline
            reset. You may still approve before review expiry.{" "}
            {b.revisionUsed && "The single revision has already been used."}
          </p>
        </section>
      )}
      {requester && !terminal && b.deadline && (
        <section className="rv-recovery">
          <h3>Expiry and refund</h3>
          <p>
            Once the deadline has passed, the requester can sign the refund
            action. Until confirmation, the reward remains unsettled.
          </p>
          <Button
            variant="secondary"
            disabled={blocked || !allowed("expire")}
            onClick={() => onAction("expire")}
          >
            Review expired quest refund
          </Button>
        </section>
      )}
      {worker && !terminal && (
        <section className="rv-recovery">
          <h3>Contributor actions</h3>
          <p>
            Withdrawing closes this quest and returns its reward to the
            requester. Your work may remain unpaid.
          </p>
          <Button
            variant="quiet"
            disabled={blocked || !allowed("withdraw")}
            onClick={() => onAction("withdraw")}
          >
            Withdraw & refund requester
          </Button>
        </section>
      )}
    </div>
  );
}
