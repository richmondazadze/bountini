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
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await api<{ bounties: Bounty[] }>(
        `/api/bounties${mine ? "?mine=true" : ""}`,
      );
      setBounties(r.bounties);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load quests");
    } finally {
      setLoading(false);
    }
  }, [mine]);
  useEffect(() => {
    void load();
  }, [load, wallet?.account.address]);
  const address = wallet?.account.address;
  const visible = bounties.filter(
    (b) =>
      (category === "All categories" || b.category === category) &&
      `${b.title} ${b.description}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!mine ||
        view === "All" ||
        (view === "Posted" ? b.requester === address : b.worker === address)),
  );
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
          </>
        )}
      </div>
    </Enter>
  );
}
