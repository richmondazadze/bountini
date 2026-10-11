"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWalletConnection } from "@solana/react-hooks";
import { useAccount } from "./account-provider";
import type { Bounty } from "@/domain/bounty";
import { api } from "./header";
import { Badge, Banner, Button, Enter, Icon } from "./ui";
export function Market({
  mine = false,
  fixedRole,
}: {
  mine?: boolean;
  fixedRole?: "Posted" | "Claimed";
}) {
  const { wallet } = useWalletConnection();
  const { me } = useAccount();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [view, setView] = useState(fixedRole || "All");
  const [state, setState] = useState("All states");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [morePending, setMorePending] = useState(false);
  const loadSequence = useRef(0);
  const load = useCallback(
    async (quiet = false) => {
      const sequence = ++loadSequence.current;
      if (!quiet) setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          mine: String(mine),
          q: query,
          category,
          role: mine ? view : "All",
          state,
          page: "0",
        });
        const r = await api<{ bounties: Bounty[]; hasMore: boolean }>(
          `/api/bounties?${params}`,
        );
        if (sequence !== loadSequence.current) return;
        setBounties((previous) =>
          quiet ? [...r.bounties, ...previous.slice(25)] : r.bounties,
        );
        setHasMore(r.hasMore);
        if (!quiet) setPage(0);
      } catch (e) {
        if (!quiet && sequence === loadSequence.current)
          setError(e instanceof Error ? e.message : "Unable to load quests");
      } finally {
        if (sequence === loadSequence.current) setLoading(false);
      }
    },
    [mine, query, category, view, state, me?.user.id],
  );
  useEffect(() => {
    const debounce = setTimeout(() => void load(), 250);
    const refresh = () => void load();
    window.addEventListener("bountini-auth-change", refresh);
    return () => {
      loadSequence.current++;
      clearTimeout(debounce);
      window.removeEventListener("bountini-auth-change", refresh);
    };
  }, [load, wallet?.account.address]);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        if (document.visibilityState === "visible" && navigator.onLine)
          await load(true);
      } finally {
        if (!stopped) timer = setTimeout(poll, 10000);
      }
    };
    timer = setTimeout(poll, 10000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [load]);
  const visible = bounties;
  const Heading = mine && fixedRole ? "h2" : "h1";
  const workerView = fixedRole === "Claimed";
  async function more() {
    setMorePending(true);
    try {
      const params = new URLSearchParams({
        mine: String(mine),
        q: query,
        category,
        role: mine ? view : "All",
        state,
        page: String(page + 1),
      });
      const r = await api<{ bounties: Bounty[]; hasMore: boolean }>(
        `/api/bounties?${params}`,
      );
      setBounties((previous) => [
        ...previous,
        ...r.bounties.filter((next) => !previous.some((b) => b.id === next.id)),
      ]);
      setHasMore(r.hasMore);
      setPage((p) => p + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load more quests");
    } finally {
      setMorePending(false);
    }
  }
  return (
    <Enter>
      <div className="page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {mine ? "Your contributions" : "The community board"}
            </p>
            <Heading>
              {mine
                ? fixedRole === "Posted"
                  ? "Your posted quests"
                  : fixedRole === "Claimed"
                    ? "Your claimed work"
                    : "My Bountini"
                : "Find your next quest."}
            </Heading>
            <p className="muted">
              {mine
                ? "Track the work you post, claim and complete."
                : "Small tasks. Clear requirements. A useful place to start."}
            </p>
          </div>
          <Link
            href={workerView ? "/discover" : "/create"}
            className="button primary"
          >
            {workerView ? "Find work" : "Create a quest"} <Icon name="arrow" />
          </Link>
        </div>
        {mine && !me ? (
          <div className="empty">
            <Icon name="wallet" />
            <h2>Your work lives here.</h2>
            <p>
              Sign in with your email to see your posted quests and claimed
              work.
            </p>
          </div>
        ) : (
          <>
            <div className="filters">
              <div className="field">
                <label htmlFor="search">Search quests</label>
                <input
                  id="search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What would you like to work on?"
                />
              </div>
              <div className="field">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {[
                    "All categories",
                    "Translation",
                    "Writing",
                    "Community",
                    "Development",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="quest-state">Availability</label>
                <select
                  id="quest-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  {[
                    "All states",
                    "open",
                    "in-progress",
                    "in-review",
                    "revision-requested",
                    "paid",
                    "refunded",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              {mine && !fixedRole && (
                <div className="field">
                  <label htmlFor="view">Your role</label>
                  <select
                    id="view"
                    value={view}
                    onChange={(e) => setView(e.target.value)}
                  >
                    {["All", "Posted", "Claimed"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <Banner>
              Solana Devnet · Test SOL only. Payment requires requester
              approval. Rejected or expired work may remain unpaid.
            </Banner>
            {error ? (
              <>
                <Banner error>{error}</Banner>
                <Button variant="secondary" onClick={() => void load()}>
                  Retry loading
                </Button>
                {hasMore && !loading && (
                  <Button
                    variant="secondary"
                    pending={morePending}
                    onClick={more}
                  >
                    Load more quests
                  </Button>
                )}
              </>
            ) : loading ? (
              <p role="status" aria-busy="true">
                Loading quests…
              </p>
            ) : visible.length ? (
              <div className="quest-list">
                {visible.map((b) => (
                  <article className="quest-row" key={b.id}>
                    <div>
                      <h3>
                        <Link href={`/bounties/${b.id}`}>{b.title}</Link>
                      </h3>
                      <div className="quest-meta">
                        <Badge status={b.status} />
                        {b.requesterName && (
                          <span>Posted by {b.requesterName}</span>
                        )}
                        <span>{b.category}</span>
                        <span>30-minute delivery</span>
                      </div>
                    </div>
                    <div className="reward">
                      {b.reward} SOL<small>Solana Devnet</small>
                    </div>
                    <Link className="button quiet" href={`/bounties/${b.id}`}>
                      View quest ↗
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">
                <Icon name="quest" />
                <h2>
                  {query || category !== "All categories"
                    ? "No matching quests."
                    : mine
                      ? "A fresh start."
                      : "The next quest could be yours."}
                </h2>
                <p>
                  {query || category !== "All categories"
                    ? "Try a different search or category."
                    : workerView
                      ? "Browse available quests. Work you claim will appear here after chain confirmation."
                      : "Create a clear task for your community. Funded quests will appear here after chain confirmation."}
                </p>
                <Link
                  className="button secondary"
                  href={workerView ? "/discover" : "/create"}
                >
                  {workerView ? "Find work" : "Create a quest"}
                </Link>
              </div>
            )}
            {hasMore && !loading && (
              <Button variant="secondary" pending={morePending} onClick={more}>
                Load more quests
              </Button>
            )}
          </>
        )}
      </div>
    </Enter>
  );
}
