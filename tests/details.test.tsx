// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ actor: "worker", api: vi.fn() }));
vi.mock("@solana/react-hooks", () => ({
  useWalletConnection: () => ({
    wallet: { account: { address: mocks.actor } },
  }),
  useSolanaClient: () => ({}),
}));
vi.mock("../src/components/header", () => ({ api: mocks.api }));
vi.mock("../src/components/assistance", () => ({
  AdvisoryReview: () => <div>AI advisory</div>,
}));
vi.mock("../src/components/ui", () => ({
  Enter: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Badge: ({ status }: { status: string }) => <span>{status}</span>,
  Banner: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
    disabled,
  }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Dialog: () => null,
  Icon: () => null,
  Countdown: () => null,
  TransactionStatusView: () => null,
}));
import { Details } from "../src/components/details";
let root: Root, host: HTMLDivElement;
let bounty: Record<string, unknown>,
  events: Record<string, unknown>[],
  submissions: { body: string; revision: number }[],
  feedback: Record<string, unknown>[];
beforeEach(() => {
  vi.useFakeTimers();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: true,
  });
  localStorage.clear();
  mocks.actor = "worker";
  bounty = {
    id: "quest",
    title: "Translate announcement",
    description: "Original brief",
    requirements: ["Preserve links"],
    category: "Translation",
    reward: "0.001",
    requester: "requester",
    worker: "worker",
    status: "in-progress",
    deadline: Math.floor(Date.now() / 1000) + 600,
    revisionUsed: false,
    createdAt: new Date().toISOString(),
    requirementsHash: "hash",
  };
  events = [];
  submissions = [];
  feedback = [];
  mocks.api.mockReset().mockImplementation(async (path: string) => {
    if (path.endsWith("/activity")) return { activity: events };
    if (path.endsWith("/operations")) return { operations: [] };
    if (path.endsWith("/submissions")) return { submissions };
    if (path.endsWith("/feedback")) return { feedback };
    return { bounty: { ...bounty }, serverTime: Date.now() };
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
});
async function mount() {
  await act(async () => root.render(<Details id="quest" review />));
}
async function tick() {
  await act(async () => vi.advanceTimersByTimeAsync(5000));
}
it("shows confirmed revision instructions and preserves the worker's local draft during refresh", async () => {
  localStorage.setItem("bountini.submission.quest", "Work in progress");
  await mount();
  bounty = { ...bounty, status: "revision-requested", revisionUsed: true };
  events = [
    {
      action: "revise",
      signature: "revision-receipt",
      updated_at: new Date().toISOString(),
    },
  ];
  feedback = [
    {
      id: "review",
      action: "revise",
      feedback: "Keep the original link and fix the date.",
      signature: "revision-receipt",
      confirmed_at: new Date().toISOString(),
    },
  ];
  await tick();
  expect(host.textContent).toContain(
    "Keep the original link and fix the date.",
  );
  expect(host.textContent).toContain("Submit your revision");
  expect(host.querySelector<HTMLTextAreaElement>("#submission")?.value).toBe(
    "Work in progress",
  );
});
it("refreshes the requester's state after remote submission, and content when a new submission receipt appears", async () => {
  mocks.actor = "requester";
  await mount();
  bounty = { ...bounty, status: "in-review" };
  events = [
    {
      action: "submit",
      signature: "original",
      updated_at: new Date().toISOString(),
    },
  ];
  submissions = [{ body: "Original work", revision: 0 }];
  await tick();
  expect(host.textContent).toContain("Original work");
  submissions = [...submissions, { body: "Corrected work", revision: 1 }];
  events = [
    ...events,
    {
      action: "submit",
      signature: "revised",
      updated_at: new Date().toISOString(),
    },
  ];
  await tick();
  expect(host.textContent).toContain("Corrected work");
});
it("pauses hidden-page requests, resumes on visibility, and stops after settlement", async () => {
  await mount();
  mocks.api.mockClear();
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "hidden",
  });
  await tick();
  expect(mocks.api).not.toHaveBeenCalled();
  bounty = { ...bounty, status: "paid" };
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(host.textContent).toContain("paid");
  mocks.api.mockClear();
  await tick();
  expect(mocks.api).not.toHaveBeenCalled();
});
it("does not request private work or feedback for an unrelated wallet", async () => {
  mocks.actor = "outsider";
  bounty.status = "in-review";
  await mount();
  expect(
    mocks.api.mock.calls.some(([path]) =>
      /\/(feedback|submissions)$/.test(path),
    ),
  ).toBe(false);
});
it("keeps a slow background refresh from starting overlapping requests", async () => {
  await mount();
  let finish!: (value: unknown) => void;
  mocks.api.mockImplementation((path: string) => {
    if (path === "/api/bounties/quest")
      return new Promise((resolve) => {
        finish = resolve;
      });
    if (path.endsWith("/activity")) return Promise.resolve({ activity: [] });
    return Promise.resolve({ operations: [] });
  });
  mocks.api.mockClear();
  await act(async () => vi.advanceTimersByTimeAsync(20000));
  expect(
    mocks.api.mock.calls.filter(([path]) => path === "/api/bounties/quest"),
  ).toHaveLength(1);
  await act(async () => finish({ bounty, serverTime: Date.now() }));
});
it("reloads private feedback after authentication changes with the same connected wallet", async () => {
  bounty.status = "revision-requested";
  mocks.api.mockImplementation(async (path: string) => {
    if (path.endsWith("/feedback")) throw new Error("Sign in again");
    if (path.endsWith("/activity")) return { activity: [] };
    if (path.endsWith("/operations")) return { operations: [] };
    return { bounty, serverTime: Date.now() };
  });
  await mount();
  expect(host.textContent).toContain("Sign in again");
  mocks.api.mockImplementation(async (path: string) => {
    if (path.endsWith("/feedback"))
      return {
        feedback: [
          {
            id: "review",
            action: "revise",
            feedback: "Restore the original date",
            signature: "receipt",
            confirmed_at: new Date().toISOString(),
          },
        ],
      };
    if (path.endsWith("/activity")) return { activity: [] };
    if (path.endsWith("/operations")) return { operations: [] };
    return { bounty, serverTime: Date.now() };
  });
  await act(async () => {
    window.dispatchEvent(new Event("bountini-auth-change"));
  });
  expect(host.textContent).toContain("Restore the original date");
  expect(host.textContent).not.toContain("Sign in again");
});
