"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { accountHref } from "@/client/account-flow";
import { useAccount } from "./account-provider";
import { api } from "./header";
import { Button, Banner } from "./ui";
type Message = {
  id: string;
  seq: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
};
export function Workroom({
  id,
  requester,
  worker,
}: {
  id: string;
  requester: string;
  worker: string | null;
}) {
  const { me } = useAccount();
  const participant = Boolean(
    me?.wallets.some((w) => w.wallet === requester || w.wallet === worker),
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [more, setMore] = useState(false);
  const [olderPending, setOlderPending] = useState(false);
  const historyLoaded = useRef(false);
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const generation = useRef(0);
  const draftId = useRef<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const g = ++generation.current;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    setMessages([]);
    setPending(false);
    setOlderPending(false);
    setMore(false);
    historyLoaded.current = false;
    setReport(false);
    setReason("");
    setNotice("");
    setBody("");
    draftId.current = null;
    setError("");
    const poll = async (force = false) => {
      try {
        if (
          participant &&
          (force ||
            (document.visibilityState === "visible" && navigator.onLine))
        ) {
          const r = await api<{ messages: Message[]; hasMore: boolean }>(
            `/api/bounties/${id}/messages`,
            { cache: "no-store" },
          );
          if (!stopped && g === generation.current) {
            setMessages((old) => {
              const merged = new Map(old.map((m) => [m.id, m]));
              r.messages.forEach((m) => merged.set(m.id, m));
              return [...merged.values()].sort((a, b) =>
                BigInt(a.seq) < BigInt(b.seq) ? -1 : 1,
              );
            });
            if (!historyLoaded.current) setMore(r.hasMore);
            setError("");
          }
        }
      } catch (e) {
        if (!stopped && g === generation.current)
          setError(e instanceof Error ? e.message : "Unable to load messages");
      } finally {
        if (!stopped) timer = setTimeout(() => void poll(), 5000);
      }
    };
    void poll(true);
    return () => {
      stopped = true;
      generation.current++;
      clearTimeout(timer);
    };
  }, [id, me?.user.id, participant]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages.at(-1)?.id]);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const g = generation.current;
    setPending(true);
    setError("");
    draftId.current ??= crypto.randomUUID();
    try {
      await api(`/api/bounties/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body, clientId: draftId.current }),
      });
      if (g !== generation.current) return;
      setBody("");
      draftId.current = null;
      const r = await api<{ messages: Message[] }>(
        `/api/bounties/${id}/messages`,
        { cache: "no-store" },
      );
      if (g === generation.current)
        setMessages((old) => {
          const merged = new Map(old.map((m) => [m.id, m]));
          r.messages.forEach((m) => merged.set(m.id, m));
          return [...merged.values()].sort((a, b) =>
            BigInt(a.seq) < BigInt(b.seq) ? -1 : 1,
          );
        });
    } catch (e) {
      if (g === generation.current)
        setError(
          e instanceof Error ? e.message : "Message not sent. Retry safely.",
        );
    } finally {
      if (g === generation.current) setPending(false);
    }
  }
  if (!me)
    return (
      <section className="workroom">
        <h2>Quest workroom</h2>
        <p>
          <Link href={accountHref(`/bounties/${id}`, "worker")}>Sign in</Link>{" "}
          to access participant messages.
        </p>
      </section>
    );
  if (!participant) return null;
  return (
    <section className="workroom" aria-label="Participant communication">
      <h2>Quest workroom</h2>
      <p className="helper">
        Private messages between this quest’s participants. Messages do not
        change the funded agreement or extend deadlines.
      </p>
      {error && <Banner error>{error}</Banner>}
      {more && messages[0] && (
        <Button
          variant="quiet"
          pending={olderPending}
          onClick={async () => {
            if (olderPending) return;
            const g = generation.current;
            const previouslyLoaded = historyLoaded.current;
            historyLoaded.current = true;
            setOlderPending(true);
            try {
              const r = await api<{ messages: Message[]; hasMore: boolean }>(
                `/api/bounties/${id}/messages?before=${messages[0].seq}`,
              );
              if (g !== generation.current) return;
              setMessages((old) => {
                const merged = new Map(old.map((m) => [m.id, m]));
                r.messages.forEach((m) => merged.set(m.id, m));
                return [...merged.values()].sort((a, b) =>
                  BigInt(a.seq) < BigInt(b.seq) ? -1 : 1,
                );
              });
              setMore(r.hasMore);
            } catch (e) {
              if (g === generation.current) {
                historyLoaded.current = previouslyLoaded;
                setError(
                  e instanceof Error
                    ? e.message
                    : "Unable to load earlier messages",
                );
              }
            } finally {
              if (g === generation.current) setOlderPending(false);
            }
          }}
        >
          Load earlier messages
        </Button>
      )}
      <div className="message-list" aria-live="polite">
        {messages.length ? (
          messages.map((m) => (
            <article
              key={m.id}
              className={`message ${m.sender_id === me.user.id ? "mine" : ""}`}
            >
              <strong>
                {m.sender_name}
                {m.sender_id === me.user.id ? " · You" : ""}
              </strong>
              <p>{m.body}</p>
              <time dateTime={m.created_at}>
                {new Date(m.created_at).toLocaleString()}
              </time>
            </article>
          ))
        ) : (
          <p className="muted">
            No messages yet. Use this space to clarify delivery and feedback.
          </p>
        )}
        <div ref={end} />
      </div>
      <form className="account-form" onSubmit={send}>
        <div className="field">
          <label htmlFor="workroom-message">Message</label>
          <textarea
            id="workroom-message"
            rows={3}
            maxLength={4000}
            required
            value={body}
            disabled={pending}
            onChange={(e) => {
              setBody(e.target.value);
              draftId.current = null;
            }}
          />
        </div>
        <Button pending={pending} disabled={!body.trim()} type="submit">
          Send message
        </Button>
      </form>
      <Button variant="quiet" onClick={() => setReport((v) => !v)}>
        Report an issue
      </Button>
      {notice && <Banner>{notice}</Banner>}
      {report && (
        <form
          className="account-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api("/api/reports", {
                method: "POST",
                body: JSON.stringify({ bountyId: id, reason }),
              });
              setReason("");
              setReport(false);
              setNotice(
                "Your report has been recorded for review. It does not pause escrow deadlines.",
              );
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Unable to submit report",
              );
            }
          }}
        >
          <div className="field">
            <label htmlFor="report-reason">Describe the issue</label>
            <textarea
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={10}
              maxLength={2000}
              required
            />
          </div>
          <Button type="submit">Submit report</Button>
        </form>
      )}
    </section>
  );
}
