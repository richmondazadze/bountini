// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ api: vi.fn(), userId: null as string | null }));
vi.mock("../src/components/header", () => ({ api: m.api }));
vi.mock("@solana/react-hooks", () => ({
  useWalletConnection: () => ({ wallet: null }),
}));
vi.mock("../src/components/account-provider", () => ({
  useAccount: () => ({ me: m.userId ? { user: { id: m.userId } } : null }),
}));
import { Market } from "../src/components/market";
let root: Root, host: HTMLDivElement;
const page = (start: number, count: number, hasMore: boolean) => ({
  bounties: Array.from({ length: count }, (_, i) => ({
    id: String(start + i),
    title: "Quest " + (start + i),
    status: "open",
    category: "Writing",
    reward: 1,
  })),
  hasMore,
});
beforeEach(() => {
  vi.useFakeTimers();
  m.api.mockReset();
  m.userId = null;
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: true,
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
});
async function start() {
  await act(async () => root.render(<Market />));
  await act(async () => vi.advanceTimersByTimeAsync(250));
}
async function more() {
  await act(async () =>
    [...host.querySelectorAll("button")]
      .find((b) =>
        ["Load more quests", "Retry loading more"].includes(
          b.textContent || "",
        ),
      )!
      .click(),
  );
}
it("resets the complete loaded range and next page after background refresh", async () => {
  m.api
    .mockResolvedValueOnce(page(1, 25, true))
    .mockResolvedValueOnce(page(26, 25, false))
    .mockResolvedValueOnce(page(0, 25, true))
    .mockResolvedValueOnce(page(25, 25, false));
  await start();
  await more();
  expect(host.querySelectorAll("article")).toHaveLength(50);
  await act(async () => vi.advanceTimersByTimeAsync(9750));
  expect(host.querySelectorAll("article")).toHaveLength(25);
  expect(host.querySelectorAll("h3")[0].textContent).toBe("Quest 0");
  await more();
  expect(m.api.mock.calls.at(-1)![0]).toContain("page=1");
  expect(
    new Set([...host.querySelectorAll("h3")].map((n) => n.textContent)).size,
  ).toBe(50);
});
it("discards a load-more response from before a refresh", async () => {
  let finish!: (value: unknown) => void;
  m.api
    .mockResolvedValueOnce(page(1, 25, true))
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce(page(100, 2, false));
  await start();
  await more();
  await act(async () => vi.advanceTimersByTimeAsync(9750));
  await act(async () => finish(page(26, 25, true)));
  expect(host.querySelectorAll("article")).toHaveLength(2);
  expect(host.textContent).not.toContain("Quest 26");
  expect(host.textContent).not.toContain("Load more quests");
});
async function category(value: string) {
  await act(async () =>
    [
      ...host.querySelectorAll<HTMLButtonElement>(
        ".discovery-categories button",
      ),
    ]
      .find((b) => b.textContent === value)!
      .click(),
  );
  await act(async () => vi.advanceTimersByTimeAsync(250));
}
it("keeps guest queries public, carries all filters, and renders loading then real results", async () => {
  m.api
    .mockResolvedValueOnce(page(1, 1, false))
    .mockResolvedValueOnce(page(2, 1, false));
  await act(async () => root.render(<Market />));
  expect(host.textContent).toContain("Loading quests…");
  await act(async () => vi.advanceTimersByTimeAsync(250));
  expect(m.api.mock.calls[0][0]).toContain("mine=false");
  await category("Writing");
  const params = new URL(m.api.mock.calls.at(-1)![0], "http://localhost")
    .searchParams;
  expect(Object.fromEntries(params)).toEqual({
    mine: "false",
    q: "",
    category: "Writing",
    role: "All",
    state: "open",
    page: "0",
  });
  expect(host.querySelectorAll("article")).toHaveLength(1);
  expect(host.textContent).not.toContain("Preview");
});
it("keeps filters after a failure, does not show an empty board, and retries the same query", async () => {
  m.api
    .mockResolvedValueOnce(page(1, 1, false))
    .mockRejectedValueOnce(new Error("Service unavailable"))
    .mockResolvedValueOnce(page(2, 1, false));
  await start();
  await category("Translation");
  expect(host.querySelector("[role=alert]")?.textContent).toContain(
    "Service unavailable",
  );
  expect(
    host.querySelector('.discovery-categories [aria-pressed="true"]')
      ?.textContent,
  ).toBe("Translation");
  expect(host.textContent).not.toContain("No quests");
  await act(async () =>
    [...host.querySelectorAll("button")]
      .find((b) => b.textContent === "Retry loading")!
      .click(),
  );
  expect(m.api.mock.calls.at(-1)![0]).toContain("category=Translation");
  expect(host.querySelector("[role=alert]")).toBeNull();
});
it("distinguishes a successful empty result from an error and can clear all filters", async () => {
  m.api
    .mockResolvedValueOnce(page(0, 0, false))
    .mockResolvedValueOnce(page(0, 0, false))
    .mockResolvedValueOnce(page(1, 1, false));
  await start();
  expect(host.textContent).toContain("No open quests right now.");
  await category("Translation");
  expect(host.textContent).toContain("No quests match those filters.");
  await act(async () =>
    [...host.querySelectorAll("button")]
      .find((b) => b.textContent === "Reset discovery")!
      .click(),
  );
  await act(async () => vi.advanceTimersByTimeAsync(250));
  expect(
    host.querySelector('.discovery-categories [aria-pressed="true"]')
      ?.textContent,
  ).toBe("All categories");
  expect(host.querySelector("select")?.value).toBe("open");
  expect(host.textContent).toContain("Quest 1");
});
it("discards an old query response after filters have changed", async () => {
  let finish!: (value: unknown) => void;
  m.api
    .mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
    .mockResolvedValueOnce(page(100, 1, false));
  await start();
  await category("Writing");
  await act(async () => finish(page(1, 25, true)));
  expect(host.querySelectorAll("article")).toHaveLength(1);
  expect(host.textContent).toContain("Quest 100");
  expect(host.textContent).not.toContain("Quest 1View");
  expect(host.textContent).not.toContain("Load more quests");
});
it("deduplicates overlapping pages and preserves cards after a pagination error", async () => {
  m.api
    .mockResolvedValueOnce(page(1, 2, true))
    .mockRejectedValueOnce(new Error("Page unavailable"))
    .mockResolvedValueOnce(page(2, 2, false));
  await start();
  await more();
  expect(host.querySelectorAll("article")).toHaveLength(2);
  expect(host.querySelector("[role=alert]")?.textContent).toContain(
    "Page unavailable",
  );
  expect(host.textContent).toContain("Retry loading more");
  await more();
  expect(host.querySelectorAll("article")).toHaveLength(3);
  expect(host.textContent).not.toContain("Load more quests");
});

it("discards the previous account's outstanding feed response", async () => {
  let finish!: (value: unknown) => void;
  m.userId = "previous-account";
  m.api
    .mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
    .mockResolvedValueOnce(page(90, 1, false));
  await start();
  m.userId = "current-account";
  await act(async () => root.render(<Market />));
  await act(async () => vi.advanceTimersByTimeAsync(250));
  await act(async () => finish(page(1, 25, true)));
  expect(host.querySelectorAll("article")).toHaveLength(1);
  expect(host.querySelector("h3")?.textContent).toBe("Quest 90");
  expect(host.textContent).not.toContain("Load more quests");
});
it("allows other states and restores Open quests on reset", async () => {
  m.api.mockResolvedValue(page(1, 1, false));
  await start();
  await act(async () => {
    const select = host.querySelector<HTMLSelectElement>("select")!;
    select.value = "paid";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async () => vi.advanceTimersByTimeAsync(250));
  expect(m.api.mock.calls.at(-1)![0]).toContain("state=paid");
  await act(async () =>
    [...host.querySelectorAll<HTMLButtonElement>("button")]
      .find((b) => b.textContent === "Reset filters")!
      .click(),
  );
  await act(async () => vi.advanceTimersByTimeAsync(250));
  expect(m.api.mock.calls.at(-1)![0]).toContain("state=open");
});
it("applies a supported landing category on load and follows history without losing existing feed guards", async () => {
  history.replaceState(null, "", "/discover?category=Development");
  m.api.mockResolvedValue(page(1, 1, false));
  await start();
  expect(
    new URLSearchParams(m.api.mock.calls.at(-1)![0].split("?")[1]).get(
      "category",
    ),
  ).toBe("Development");
  expect(
    host.querySelector('.discovery-categories button[aria-pressed="true"]')
      ?.textContent,
  ).toBe("Development");
  await category("Translation");
  expect(location.search).toContain("category=Translation");
  history.replaceState(null, "", "/discover?category=Design");
  await act(async () => window.dispatchEvent(new PopStateEvent("popstate")));
  await act(async () => vi.advanceTimersByTimeAsync(250));
  expect(
    new URLSearchParams(m.api.mock.calls.at(-1)![0].split("?")[1]).get(
      "category",
    ),
  ).toBe("All categories");
  history.replaceState(null, "", "/");
});
it("clears the landing category URL when resetting discovery", async () => {
  history.replaceState(null, "", "/discover?category=Writing");
  m.api.mockResolvedValue(page(1, 0, false));
  await start();
  await category("All categories");
  expect(new URLSearchParams(location.search).has("category")).toBe(false);
  history.replaceState(null, "", "/");
});
