"use client";
import { Button, Enter } from "../ui";
import {
  EmptyState,
  LabeledField,
  StatusNotice,
} from "../experience/primitives";
import { QuestCard } from "./quest-card";
import type { QuestFeed } from "./use-quest-feed";
import "./discovery.css";
export function Discovery({ feed }: { feed: QuestFeed }) {
  const {
    bounties,
    loading,
    error,
    query,
    setQuery,
    category,
    setCategory,
    state,
    setState,
    hasMore,
    morePending,
    load,
    more,
  } = feed;
  const filtered = Boolean(
    query || category !== "All categories" || state !== "All states",
  );
  const reset = () => {
    setQuery("");
    setCategory("All categories");
    setState("All states");
  };
  return (
    <Enter>
      <div className="discovery-page">
        <div className="discovery-heading">
          <p className="eyebrow">The community board / discovery</p>
          <h1>Your next small win.</h1>
          <p>Choose a clear task. Make a useful contribution.</p>
        </div>
        <section className="discovery-filters" aria-label="Quest filters">
          <LabeledField label="Search quests">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try translation, writing or documentation"
              maxLength={100}
            />
          </LabeledField>
          <LabeledField label="Category">
            <select
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
          </LabeledField>
          <LabeledField label="Availability">
            <select value={state} onChange={(e) => setState(e.target.value)}>
              {[
                ["All states", "All states"],
                ["open", "Open"],
                ["in-progress", "In progress"],
                ["in-review", "In review"],
                ["revision-requested", "Revision requested"],
                ["paid", "Payment confirmed"],
                ["refunded", "Refund confirmed"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </LabeledField>
        </section>
        <div className="discovery-result-summary">
          <p role="status">
            {loading
              ? "Updating quests…"
              : error
                ? "Quest list could not be updated."
                : `${bounties.length} quest${bounties.length === 1 ? "" : "s"} shown${hasMore ? " · More available" : ""}`}
          </p>
          {filtered && (
            <Button variant="quiet" onClick={reset}>
              Reset filters
            </Button>
          )}
        </div>
        {loading ? (
          <div className="discovery-loading" role="status" aria-busy="true">
            <span>Loading quests…</span>
            <div aria-hidden="true" />
            <div aria-hidden="true" />
            <div aria-hidden="true" />
          </div>
        ) : (
          <>
            {error && (
              <StatusNotice title="Quests could not be updated" tone="danger">
                {error} Your filters are preserved.{" "}
                <Button variant="secondary" onClick={() => void load()}>
                  Retry loading
                </Button>
              </StatusNotice>
            )}
            {bounties.length ? (
              <section aria-label="Quest results" className="discovery-results">
                <h2 className="experience-sr-only">Quests</h2>
                {bounties.map((b) => (
                  <QuestCard key={b.id} bounty={b} />
                ))}
              </section>
            ) : (
              !error && (
                <EmptyState
                  title={
                    filtered
                      ? "No quests match those filters."
                      : "No quests right now."
                  }
                  body={
                    filtered
                      ? "Try another search, category or availability."
                      : "Funded quests appear here after chain confirmation. Check back for new work."
                  }
                  action={
                    <Button
                      variant="secondary"
                      onClick={filtered ? reset : () => void load()}
                    >
                      {filtered ? "Reset discovery" : "Refresh quests"}
                    </Button>
                  }
                />
              )
            )}
            {hasMore && (
              <div className="discovery-pagination">
                <Button
                  variant="secondary"
                  pending={morePending}
                  onClick={more}
                >
                  Load more quests
                </Button>
              </div>
            )}
          </>
        )}
        <aside className="discovery-network-note">
          <strong>Solana Devnet · Test SOL only.</strong>
          <p>
            Payment requires requester approval. Rejected or expired work may
            remain unpaid. Connecting and linking a wallet is required before
            claiming; browsing is open to everyone.
          </p>
        </aside>
      </div>
    </Enter>
  );
}
