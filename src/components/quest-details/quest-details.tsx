"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Bounty, TransactionStatus, Action } from "@/domain/bounty";
import { WINDOWS } from "@/domain/bounty";
import type { ChainAction } from "@/chain/escrow";
import { accountHref } from "@/client/account-flow";
import { RequesterIdentity } from "../discovery/quest-card";
import { ExperienceIcon, StatusPill } from "../experience/primitives";
import { Banner, Button, Countdown } from "../ui";
import "./quest-details.css";
const labels: Record<Bounty["status"], string> = {
  draft: "Draft",
  open: "Open",
  "in-progress": "In progress",
  "in-review": "In review",
  "revision-requested": "Revision requested",
  paid: "Payment confirmed",
  refunded: "Refund confirmed",
};
const operationCopy: Record<TransactionStatus, [string, string]> = {
  "waiting-wallet": [
    "Review the request in your wallet",
    "No action is confirmed yet. Complete or decline the request in your wallet.",
  ],
  submitting: [
    "Sending your signed request",
    "Keep this page open. Check this request before trying again.",
  ],
  confirming: [
    "Waiting for confirmation",
    "Your request was sent. The quest changes only after confirmation.",
  ],
  unknown: [
    "Confirmation is not yet known",
    "Check this existing request before signing another one. Reconnect the original wallet if your account or wallet changed.",
  ],
  rejected: [
    "Signing was declined",
    "The agreement is unchanged. Review it before trying again.",
  ],
  failed: [
    "The request did not complete",
    "Your agreement and context are preserved. Review the current quest before trying again.",
  ],
  confirmed: [
    "Request confirmed",
    "The confirmed quest status below determines your next step.",
  ],
};
export function QuestDetails({
  b,
  account,
  accountLoading,
  actor,
  walletReady,
  requester,
  worker,
  allowed,
  configured,
  statusFresh,
  pending,
  operation,
  error,
  serverTime,
  now,
  onAction,
  onCheck,
  onRetry,
  workroom,
  confirmation,
}: {
  b: Bounty;
  account: boolean;
  accountLoading: boolean;
  actor?: string;
  walletReady: boolean;
  requester: boolean;
  worker: boolean;
  allowed: (action: Action) => boolean;
  configured: boolean;
  statusFresh: boolean;
  pending: boolean;
  operation: {
    id: string;
    status: TransactionStatus;
    signature?: string;
  } | null;
  error: string;
  serverTime: number;
  now: number;
  onAction: (action: ChainAction) => void;
  onCheck: () => void;
  onRetry: () => void;
  workroom: ReactNode;
  confirmation: ReactNode;
}) {
  const unresolved = Boolean(
    operation &&
    !["confirmed", "rejected", "failed"].includes(operation.status),
  );
  const blocked = pending || unresolved || !configured || !statusFresh;
  const participant = requester || worker;
  const needsWallet = account && (!actor || !walletReady);
  const open = b.status === "open" && !b.worker;
  const deadlineReached = Boolean(
    b.deadline && now >= b.deadline && !["paid", "refunded"].includes(b.status),
  );
  const guidance =
    b.status === "draft"
      ? "This draft is not funded or available to claim."
      : b.status === "paid"
        ? "Payment to the assigned contributor is confirmed. This quest is complete."
        : b.status === "refunded"
          ? "The refund is confirmed. This quest is closed."
          : open
            ? requester
              ? "This is your quest. You cannot claim it."
              : "Read the fixed requirements before claiming as the only contributor."
            : deadlineReached
              ? "The deadline has passed. A refund still requires the requester’s confirmed action."
              : b.status === "in-review"
                ? "The requester is reviewing the submitted work. Payment requires approval."
                : b.status === "revision-requested"
                  ? "The assigned contributor is working on the requested revision."
                  : "This quest already has an assigned contributor.";
  const walletButton = (
    <Button
      variant="secondary"
      onClick={() => window.dispatchEvent(new Event("bountini-open-wallet"))}
    >
      {actor ? "Verify or change wallet" : "Connect wallet"}
    </Button>
  );
  return (
    <>
      <div className="qd-page">
        <Link className="qd-back" href="/discover">
          <ExperienceIcon name="arrow" size={16} />
          Back to discovery
        </Link>
        <header className="qd-context" data-component="QuestContext">
          <div className="qd-status">
            <StatusPill
              tone={
                b.status === "open" || b.status === "paid"
                  ? "success"
                  : b.status === "refunded"
                    ? "warning"
                    : "neutral"
              }
            >
              {labels[b.status]}
            </StatusPill>
            <span>
              {b.category} ·{" "}
              {b.status === "draft"
                ? "Draft requirements"
                : "Fixed requirements"}
            </span>
          </div>
          <h1>{b.title}</h1>
          <RequesterIdentity bounty={b} />
          {b.requesterProfileId && b.requesterName && (
            <Link
              className="qd-profile"
              href={`/people/${b.requesterProfileId}`}
            >
              View requester profile
            </Link>
          )}
        </header>
        <div className="qd-layout">
          <aside
            className="qd-decision"
            aria-label="Reward and quest actions"
            data-component="RewardSummary"
          >
            <p className="eyebrow">
              {b.status === "draft"
                ? "Proposed reward"
                : b.status === "paid"
                  ? "Confirmed reward"
                  : b.status === "refunded"
                    ? "Refunded reward"
                    : "Quest reward"}{" "}
              / Solana Devnet
            </p>
            <p className="qd-reward">
              {b.reward} <span>test SOL</span>
            </p>
            <p className="qd-muted">
              Test tokens have no cash value. Network fees and rent are
              separate.
            </p>
            <dl className="qd-timing">
              <div>
                <dt>Delivery window</dt>
                <dd>{WINDOWS.delivery / 60} minutes</dd>
              </div>
              <div>
                <dt>Requester review</dt>
                <dd>{WINDOWS.review / 60} minutes</dd>
              </div>
            </dl>
            <div className="qd-approval">
              <strong>Approval is required for payment.</strong>
              <p>
                Rejected or expired work may remain unpaid. A deadline alone
                does not pay or refund the reward.
              </p>
            </div>
            <section className="qd-readiness" data-component="ClaimReadiness">
              <h2>
                {open && !requester ? "Before you claim" : "Your next step"}
              </h2>
              <p>{guidance}</p>
              {accountLoading && <p role="status">Checking your account…</p>}
              {!account && !accountLoading && open && (
                <div className="qd-ready-step">
                  <strong>1. Sign in to your account</strong>
                  <p>
                    You can browse without a wallet. Sign in before claiming.
                  </p>
                  <Link
                    className="button primary"
                    href={accountHref(`/bounties/${b.id}`, "worker")}
                  >
                    Sign in to claim
                  </Link>
                </div>
              )}
              {account &&
                ((open && !requester) || participant) &&
                needsWallet &&
                !["paid", "refunded"].includes(b.status) && (
                  <div className="qd-ready-step">
                    <strong>
                      {actor
                        ? "Verify the connected wallet"
                        : "Connect your wallet"}
                    </strong>
                    <p>
                      {actor
                        ? "Use a signed message to link and verify this wallet. Use the wallet associated with this quest to manage it."
                        : "Wallet connection is your choice. Connect, then verify ownership with a signed message before taking action."}
                    </p>
                    {walletButton}
                  </div>
                )}
              {account &&
                walletReady &&
                participant &&
                actor !== (requester ? b.requester : b.worker) &&
                !["paid", "refunded"].includes(b.status) && (
                  <div className="qd-ready-step">
                    <p>
                      Switch to this quest’s{" "}
                      {requester ? "requester" : "assigned contributor"} wallet
                      to manage its actions.
                    </p>
                    {walletButton}
                  </div>
                )}
              {!configured && (
                <p role="status">
                  Wallet actions are currently unavailable. You can still read
                  this agreement.
                </p>
              )}
              {error && (
                <Banner error>
                  {error}
                  <Button variant="quiet" onClick={onRetry}>
                    Refresh quest status
                  </Button>
                </Banner>
              )}
              {operation && (
                <div
                  className="qd-recovery"
                  data-component="TransactionRecovery"
                  role={
                    ["failed", "rejected"].includes(operation.status)
                      ? "alert"
                      : "status"
                  }
                >
                  <strong>{operationCopy[operation.status][0]}</strong>
                  <p>{operationCopy[operation.status][1]}</p>
                  {unresolved && (
                    <Button
                      pending={pending}
                      disabled={!walletReady}
                      onClick={onCheck}
                    >
                      Check confirmation
                    </Button>
                  )}
                  {operation.signature && (
                    <a
                      href={`https://explorer.solana.com/tx/${operation.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Devnet receipt ↗
                    </a>
                  )}
                </div>
              )}
              {b.status === "draft" && requester && (
                <Button
                  variant={unresolved ? "secondary" : "primary"}
                  disabled={blocked || !walletReady || actor !== b.requester}
                  onClick={() => onAction("fund")}
                >
                  Fund this quest
                </Button>
              )}
              {open && !requester && account && (
                <Button
                  variant={unresolved ? "secondary" : "primary"}
                  disabled={blocked || !allowed("claim")}
                  onClick={() => onAction("claim")}
                >
                  Claim this quest
                </Button>
              )}
              {participant && b.status !== "draft" && (
                <Link
                  className={`button ${unresolved || allowed("expire") ? "secondary" : "primary"}`}
                  href={`/bounties/${b.id}/review`}
                >
                  {b.status === "paid"
                    ? "View completed work"
                    : b.status === "refunded"
                      ? "Open quest history"
                      : worker
                        ? "Open your work"
                        : "Open submission and review"}
                </Link>
              )}
              {allowed("cancel") && (
                <Button
                  variant="secondary"
                  disabled={blocked}
                  onClick={() => onAction("cancel")}
                >
                  Cancel and refund
                </Button>
              )}
              {allowed("expire") && (
                <Button
                  variant={unresolved ? "secondary" : "primary"}
                  disabled={blocked}
                  onClick={() => onAction("expire")}
                >
                  Refund expired quest
                </Button>
              )}
              {allowed("withdraw") && (
                <Button
                  variant="quiet"
                  disabled={blocked}
                  onClick={() => onAction("withdraw")}
                >
                  Withdraw and refund requester
                </Button>
              )}
            </section>
            {b.deadline && !["paid", "refunded"].includes(b.status) && (
              <section className="qd-deadline">
                <h2>
                  {b.status === "in-review"
                    ? "Review deadline"
                    : b.status === "revision-requested"
                      ? "Revision deadline"
                      : "Delivery deadline"}
                </h2>
                <Countdown deadline={b.deadline} serverTime={serverTime} />
                <p>
                  {deadlineReached
                    ? "The requester must confirm expiry to refund the reward."
                    : "The confirmed deadline determines whether an action is available."}
                </p>
              </section>
            )}
            <details className="qd-policy">
              <summary>Revision, fees and expiry</summary>
              <p>
                One revision is supported: {WINDOWS.revision / 60} minutes to
                deliver it, then {WINDOWS.finalReview / 60} minutes for final
                review. Only the requester approves payment or submits expiry.
                Rejection records feedback without immediately refunding escrow.
                A contributor can withdraw and refund the requester.
              </p>
            </details>
          </aside>
          <div className="qd-agreement" data-component="AgreementPanel">
            <section>
              <p className="eyebrow">
                {b.status === "draft" ? "Draft brief" : "The funded agreement"}
              </p>
              <h2>A clear outcome.</h2>
              <p className="qd-preserve">{b.description}</p>
            </section>
            <section>
              <p className="eyebrow">What done looks like</p>
              <h2>Acceptance criteria</h2>
              <ol className="qd-requirements">
                {b.requirements.map((r, i) => (
                  <li key={i}>
                    <span aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p>{r}</p>
                  </li>
                ))}
              </ol>
            </section>
            <section data-component="SourceMaterials">
              <p className="eyebrow">Before you begin</p>
              <h2>Source materials</h2>
              <p>
                Refer to the source instructions in the brief and acceptance
                criteria. Files shared as participant deliverables are private.
              </p>
              {participant && (
                <Link href={`/bounties/${b.id}/review`}>
                  Open authorized participant materials ↗
                </Link>
              )}
            </section>
            <section data-component="RequesterContext">
              <h2>Requester</h2>
              <RequesterIdentity bounty={b} />
              <p className="qd-address">Wallet: {b.requester}</p>
              {b.worker && (
                <>
                  <h3>Assigned contributor</h3>
                  <p>{b.workerName || b.worker}</p>
                </>
              )}
            </section>
            <details className="qd-agreement-record">
              <summary>Agreement record</summary>
              <p className="qd-address">SHA-256: {b.requirementsHash}</p>
              <p>
                {b.status === "draft"
                  ? "This agreement becomes fixed when funding is confirmed."
                  : "Reward and requirements were fixed at funding."}
              </p>
              {b.signature && (
                <a
                  href={`https://explorer.solana.com/tx/${b.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View verified Devnet transaction ↗
                </a>
              )}
            </details>
          </div>
        </div>
      </div>
      {participant && <div className="qd-workroom">{workroom}</div>}
      {confirmation}
    </>
  );
}
