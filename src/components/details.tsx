"use client";
import { useWalletAccess } from "./wallet-access";
import { Workroom } from "./workroom";
import { QuestDetails } from "./quest-details/quest-details";
import {
  DeliverableEditor,
  ConfirmedDeliverables,
  ManifestView,
} from "./deliverables";
import type { FrozenSubmission } from "@/domain/deliverables";
import { useAccount } from "./account-provider";
import { AdvisoryReview } from "./assistance";
import Link from "next/link";
import { accountHref } from "@/client/account-flow";
import { useCallback, useEffect, useRef, useState } from "react";
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
export function Details(props: { id: string; review?: boolean }) {
  const { me } = useAccount();
  return (
    <DetailsView key={`${props.id}:${me?.user.id || "guest"}`} {...props} />
  );
}
function DetailsView({ id, review = false }: { id: string; review?: boolean }) {
  const { wallet } = useWalletConnection();
  const walletReady = useWalletAccess();
  const client = useSolanaClient();
  const { me, loading: accountLoading } = useAccount();
  const [b, setB] = useState<Bounty | null>(null);
  const bountyRef = useRef(b);
  bountyRef.current = b;
  const [serverTime, setServerTime] = useState(Date.now());
  const [clockOffset, setClockOffset] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFresh, setStatusFresh] = useState(false);
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [frozen, setFrozen] = useState<FrozenSubmission | null>(null);
  const [confirmation, setConfirmation] = useState<ChainAction | null>(null);
  const [pending, setPending] = useState(false);
  const [claimAcknowledged, setClaimAcknowledged] = useState(false);
  const [operation, setOperation] = useState<{
    id: string;
    status: TransactionStatus;
    signature?: string;
  } | null>(null);
  const [activity, setActivity] = useState<
    { action: string; signature: string; updated_at: string }[]
  >([]);
  const actor = wallet?.account.address;
  const actorRef = useRef(actor);
  actorRef.current = actor;
  const [authVersion, setAuthVersion] = useState(0);
  const alive = useRef(true);
  const identityRef = useRef("");
  const identity = `${me?.user.id}:${actor}:${walletReady}:${authVersion}`;
  identityRef.current = identity;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    setFrozen(null);
    setConfirmation(null);
    setClaimAcknowledged(false);
    setPending(false);
  }, [identity]);
  const refreshSequence = useRef(0);
  const load = useCallback(
    async (quiet = false) => {
      const sequence = ++refreshSequence.current;
      if (!quiet) {
        setStatusFresh(false);
        setError("");
        if (!bountyRef.current) setLoading(true);
      }
      try {
        const r = await api<{ bounty: Bounty; serverTime: number }>(
          `/api/bounties/${id}`,
          { cache: "no-store" },
        );
        if (sequence !== refreshSequence.current) return;
        setB(r.bounty);
        setStatusFresh(true);
        api<{ activity: typeof activity }>(`/api/bounties/${id}/activity`)
          .then((r) => {
            if (sequence === refreshSequence.current) setActivity(r.activity);
          })
          .catch(() => {});
        setServerTime(r.serverTime);
        setClockOffset(r.serverTime - Date.now());
        if (!quiet)
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
            if (active && sequence === refreshSequence.current)
              setOperation(active);
          } catch {}
      } catch (e) {
        if (!quiet && sequence === refreshSequence.current) {
          setB((previous) => (previous?.status === "draft" ? null : previous));
          setError(
            e instanceof Error ? e.message : "Quest could not be loaded",
          );
        }
      } finally {
        if (sequence === refreshSequence.current) setLoading(false);
      }
    },
    [id, actor],
  );
  useEffect(() => {
    setB(null);
    setLoading(true);
    setOperation(null);
    void load();
    const refocus = () => void load();
    window.addEventListener("focus", refocus);
    const authChange = () => {
      setAuthVersion((version) => version + 1);
      void load();
    };
    window.addEventListener("bountini-auth-change", authChange);
    try {
      const saved = localStorage.getItem(`bountini.operation.${id}`);
      if (saved) {
        const recovered = JSON.parse(saved);
        const sequence = refreshSequence.current;
        api<{ operation: { status: TransactionStatus; signature?: string } }>(
          `/api/operations/${recovered.id}`,
        )
          .then((r) => {
            if (sequence === refreshSequence.current)
              setOperation({ id: recovered.id, ...r.operation });
          })
          .catch(() => {});
      }
      const draft = localStorage.getItem(
        `bountini.submission.v2:${id}:${me?.user.id || "guest"}`,
      );
      if (draft) setText(draft);
    } catch {}
    return () => {
      refreshSequence.current++;
      window.removeEventListener("focus", refocus);
      window.removeEventListener("bountini-auth-change", authChange);
    };
  }, [id, load]);
  useEffect(() => {
    if (!b || ["paid", "refunded"].includes(b.status)) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let running = false;
    const refresh = async () => {
      if (running || stopped) return;
      clearTimeout(timer);
      running = true;
      try {
        if (document.visibilityState === "visible" && navigator.onLine)
          await load(true);
      } finally {
        running = false;
        if (!stopped) timer = setTimeout(refresh, 5000);
      }
    };
    const resume = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    timer = setTimeout(refresh, 5000);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
    };
  }, [b?.status, load]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        `bountini.submission.v2:${id}:${me?.user.id || "guest"}`,
        text,
      );
    } catch {}
  }, [id, text]);
  useEffect(() => {
    if (operation) {
      try {
        localStorage.setItem(
          `bountini.operation.${id}`,
          JSON.stringify(operation),
        );
      } catch {}
    }
  }, [id, operation]);
  useEffect(() => {
    if (
      !operation ||
      ["confirmed", "failed", "rejected"].includes(operation.status) ||
      pending
    )
      return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const r = await api<{
          operation: { status: TransactionStatus; signature?: string };
        }>(`/api/operations/${operation.id}`);
        if (!cancelled) {
          setOperation({ ...operation, ...r.operation });
          if (r.operation.status === "confirmed") await load();
        }
      } catch {}
    }, 6000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [operation, pending, load, identity]);
  async function checkOperation() {
    if (!operation) return;
    const checkingIdentity = identity;
    const valid = () =>
      alive.current && identityRef.current === checkingIdentity;
    setPending(true);
    try {
      const r = await api<{
        operation: { status: TransactionStatus; signature?: string };
      }>(`/api/operations/${operation.id}`);
      if (!valid()) return;
      setOperation({ ...operation, ...r.operation, id: operation.id });
      if (r.operation.status === "confirmed") await load();
    } catch (e) {
      if (valid())
        setError(
          e instanceof Error ? e.message : "Unable to verify transaction",
        );
    } finally {
      if (valid()) setPending(false);
    }
  }
  async function transact(action: ChainAction) {
    if (!b || !actor) return;
    setConfirmation(null);
    setPending(true);
    setError("");
    const transactionIdentity = identity;
    const validIdentity = () =>
      alive.current && identityRef.current === transactionIdentity;
    let opId: string | undefined;
    let txSignature: string | undefined;
    try {
      const session = await api<{ wallet: string }>("/api/auth/session");
      if (!validIdentity() || session.wallet !== actor)
        throw new Error(
          "Verify your connected wallet in the header before continuing.",
        );
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
          ...(action === "submit" && frozen
            ? { manifestId: frozen.id }
            : { content: action === "submit" ? text : feedback }),
        }),
      });
      opId = prepared.operationId;
      if (!validIdentity())
        throw new Error(
          "Account access changed. Reconnect before recovering this operation.",
        );
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
      if (!validIdentity() || actorRef.current !== actor)
        throw new Error(
          "Wallet changed. Reconnect and retry with the current account.",
        );
      const preparedTx = await client.transaction.prepare({
        authority: wallet!,
        instructions: [ix],
        lifetime: {
          blockhash: blockhash(prepared.lifetime.blockhash),
          lastValidBlockHeight: BigInt(prepared.lifetime.lastValidBlockHeight),
        },
      });
      if (!validIdentity())
        throw new Error("Wallet access changed before signing.");
      const signed = await client.transaction.sign(preparedTx);
      if (!validIdentity() || actorRef.current !== actor)
        throw new Error(
          "Wallet changed while signing. This transaction was not broadcast.",
        );
      txSignature = String(getSignatureFromTransaction(signed));
      // Save the known signature before broadcast so a dropped RPC response remains recoverable.
      const savedBeforeSend = {
        id: opId,
        status: "submitting" as const,
        signature: txSignature,
      };
      try {
        localStorage.setItem(
          `bountini.operation.${id}`,
          JSON.stringify(savedBeforeSend),
        );
      } catch {}
      setOperation(savedBeforeSend);
      await api(`/api/operations/${opId}`, {
        method: "PATCH",
        body: JSON.stringify({ signature: txSignature }),
      });
      if (!validIdentity())
        throw new Error(
          "Wallet access changed. This transaction was not broadcast; check its status with the original wallet before retrying.",
        );
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
      try {
        localStorage.setItem(`bountini.operation.${id}`, JSON.stringify(saved));
      } catch {}
      if (!validIdentity()) return;
      setOperation(saved);
      const r = await api<{ operation: { status: TransactionStatus } }>(
        `/api/operations/${opId}`,
        { method: "PATCH", body: JSON.stringify({ signature: txSignature }) },
      );
      if (!validIdentity()) return;
      setOperation({ ...saved, status: r.operation.status });
      if (r.operation.status === "confirmed") await load();
    } catch (e) {
      if (!validIdentity()) return;
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
      if (validIdentity()) setPending(false);
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
        {!me && (
          <Link
            className="button secondary"
            href={accountHref(`/bounties/${id}`)}
          >
            Sign in to access this quest
          </Link>
        )}
        <Button variant="secondary" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  const requester = Boolean(me?.wallets.some((w) => w.wallet === b.requester));
  const worker = Boolean(me?.wallets.some((w) => w.wallet === b.worker));
  const unresolved =
    operation &&
    !["confirmed", "rejected", "failed"].includes(operation.status);
  const disabled = pending || Boolean(unresolved) || !statusFresh;
  const now = Math.floor((clock + clockOffset) / 1000);
  const allowed = (action: Parameters<typeof canAct>[1]) =>
    Boolean(
      me &&
      statusFresh &&
      walletReady &&
      !(action === "claim" && requester) &&
      actor &&
      me.wallets.some((w) => w.wallet === actor) &&
      canAct(b, action, actor, now),
    );
  const submissionVersion = activity
    .filter((event) => event.action === "submit")
    .map((event) => event.signature)
    .join(":");
  const feedbackVersion = activity
    .filter((event) => ["revise", "reject"].includes(event.action))
    .map((event) => event.signature)
    .join(":");
  const configured = Boolean(process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID);
  const confirmationAllowed =
    confirmation === "fund"
      ? requester &&
        statusFresh &&
        walletReady &&
        actor === b.requester &&
        b.status === "draft"
      : confirmation
        ? allowed(confirmation)
        : false;
  const confirmationDialog = (
    <Dialog
      containFocus
      open={Boolean(confirmation)}
      onClose={() => setConfirmation(null)}
      title={
        confirmation === "approve"
          ? "Approve & pay the contributor?"
          : confirmation === "fund"
            ? "Fund this quest?"
            : confirmation === "withdraw"
              ? "Withdraw from this quest?"
              : confirmation === "claim"
                ? "Claim this quest?"
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
                    ? "Claim as the only contributor. Your 30-minute delivery window starts on confirmation. Payment requires requester approval; rejected or expired work may remain unpaid."
                    : confirmation === "submit"
                      ? "Submit the deliverables you reviewed and start the requester’s 10-minute review window. Nothing is submitted until your Devnet transaction confirms."
                      : `Return ${b.reward} test SOL to the requester. Settlement happens once.`}
      </p>
      {confirmation === "submit" && frozen && (
        <>
          <ManifestView manifest={frozen.manifest} />
          <p className="helper address">
            Manifest SHA-256: {frozen.contentHash}
          </p>
          <p className="helper">
            This snapshot is frozen. Choose Keep reviewing to edit and prepare a
            new snapshot. Failed signing preserves your files and draft.
          </p>
        </>
      )}
      {confirmation === "claim" && (
        <label className="qd-claim-consent">
          <input
            type="checkbox"
            checked={claimAcknowledged}
            onChange={(e) => setClaimAcknowledged(e.target.checked)}
          />{" "}
          I understand the requirements, deadlines and approval rules.
        </label>
      )}
      <p className="helper">Network: Solana Devnet.</p>
      <div className="actions">
        <Button
          disabled={
            disabled ||
            !configured ||
            !confirmationAllowed ||
            (confirmation === "claim" && !claimAcknowledged)
          }
          onClick={() => confirmation && transact(confirmation)}
        >
          Confirm & open wallet
        </Button>
        <Button variant="secondary" onClick={() => setConfirmation(null)}>
          Keep reviewing
        </Button>
      </div>
    </Dialog>
  );
  if (!review)
    return (
      <QuestDetails
        b={b}
        account={Boolean(me)}
        accountLoading={Boolean(accountLoading)}
        actor={actor}
        walletReady={walletReady}
        requester={requester}
        worker={worker}
        allowed={allowed}
        configured={configured}
        statusFresh={statusFresh}
        pending={pending}
        operation={operation}
        error={error}
        serverTime={serverTime}
        now={now}
        onAction={(action) => {
          setClaimAcknowledged(false);
          setConfirmation(action);
        }}
        onCheck={() => void checkOperation()}
        onRetry={() => void load()}
        workroom={
          <Workroom
            key={`${id}:${me?.user.id || "guest"}`}
            id={id}
            requester={b.requester}
            worker={b.worker}
          />
        }
        confirmation={confirmationDialog}
      />
    );

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
            {b.requesterProfileId && (
              <p className="helper">
                Requester:{" "}
                <Link href={`/people/${b.requesterProfileId}`}>
                  {b.requesterName}
                </Link>
              </p>
            )}
            {b.workerProfileId && (
              <p className="helper">
                Worker:{" "}
                <Link href={`/people/${b.workerProfileId}`}>
                  {b.workerName}
                </Link>
              </p>
            )}
          </div>
        </div>
        {!me && (
          <Banner>
            <Link href={accountHref(`/bounties/${id}`, "worker")}>
              Sign in or create an account
            </Link>{" "}
            to post, claim or communicate.
          </Banner>
        )}
        {me && (!actor || !me.wallets.some((w) => w.wallet === actor)) && (
          <Banner>
            Connect a linked wallet and sign a message in the header to use
            escrow actions. Your account can still view its workroom.
          </Banner>
        )}
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
            {b.deadline && !["paid", "refunded"].includes(b.status) && (
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
                {(worker || requester) && (
                  <ConfirmedFeedback
                    key={`${id}:${actor}:${authVersion}:${feedbackVersion}:${b.status}`}
                    id={id}
                  />
                )}
                {worker &&
                  ["in-progress", "revision-requested"].includes(b.status) && (
                    <section className="panel">
                      <h2>
                        {b.revisionUsed
                          ? "Submit your revision"
                          : "Submit your work"}
                      </h2>
                      <DeliverableEditor
                        key={`${id}:${identity}`}
                        id={id}
                        owner={me!.user.id}
                        text={text}
                        setText={setText}
                        disabled={disabled || !configured || !allowed("submit")}
                        onPrepared={(value) => {
                          setFrozen(value);
                          setConfirmation("submit");
                        }}
                      />
                    </section>
                  )}
                {(worker || requester) &&
                  [
                    "in-review",
                    "paid",
                    "refunded",
                    "revision-requested",
                  ].includes(b.status) &&
                  submissionVersion && (
                    <section className="panel">
                      <h2>Review the work</h2>
                      <ConfirmedDeliverables
                        key={`${id}:${actor}:${authVersion}:${submissionVersion}`}
                        id={id}
                      />
                      <AdvisoryReview
                        key={`${id}:${actor}:${authVersion}:${submissionVersion}`}
                        bountyId={id}
                      />
                      {requester && b.status === "in-review" && (
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
                        Review is yours to make. AI feedback is advisory only.
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
                href={
                  me
                    ? `/bounties/${id}/review`
                    : accountHref(`/bounties/${id}/review`, "worker")
                }
                className="button secondary"
              >
                {me ? "Open submit & review" : "Sign in to submit or review"}{" "}
                <Icon name="arrow" />
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
                {activity.map((event) => (
                  <p key={event.signature}>
                    <a
                      href={`https://explorer.solana.com/tx/${event.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {event.action} · Confirmed ↗
                    </a>
                    <br />
                    <span className="helper">
                      {new Date(event.updated_at).toLocaleString()}
                    </span>
                  </p>
                ))}
                {b.signature && (
                  <a
                    href={`https://explorer.solana.com/tx/${b.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Verified Devnet transaction ↗
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
                Connect a linked wallet and verify it in the header to take
                action.
              </p>
            )}
            {b.status === "draft" && requester && (
              <Button
                disabled={
                  disabled ||
                  !configured ||
                  !walletReady ||
                  actor !== b.requester ||
                  !me?.wallets.some((w) => w.wallet === actor)
                }
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
      <div className="page">
        <Workroom
          key={`${id}:${me?.user.id || "guest"}`}
          id={id}
          requester={b.requester}
          worker={b.worker}
        />
      </div>
      {confirmationDialog}
    </Enter>
  );
}
function ConfirmedFeedback({ id }: { id: string }) {
  const [items, setItems] = useState<
    {
      id: string;
      action: string;
      feedback: string;
      signature: string;
      confirmed_at: string;
    }[]
  >([]);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setError("");
    let cancelled = false;
    api<{ feedback: typeof items }>(`/api/bounties/${id}/feedback`, {
      cache: "no-store",
    })
      .then((r) => {
        if (!cancelled) setItems(r.feedback);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);
  if (error)
    return (
      <Banner error>
        {error}{" "}
        <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
          Retry feedback
        </Button>
      </Banner>
    );
  if (!items.length) return null;
  return (
    <section className="panel" aria-label="Requester feedback">
      <h2>Requester feedback</h2>
      {items.map((item) => (
        <div key={item.id}>
          <h3>
            {item.action === "revise"
              ? "Revision requested"
              : "Rejection recorded"}
          </h3>
          <p className="submission-text">{item.feedback}</p>
          <a
            className="helper"
            href={`https://explorer.solana.com/tx/${item.signature}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
          >
            Confirmed · {new Date(item.confirmed_at).toLocaleString()} ↗
          </a>
        </div>
      ))}
    </section>
  );
}
