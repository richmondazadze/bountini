"use client";
import { useState } from "react";
import { Button, Dialog } from "../ui";
import {
  EmptyState,
  ExperienceIcon,
  LabeledField,
  StatusNotice,
} from "../experience/primitives";
import { QuestCard } from "./quest-card";
import type { QuestFeed } from "./use-quest-feed";
import "./discovery.css";
const categories = [
  "All categories",
  "Translation",
  "Writing",
  "Community",
  "Development",
];
const states = [
  ["open", "Open quests"],
  ["All states", "All states"],
  ["in-progress", "In progress"],
  ["in-review", "In review"],
  ["revision-requested", "Revision requested"],
  ["paid", "Payment confirmed"],
  ["refunded", "Refund confirmed"],
];
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtered = Boolean(
    query || category !== "All categories" || state !== "open",
  );
  const reset = () => {
    setQuery("");
    setCategory("All categories");
    setState("open");
  };
  const availability = (
    <LabeledField label="Quest status">
      <select value={state} onChange={(e) => setState(e.target.value)}>
        {states.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </LabeledField>
  );
  return (
    <div className="discovery-page">
      <div className="discovery-heading" data-component="ApplicationHeading">
        <p className="eyebrow">Find a contribution</p>
        <h1>Useful work. Clearly scoped.</h1>
        <p>Read the brief. Understand the reward. Choose your next step.</p>
      </div>
      <div className="discovery-search" data-component="DiscoverySearch">
        <LabeledField label="Search quests">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by task or skill"
            maxLength={100}
          />
        </LabeledField>
        <Button
          className="discovery-filter-trigger"
          variant="secondary"
          aria-label="Open filters"
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(true)}
        >
          <ExperienceIcon name="filter" />
        </Button>
      </div>
      <nav
        className="discovery-categories"
        aria-label="Categories"
        data-component="CategoryNavigation"
      >
        {categories.map((c) => (
          <Button
            key={c}
            variant="secondary"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c}
          </Button>
        ))}
      </nav>
      <div className="discovery-layout">
        <div className="discovery-main">
          <div className="discovery-result-summary">
            <h2>
              {states.find(([value]) => value === state)?.[1] || "Quests"}
            </h2>
            <p role="status">
              {loading
                ? "Updating quests…"
                : error
                  ? "Unable to update quests"
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
            </div>
          ) : (
            <>
              {error && (
                <StatusNotice title="Quests could not be updated" tone="danger">
                  {error} Your search and filters are preserved.
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void (feed.paginationError ? more() : load())
                    }
                  >
                    {feed.paginationError
                      ? "Retry loading more"
                      : "Retry loading"}
                  </Button>
                </StatusNotice>
              )}
              {bounties.length ? (
                <section
                  aria-label="Quest results"
                  className="discovery-results"
                >
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
                        : "No open quests right now."
                    }
                    body={
                      filtered
                        ? "Try another search, category or quest status."
                        : "There is no available work to claim in this view. Check back for new quests or view other states."
                    }
                    action={
                      <div className="discovery-empty-actions">
                        <Button
                          variant="secondary"
                          onClick={
                            filtered ? reset : () => setState("All states")
                          }
                        >
                          {filtered ? "Reset discovery" : "View other states"}
                        </Button>
                        {!filtered && (
                          <Button variant="quiet" onClick={() => void load()}>
                            Refresh quests
                          </Button>
                        )}
                      </div>
                    }
                  />
                )
              )}
              {hasMore && !feed.paginationError && (
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
        </div>
        <aside className="discovery-context">
          <section
            className="discovery-filters"
            aria-label="Quest filters"
            data-component="DiscoveryFilters"
          >
            <h2>Refine this view</h2>
            {availability}
            {filtered && (
              <Button variant="quiet" onClick={reset}>
                Reset discovery
              </Button>
            )}
          </section>
          <div className="discovery-network-note">
            <ExperienceIcon name="quest" size={24} />
            <h2>Choose a brief you understand.</h2>
            <p>
              One contributor. Fixed requirements. Payment needs requester
              approval.
            </p>
            <p>Rejected or expired work may remain unpaid.</p>
            <strong>Solana Devnet · Test SOL only.</strong>
            <p>
              Test tokens have no cash value. You can browse without an account
              or wallet.
            </p>
          </div>
        </aside>
      </div>
      <Dialog
        containFocus
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter quests"
      >
        <div
          className="discovery-dialog"
          data-component="MobileFilterDisclosure"
        >
          {availability}
          <Button onClick={() => setFiltersOpen(false)}>Show quests</Button>
          <Button variant="quiet" onClick={reset}>
            Reset filters
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
