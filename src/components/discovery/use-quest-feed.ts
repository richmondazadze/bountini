"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { useAccount } from "../account-provider";
import type { Bounty } from "@/domain/bounty";
import { api } from "../header";
/** Existing live query contract; generation guards cover filters, identity and polling. */
export function useQuestFeed({
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
  const refreshing = useRef(false);
  const moreSequence = useRef(0);
  const moreLock = useRef<number | null>(null);
  const load = useCallback(
    async (quiet = false) => {
      const sequence = ++loadSequence.current;
      refreshing.current = true;
      moreSequence.current++;
      moreLock.current = null;
      setMorePending(false);
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
          { cache: "no-store" },
        );
        if (sequence !== loadSequence.current) return;
        setBounties(r.bounties);
        setHasMore(r.hasMore);
        setPage(0);
      } catch (e) {
        if (sequence === loadSequence.current)
          setError(e instanceof Error ? e.message : "Unable to load quests");
      } finally {
        if (sequence === loadSequence.current) {
          refreshing.current = false;
          setLoading(false);
        }
      }
    },
    [mine, query, category, view, state, me?.user.id],
  );
  useEffect(() => {
    setLoading(true);
    setHasMore(false);
    setMorePending(false);
    moreSequence.current++;
    refreshing.current = false;
    const debounce = setTimeout(() => void load(), 250);
    const refresh = () => void load();
    window.addEventListener("bountini-auth-change", refresh);
    return () => {
      loadSequence.current++;
      moreSequence.current++;
      moreLock.current = null;
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
  async function more() {
    if (refreshing.current || moreLock.current !== null) return;
    const sequence = loadSequence.current;
    const moreVersion = ++moreSequence.current;
    moreLock.current = moreVersion;
    const nextPage = page + 1;
    setMorePending(true);
    setError("");
    try {
      const params = new URLSearchParams({
        mine: String(mine),
        q: query,
        category,
        role: mine ? view : "All",
        state,
        page: String(nextPage),
      });
      const r = await api<{ bounties: Bounty[]; hasMore: boolean }>(
        `/api/bounties?${params}`,
        { cache: "no-store" },
      );
      if (sequence !== loadSequence.current) return;
      setBounties((previous) => [
        ...previous,
        ...r.bounties.filter((next) => !previous.some((b) => b.id === next.id)),
      ]);
      setHasMore(r.hasMore);
      setPage(nextPage);
    } catch (e) {
      if (sequence === loadSequence.current)
        setError(e instanceof Error ? e.message : "Unable to load more quests");
    } finally {
      if (moreSequence.current === moreVersion) {
        moreLock.current = null;
        setMorePending(false);
      }
    }
  }
  return {
    bounties,
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
  };
}
export type QuestFeed = ReturnType<typeof useQuestFeed>;
