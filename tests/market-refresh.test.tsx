// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("../src/components/header", () => ({ api: m.api }));
vi.mock("@solana/react-hooks", () => ({
  useWalletConnection: () => ({ wallet: null }),
}));
vi.mock("../src/components/account-provider", () => ({
  useAccount: () => ({ me: null }),
}));
vi.mock("../src/components/ui", () => ({
  Enter: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Banner: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
    pending,
  }: React.PropsWithChildren<{ onClick: () => void; pending: boolean }>) => (
    <button disabled={pending} onClick={onClick}>
      {children}
    </button>
  ),
  Icon: () => null,
  Badge: () => null,
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
      .find((b) => b.textContent === "Load more quests")!
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
