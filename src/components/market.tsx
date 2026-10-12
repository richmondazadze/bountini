"use client";
import Link from "next/link";
import { useAccount } from "./account-provider";
import { useQuestFeed } from "./discovery/use-quest-feed";
import { Discovery } from "./discovery/discovery";
import { Badge, Banner, Button, Enter, Icon } from "./ui";
export function Market({
  mine = false,
  fixedRole,
}: {
  mine?: boolean;
  fixedRole?: "Posted" | "Claimed";
}) {
  const { me, loading: accountLoading } = useAccount();
  const feed = useQuestFeed({ mine, fixedRole });
  const {
    bounties: visible,
    loading,
    error,
    query,
    setQuery,
    category,
    setCategory,
    view,
    setView,
    state,
    setState,
    hasMore,
    morePending,
    load,
    more,
  } = feed;
  const Heading = mine && fixedRole ? "h2" : "h1";
  const workerView = fixedRole === "Claimed";
  if (!mine) return <Discovery feed={feed} />;
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
        {accountLoading ? (
          <p role="status">Loading your account…</p>
        ) : mine && !me ? (
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
