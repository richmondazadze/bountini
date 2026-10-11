"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWalletConnection } from "@solana/react-hooks";
import type { Bounty } from "@/domain/bounty";
import { api } from "./header";
import { Badge, Banner, Button, Enter, Icon } from "./ui";
export function Market({ mine = false }: { mine?: boolean }) {
  const { wallet } = useWalletConnection();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [view, setView] = useState("All");
  const [state, setState] = useState("All states");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [morePending, setMorePending] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
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
      setBounties(r.bounties);
      setHasMore(r.hasMore);
      setPage(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load quests");
    } finally {
      setLoading(false);
    }
  }, [mine, query, category, view, state]);
  useEffect(() => {
    const debounce = setTimeout(() => void load(), 250);
    const refresh = () => void load();
    window.addEventListener("bountini-auth-change", refresh);
    return () => {
      clearTimeout(debounce);
      window.removeEventListener("bountini-auth-change", refresh);
    };
  }, [load, wallet?.account.address]);
  const visible = bounties;
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
            <h1>{mine ? "My Bountini" : "Find your next quest."}</h1>
            <p className="muted">
              {mine
                ? "Track the work you post, claim and complete."
                : "Small tasks. Clear requirements. A useful place to start."}
            </p>
          </div>
          <Link href="/create" className="button primary">
            Create a quest <Icon name="arrow" />
          </Link>
        </div>
        {mine && !wallet ? (
          <div className="empty">
            <Icon name="wallet" />
            <h2>Your work lives here.</h2>
            <p>
              Connect and sign in with your wallet to see your posted quests and
              claimed work.
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
              {mine && (
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
                <Button variant="secondary" onClick={load}>
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
                    : "Create a clear task for your community. Funded quests will appear here after chain confirmation."}
                </p>
                <Link className="button secondary" href="/create">
                  Create a quest
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
