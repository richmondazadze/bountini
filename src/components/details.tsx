"use client";
import {AdvisoryReview} from "./assistance";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useWalletConnection, useSolanaClient } from "@solana/react-hooks";
import {
  address,
  blockhash,
  createSolanaRpc,
  getSignatureFromTransaction,
  getBase64EncodedWireTransaction,
  type Instruction,
} from "@solana/kit";
import type { Bounty, TransactionStatus } from "@/domain/bounty";
import { canAct } from "@/domain/bounty";
import type { ChainAction } from "@/chain/escrow";
import { devnetRpc } from "@/chain/network";
import { api } from "./header";
import {
  Badge,
  Banner,
  Button,
  Dialog,
  Enter,
  Icon,
  Countdown,
  TransactionStatusView,
} from "./ui";
export function Details({
  id,
  review = false,
}: {
  id: string;
  review?: boolean;
}) {
  const { wallet } = useWalletConnection();
  const client = useSolanaClient();
  const [b, setB] = useState<Bounty | null>(null);
  const [serverTime, setServerTime] = useState(Date.now());
  const [clockOffset, setClockOffset] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [confirmation, setConfirmation] = useState<ChainAction | null>(null);
  const [pending, setPending] = useState(false);
  const [operation, setOperation] = useState<{
    id: string;
    status: TransactionStatus;
    signature?: string;
  } | null>(null);
  const actor = wallet?.account.address;
  const load = useCallback(async () => {
    setError("");
    try {
      const r = await api<{ bounty: Bounty; serverTime: number }>(
        `/api/bounties/${id}`,
      );
      setB(r.bounty);
      setServerTime(r.serverTime);
      setClockOffset(r.serverTime - Date.now());
      try {
        const ops = await api<{
          operations: {
            id: string;
            status: TransactionStatus;
            signature?: string;
          }[];
        }>(`/api/bounties/${id}/operations`);
        const active = ops.operations.find(
          (o) => !["confirmed", "rejected", "failed"].includes(o.status),
        );
        if (active) setOperation(active);
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quest could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [id, actor]);
  useEffect(() => {
    void load();
    const refocus = () => void load();
    window.addEventListener("focus", refocus);
    try {
      const saved = localStorage.getItem(`bountini.operation.${id}`);
      if (saved) setOperation(JSON.parse(saved));
      const draft = localStorage.getItem(`bountini.submission.${id}`);
      if (draft) setText(draft);
    } catch {}
    return () => window.removeEventListener("focus", refocus);
  }, [id, load]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    localStorage.setItem(`bountini.submission.${id}`, text);
  }, [id, text]);
  useEffect(() => {
    if (operation)
      localStorage.setItem(
        `bountini.operation.${id}`,
        JSON.stringify(operation),
      );
  }, [id, operation]);
  async function checkOperation() {
    if (!operation) return;
    setPending(true);
    try {
      const r = await api<{
        operation: { status: TransactionStatus; signature?: string };
      }>(`/api/operations/${operation.id}`);
      setOperation({ ...operation, ...r.operation, id: operation.id });
      if (r.operation.status === "confirmed") await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to verify transaction");
    } finally {
      setPending(false);
    }
  }
  async function transact(action: ChainAction) {
    if (!b || !actor) return;
    setConfirmation(null);
    setPending(true);
    setError("");
    let opId: string | undefined;
    let txSignature: string | undefined;
    try {
      const prepared = await api<{
        operationId: string;
        lifetime: { blockhash: string; lastValidBlockHeight: string };
        instruction: {
          programAddress: string;
          accounts: Instruction["accounts"];
          data: number[];
        };
      }>(`/api/bounties/${id}/operations`, {
        method: "POST",
        body: JSON.stringify({
          action,
          content: action === "submit" ? text : feedback,
        }),
      });
      opId = prepared.operationId;
      setOperation({ id: opId, status: "waiting-wallet" });
      const ix: Instruction = {
        programAddress: address(prepared.instruction.programAddress),
        accounts: prepared.instruction.accounts,
        data: Uint8Array.from(prepared.instruction.data),
      };
      const rpc = await devnetRpc(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
          "https://api.devnet.solana.com",
      );
      const preparedTx = await client.transaction.prepare({
        authority: wallet!,
        instructions: [ix],
        lifetime: {
          blockhash: blockhash(prepared.lifetime.blockhash),
          lastValidBlockHeight: BigInt(prepared.lifetime.lastValidBlockHeight),
        },
      });
      const signed = await client.transaction.sign(preparedTx);
      txSignature = String(getSignatureFromTransaction(signed));
      // Save the known signature before broadcast so a dropped RPC response remains recoverable.
      const savedBeforeSend = {
        id: opId,
        status: "submitting" as const,
        signature: txSignature,
      };
      localStorage.setItem(
        `bountini.operation.${id}`,
        JSON.stringify(savedBeforeSend),
      );
      setOperation(savedBeforeSend);
      await api(`/api/operations/${opId}`, {
        method: "PATCH",
        body: JSON.stringify({ signature: txSignature }),
      });
      await rpc
        .sendTransaction(getBase64EncodedWireTransaction(signed), {
          encoding: "base64",
          skipPreflight: false,
          maxRetries: 3n,
        })
        .send();
      const saved = {
        id: opId,
        status: "confirming" as const,
        signature: txSignature,
      };
      localStorage.setItem(`bountini.operation.${id}`, JSON.stringify(saved));
      setOperation(saved);
      const r = await api<{ operation: { status: TransactionStatus } }>(
        `/api/operations/${opId}`,
        { method: "PATCH", body: JSON.stringify({ signature: txSignature }) },
      );
      setOperation({ ...saved, status: r.operation.status });
      if (r.operation.status === "confirmed") await load();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Transaction could not be completed";
      setError(message);
      if (opId) {
        const rejected =
          !txSignature && /reject|declin|cancelled/i.test(message);
        if (rejected) {
          try {
            await api(`/api/operations/${opId}`, {
              method: "PATCH",
              body: JSON.stringify({ status: "rejected" }),
            });
          } catch {}
          setOperation({ id: opId, status: "rejected" });
        } else
          setOperation({ id: opId, status: "unknown", signature: txSignature });
      }
    } finally {
      setPending(false);
    }
  }
  if (loading)
    return (
      <div className="page" role="status">
        Loading quest…
      </div>
    );
  if (!b)
    return (
      <div className="page">
        <Banner error>{error || "Quest not found"}</Banner>
        <Button variant="secondary" onClick={load}>
          Retry
        </Button>
      </div>
    );
  const requester = actor === b.requester;
  const worker = actor === b.worker;
  const unresolved =
    operation &&
    !["confirmed", "rejected", "failed"].includes(operation.status);
  const disabled = pending || Boolean(unresolved);
  const now = Math.floor((clock + clockOffset) / 1000);
  const allowed = (action: Parameters<typeof canAct>[1]) =>
    Boolean(actor && canAct(b, action, actor, now));
  const configured = Boolean(process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID);
  return (
    <Enter>
      <div className="page">
        <p className="breadcrumb">
          <Link href="/discover">Discover</Link> /{" "}
          <Link href={`/bounties/${id}`}>{b.title}</Link>
          {review ? " / Submit & review" : ""}
        </p>
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {b.category} · {review ? "Submit & review" : "Quest details"}
            </p>
            <h1>{b.title}</h1>
            <Badge status={b.status} />
          </div>
        </div>
        {error && <Banner error>{error}</Banner>}
        {!configured && (
          <Banner>
            Escrow deployment is pending. You can review the quest, but funding
            and settlement are unavailable.
          </Banner>
        )}
        {operation && (
          <>
            <TransactionStatusView
              status={operation.status}
              signature={operation.signature}
            />
            {unresolved && (
              <Button
                variant="secondary"
                pending={pending}
                onClick={checkOperation}
              >
                Check transaction status
              </Button>
            )}
          </>
        )}
        <div className="split">
          <div className="stack">
            <section>
              <h2>The brief</h2>
              <p className="submission-text">{b.description}</p>
            </section>
            <section>
              <h3>What done looks like</h3>
              <ul className="checklist">
                {b.requirements.map((r, i) => (
                  <li key={i}>
                    <Icon name="check" />
                    {r}
                  </li>
                ))}
              </ul>
              <p className="helper address">
                Agreement SHA-256: {b.requirementsHash}
              </p>
            </section>
            {b.deadline && (
              <section className="panel">
                <h3>
                  {b.status === "revision-requested"
                    ? "Revision deadline"
                    : b.status === "in-review"
                      ? "Review deadline"
                      : "Delivery deadline"}
                </h3>
                <Countdown deadline={b.deadline} serverTime={serverTime} />
                <p className="helper">
                  Chain time decides whether an action is valid. A deadline does
                  not automatically execute a refund.
                </p>
              </section>
            )}
            {review ? (
              <>
                {worker &&
                  ["in-progress", "revision-requested"].includes(b.status) && (
                    <section className="panel">
                      <h2>
                        {b.revisionUsed
                          ? "Submit your revision"
                          : "Submit your work"}
                      </h2>
                      <div className="field">
                        <label htmlFor="submission">Completed text</label>
                        <textarea
                          id="submission"
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          maxLength={20000}
                          aria-describedby="submission-help"
                        />
                        <span id="submission-help" className="helper">
                          Your text is saved on this device until submitted. A
                          chain transaction records its hash.
                        </span>
                      </div>
                      <Button
                        disabled={
                          disabled ||
                          !configured ||
                          !allowed("submit") ||
                          !text.trim()
                        }
                        onClick={() => setConfirmation("submit")}
                      >
                        Submit work
                      </Button>
                    </section>
                  )}
                {b.status === "in-review" && (
                  <section className="panel">
                    <h2>Review the work</h2>
                    <Submission id={id} />
                    <AdvisoryReview bountyId={id} />
                    {requester && (
                      <>
                        <div className="field">
                          <label htmlFor="feedback">Specific feedback</label>
                          <textarea
                            id="feedback"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            maxLength={20000}
                          />
                        </div>
                        <div className="actions">
                          <Button
                            disabled={
                              disabled || !configured || !allowed("approve")
                            }
                            onClick={() => setConfirmation("approve")}
                          >
                            Approve & pay
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={
                              disabled ||
                              !configured ||
                              !allowed("revise") ||
                              !feedback.trim()
                            }
                            onClick={() => setConfirmation("revise")}
                          >
                            Request one revision
                          </Button>
                          <Button
                            variant="quiet"
                            disabled={
                              disabled ||
                              !configured ||
                              !allowed("reject") ||
                              !feedback.trim()
                            }
                            onClick={() => setConfirmation("reject")}
                          >
                            Record rejection
                          </Button>
                        </div>
                        <p className="helper" style={{ marginTop: 16 }}>
                          Rejection records feedback. Funds stay locked until
                          review expiry; you may still approve before then.
                        </p>
                      </>
                    )}
                    <Banner>
                      Review is yours to make. AI assistance is not yet enabled.
                    </Banner>
                  </section>
                )}
                {!worker && !requester && (
                  <Banner>
                    Only the requester and assigned worker can submit or review
                    this quest.
                  </Banner>
                )}
              </>
            ) : (
              <Link
                href={`/bounties/${id}/review`}
                className="button secondary"
              >
                Open submit & review <Icon name="arrow" />
              </Link>
            )}
            <section>
              <h3>Participants</h3>
              <p className="helper address">Requester: {b.requester}</p>
              <p className="helper address">
                Contributor: {b.worker || "Available for one contributor"}
              </p>
            </section>
            <section>
              <h3>Activity</h3>
              <div className="timeline">
                <p>
                  Quest draft created · {new Date(b.createdAt).toLocaleString()}
                </p>
                {b.signature && (
                  <a
                    href={`https://explorer.solana.com/tx/${b.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Latest verified Devnet transaction ↗
                  </a>
                )}
              </div>
            </section>
          </div>
          <aside className="panel" style={{ alignSelf: "start" }}>
            <p className="eyebrow">Reward · Solana Devnet</p>
            <p className="detail-reward">{b.reward} SOL</p>
            <p className="helper">
              Test SOL has no cash value. Network fees and rent are separate.
            </p>
            <hr
              style={{
                border: 0,
                borderTop: "1px solid var(--border)",
                margin: "24px 0",
              }}
            />
            <p>
              30 minutes to deliver.
              <br />
              10 minutes to review.
              <br />
              One optional revision.
            </p>
            {!actor && (
              <p className="helper">
                Connect and sign in with your wallet to take action.
              </p>
            )}
            {b.status === "draft" && requester && (
              <Button
                disabled={disabled || !configured}
                onClick={() => setConfirmation("fund")}
              >
                Fund escrow
              </Button>
            )}
            {allowed("claim") && (
              <Button
                disabled={disabled || !configured}
                onClick={() => setConfirmation("claim")}
              >
                Claim this quest
              </Button>
            )}
            {allowed("cancel") && (
              <Button
                variant="secondary"
                disabled={disabled || !configured}
                onClick={() => setConfirmation("cancel")}
              >
                Cancel & refund
              </Button>
            )}
            {allowed("expire") && (
              <Button
                variant="secondary"
                disabled={disabled || !configured}
                onClick={() => setConfirmation("expire")}
              >
                Refund expired quest
              </Button>
            )}
            {allowed("withdraw") && (
              <Button
                variant="quiet"
                disabled={disabled || !configured}
                onClick={() => setConfirmation("withdraw")}
              >
                Withdraw & refund requester
              </Button>
            )}
            <p className="helper" style={{ marginTop: 24 }}>
              Reward and requirements are fixed at funding. Only the requester
              approves payment. Work may remain unpaid on rejection or expiry.
            </p>
          </aside>
        </div>
      </div>
      <Dialog
        open={Boolean(confirmation)}
        onClose={() => setConfirmation(null)}
        title={
          confirmation === "approve"
            ? "Approve & pay the contributor?"
            : confirmation === "fund"
              ? "Fund this quest?"
              : confirmation === "withdraw"
                ? "Withdraw from this quest?"
                : "Confirm quest action"
        }
      >
        <p>
          {confirmation === "approve"
            ? `Release ${b.reward} test SOL to the assigned worker. Confirmed payment cannot be undone.`
            : confirmation === "withdraw"
              ? `Close the quest and return ${b.reward} test SOL to the requester atomically.`
              : confirmation === "reject"
                ? "Record your feedback. Keep the reward locked until the existing review deadline. You may still approve before expiry."
                : confirmation === "revise"
                  ? "Request the single revision. The worker has 10 minutes, followed by a fresh 10-minute final review."
                  : confirmation === "fund"
                    ? `Lock ${b.reward} test SOL in escrow with these fixed requirements. Your wallet shows fees and rent separately.`
                    : confirmation === "claim"
                      ? "Claim as the only worker. Your 30-minute delivery window starts on chain confirmation."
                      : confirmation === "submit"
                        ? "Commit this text submission and start the requester’s 10-minute review window."
                        : `Return ${b.reward} test SOL to the requester. Settlement happens once.`}
        </p>
        <p className="helper">Network: Solana Devnet.</p>
        <div className="actions">
          <Button onClick={() => confirmation && transact(confirmation)}>
            Confirm & open wallet
          </Button>
          <Button variant="secondary" onClick={() => setConfirmation(null)}>
            Keep reviewing
          </Button>
        </div>
      </Dialog>
    </Enter>
  );
}
function Submission({ id }: { id: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ submissions: { body: string; revision: number }[] }>(
      `/api/bounties/${id}/submissions`,
    )
      .then((r) =>
        setText(
          r.submissions
            .map(
              (s) =>
                `${s.revision ? "Revision" : "Original submission"}\n\n${s.body}`,
            )
            .join("\n\n—\n\n"),
        ),
      )
      .catch((e) => setError(e.message));
  }, [id]);
  return error ? (
    <Banner error>{error}</Banner>
  ) : (
    <p className="submission-text">{text || "Loading confirmed submission…"}</p>
  );
}
