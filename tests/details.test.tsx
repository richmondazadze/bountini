// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  actor: "worker",
  walletReady: true,
  account: true,
  userId: "qa",
  linked: null as string[] | null,
  rpcSend: vi.fn(),
  api: vi.fn(),
  prepare: vi.fn(),
  sign: vi.fn(),
}));
vi.mock("@solana/react-hooks", () => ({
  useWalletConnection: () => ({
    wallet: mocks.actor ? { account: { address: mocks.actor } } : null,
  }),
  useSolanaClient: () => ({
    transaction: { prepare: mocks.prepare, sign: mocks.sign },
  }),
}));
vi.mock("../src/components/account-provider", () => ({
  useAccount: () => ({
    me: mocks.account
      ? {
          user: { id: mocks.userId },
          wallets: (mocks.linked || [mocks.actor]).map((wallet) => ({
            wallet,
          })),
        }
      : null,
  }),
}));
vi.mock("../src/components/wallet-access", () => ({
  useWalletAccess: () => mocks.walletReady,
}));
vi.mock("../src/chain/network", () => ({
  devnetRpc: async () => ({ sendTransaction: () => ({ send: mocks.rpcSend }) }),
}));
vi.mock("@solana/kit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@solana/kit")>()),
  getSignatureFromTransaction: () => "known-signature",
  getBase64EncodedWireTransaction: () => "wire",
}));
vi.mock("../src/components/workroom", () => ({ Workroom: () => null }));
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
  Dialog: ({ open, children }: React.PropsWithChildren<{ open: boolean }>) =>
    open ? <div role="dialog">{children}</div> : null,
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
  mocks.walletReady = true;
  mocks.account = true;
  mocks.userId = "qa";
  mocks.linked = null;
  mocks.rpcSend.mockReset();
  mocks.prepare.mockReset();
  mocks.sign.mockReset();
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
async function mount(review = true) {
  await act(async () =>
    root.render(<Details id={String(bounty.id)} review={review} />),
  );
}
async function tick() {
  await act(async () => vi.advanceTimersByTimeAsync(5000));
}
it("shows confirmed revision instructions and preserves the worker's local draft during refresh", async () => {
  localStorage.setItem("bountini.submission.v2:quest:qa", "Work in progress");
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
it("clears an old private draft when the new session cannot access it", async () => {
  mocks.actor = "requester";
  bounty.status = "draft";
  await mount();
  expect(host.textContent).toContain("Original brief");
  mocks.actor = "outsider";
  mocks.api.mockRejectedValue(new Error("This draft is private"));
  await act(async () => root.render(<Details id="quest" review />));
  expect(host.textContent).not.toContain("Original brief");
  expect(host.textContent).toContain("This draft is private");
});

it("freezes the summary before signing and preserves a submission after a rejected signature", async () => {
  process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID =
    "11111111111111111111111111111111";
  localStorage.setItem(
    "bountini.submission.v2:quest:qa",
    "Completed private work",
  );
  const frozen = {
    id: "frozen",
    contentHash: "hash",
    manifest: {
      format: "bountini-deliverables-v1",
      bountyId: "quest",
      version: 0,
      writtenResponse: "Completed private work",
      links: [],
      attachments: [],
    },
  };
  const previous = mocks.api.getMockImplementation()!;
  mocks.api.mockImplementation(async (path: string, options?: RequestInit) => {
    if (path.endsWith("/prepare")) return frozen;
    if (path === "/api/auth/session") return { wallet: "worker" };
    if (path.endsWith("/operations") && options?.method === "POST")
      return {
        operationId: "op",
        lifetime: {
          blockhash: "11111111111111111111111111111111",
          lastValidBlockHeight: "123",
        },
        instruction: {
          programAddress: "11111111111111111111111111111111",
          accounts: [],
          data: [],
        },
      };
    if (path === "/api/operations/op")
      return { operation: { status: "rejected" } };
    return previous(path, options);
  });
  mocks.prepare.mockResolvedValue({});
  mocks.sign.mockRejectedValue(new Error("User rejected signature"));
  await mount();
  const click = async (label: string) => {
    await act(async () =>
      Array.from(host.querySelectorAll("button"))
        .find((b) => b.textContent === label)!
        .click(),
    );
  };
  await click("Review submission summary");
  expect(host.querySelector('[role="dialog"]')!.textContent).toContain(
    "Manifest SHA-256: hash",
  );
  expect(mocks.sign).not.toHaveBeenCalled();
  await click("Confirm & open wallet");
  expect(host.textContent).toContain("User rejected signature");
  expect(host.querySelector<HTMLTextAreaElement>("#submission")!.value).toBe(
    "Completed private work",
  );
  const call = mocks.api.mock.calls.find(
    ([path, options]) =>
      path.endsWith("/operations") && options?.method === "POST",
  )!;
  expect(JSON.parse(call[1].body)).toEqual({
    action: "submit",
    manifestId: "frozen",
  });
  expect(mocks.api).toHaveBeenCalledWith(
    "/api/operations/op",
    expect.objectContaining({ body: JSON.stringify({ status: "rejected" }) }),
  );
  await click("Review submission summary");
  expect(host.querySelector('[role="dialog"]')).not.toBeNull();
});

it("discards a pending summary response when wallet access is lost", async () => {
  process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID =
    "11111111111111111111111111111111";
  localStorage.setItem("bountini.submission.v2:quest:qa", "Completed work");
  let finish!: (value: unknown) => void;
  const previous = mocks.api.getMockImplementation()!;
  mocks.api.mockImplementation((path: string, options?: RequestInit) =>
    path.endsWith("/prepare")
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : previous(path, options),
  );
  await mount();
  await act(async () =>
    Array.from(host.querySelectorAll("button"))
      .find((b) => b.textContent === "Review submission summary")!
      .click(),
  );
  mocks.walletReady = false;
  await act(async () => root.render(<Details id="quest" review />));
  await act(async () =>
    finish({ id: "stale", contentHash: "stale", manifest: {} }),
  );
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(mocks.sign).not.toHaveBeenCalled();
});

async function click(label: string) {
  await act(async () =>
    [...host.querySelectorAll<HTMLButtonElement>("button")]
      .find((b) => b.textContent === label)!
      .click(),
  );
}
async function claimDialog() {
  await click("Claim this quest");
  expect(mocks.sign).not.toHaveBeenCalled();
  expect(
    [...host.querySelectorAll<HTMLButtonElement>("button")].find(
      (b) => b.textContent === "Confirm & open wallet",
    )?.disabled,
  ).toBe(true);
  await act(async () =>
    host.querySelector<HTMLInputElement>(".qd-claim-consent input")!.click(),
  );
}
function prepareClaim() {
  bounty = { ...bounty, status: "open", worker: null, deadline: null };
  process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID =
    "11111111111111111111111111111111";
  const original = mocks.api.getMockImplementation()!;
  mocks.api.mockImplementation(async (path: string, options?: RequestInit) => {
    if (path === "/api/auth/session") return { wallet: mocks.actor };
    if (path.endsWith("/operations") && options?.method === "POST")
      return {
        operationId: "op",
        lifetime: {
          blockhash: "11111111111111111111111111111111",
          lastValidBlockHeight: "123",
        },
        instruction: {
          programAddress: "11111111111111111111111111111111",
          accounts: [],
          data: [],
        },
      };
    if (path === "/api/operations/op")
      return { operation: { status: "unknown", signature: "known-signature" } };
    return original(path, options);
  });
  mocks.prepare.mockResolvedValue({});
}
it("shows contextual guest continuation and requests no private materials on public details", async () => {
  mocks.account = false;
  mocks.actor = "";
  mocks.walletReady = false;
  bounty = {
    ...bounty,
    id: "416c7575-1325-4fac-ad0c-6fdf79a20027",
    status: "open",
    worker: null,
  };
  await mount(false);
  const href = host.querySelector(".qd-ready-step a")?.getAttribute("href");
  expect(href).toBe(
    "/account?next=%2Fbounties%2F416c7575-1325-4fac-ad0c-6fdf79a20027&role=worker",
  );
  expect(host.querySelector("h1")?.textContent).toBe(bounty.title);
  expect(
    mocks.api.mock.calls.some(([path]) =>
      /\/(messages|attachments|submissions|feedback)$/.test(path),
    ),
  ).toBe(false);
  expect(host.textContent).not.toContain(
    "Open authorized participant materials",
  );
});
it("prevents self claim across every linked wallet on the requester account", async () => {
  bounty = { ...bounty, status: "open", worker: null };
  mocks.linked = ["requester", "worker"];
  await mount(false);
  expect(host.textContent).toContain(
    "This is your quest. You cannot claim it.",
  );
  expect(
    [...host.querySelectorAll("button")].some(
      (b) => b.textContent === "Claim this quest",
    ),
  ).toBe(false);
});
it("offers contextual explicit wallet guidance without preparing a transaction", async () => {
  bounty = { ...bounty, status: "open", worker: null };
  mocks.walletReady = false;
  const listener = vi.fn();
  window.addEventListener("bountini-open-wallet", listener);
  await mount(false);
  expect(listener).not.toHaveBeenCalled();
  await click("Verify or change wallet");
  expect(listener).toHaveBeenCalledOnce();
  expect(mocks.prepare).not.toHaveBeenCalled();
  expect(mocks.sign).not.toHaveBeenCalled();
  window.removeEventListener("bountini-open-wallet", listener);
});
it("preserves the agreement after a rejected claim signature without showing success", async () => {
  prepareClaim();
  mocks.sign.mockRejectedValue(new Error("User rejected signature"));
  await mount(false);
  await claimDialog();
  await click("Confirm & open wallet");
  expect(host.textContent).toContain("Signing was declined");
  expect(host.textContent).toContain("Original brief");
  expect(host.textContent).not.toContain("Request confirmed");
  expect(mocks.rpcSend).not.toHaveBeenCalled();
  expect(mocks.api).toHaveBeenCalledWith(
    "/api/operations/op",
    expect.objectContaining({ body: JSON.stringify({ status: "rejected" }) }),
  );
});
it("persists the signature before broadcast and checks unknown confirmation before permitting another claim", async () => {
  prepareClaim();
  mocks.sign.mockResolvedValue({});
  mocks.rpcSend.mockImplementation(async () => {
    expect(
      JSON.parse(localStorage.getItem("bountini.operation.quest")!),
    ).toMatchObject({ status: "submitting", signature: "known-signature" });
    throw new Error("RPC response lost");
  });
  await mount(false);
  await claimDialog();
  await click("Confirm & open wallet");
  expect(host.textContent).toContain("Confirmation is not yet known");
  expect(
    [...host.querySelectorAll<HTMLButtonElement>("button")].find(
      (b) => b.textContent === "Claim this quest",
    )?.disabled,
  ).toBe(true);
  expect(host.textContent).not.toContain("Request confirmed");
  const previous = mocks.api.getMockImplementation()!;
  mocks.api.mockImplementation(async (path: string, options?: RequestInit) => {
    if (path === "/api/operations/op" && !options?.method) {
      bounty = {
        ...bounty,
        status: "in-progress",
        worker: "worker",
        deadline: Math.floor(Date.now() / 1000) + 1800,
      };
      return {
        operation: { status: "confirmed", signature: "known-signature" },
      };
    }
    return previous(path, options);
  });
  await click("Check confirmation");
  expect(host.textContent).toContain("Request confirmed");
  expect(host.textContent).toContain("In progress");
  expect(
    mocks.api.mock.calls.filter(
      ([p, o]) => p.endsWith("/operations") && o?.method === "POST",
    ),
  ).toHaveLength(1);
});
it("does not broadcast a signed claim after a wallet change", async () => {
  prepareClaim();
  let finish!: (v: unknown) => void;
  mocks.sign.mockImplementation(() => new Promise((r) => (finish = r)));
  await mount(false);
  await claimDialog();
  await click("Confirm & open wallet");
  mocks.actor = "other-wallet";
  await mount(false);
  await act(async () => finish({}));
  expect(mocks.rpcSend).not.toHaveBeenCalled();
  expect(host.querySelector("[role=dialog]")).toBeNull();
  expect(host.textContent).not.toContain("Request confirmed");
});
it("does not broadcast a signed claim after an account change", async () => {
  prepareClaim();
  let finish!: (v: unknown) => void;
  mocks.sign.mockImplementation(() => new Promise((r) => (finish = r)));
  await mount(false);
  await claimDialog();
  await click("Confirm & open wallet");
  mocks.userId = "other-account";
  await mount(false);
  await act(async () => finish({}));
  expect(mocks.rpcSend).not.toHaveBeenCalled();
  expect(host.textContent).not.toContain("Request confirmed");
});
it("does not apply a recovery response to a different wallet identity", async () => {
  const finishes: ((v: unknown) => void)[] = [];
  const previous = mocks.api.getMockImplementation()!;
  mocks.api.mockImplementation((path: string, options?: RequestInit) => {
    if (path === "/api/bounties/quest/operations")
      return Promise.resolve({
        operations:
          mocks.actor === "worker" ? [{ id: "op", status: "unknown" }] : [],
      });
    if (path === "/api/operations/op")
      return new Promise((r) => finishes.push(r));
    return previous(path, options);
  });
  await mount(false);
  await click("Check confirmation");
  mocks.actor = "other-wallet";
  await mount(false);
  await act(async () => finishes[0]({ operation: { status: "confirmed" } }));
  expect(host.textContent).not.toContain("Request confirmed");
});
it("shows expiry exactly at the deadline and preserves terminal states as read-only", async () => {
  mocks.actor = "requester";
  bounty = {
    ...bounty,
    status: "in-review",
    deadline: Math.floor(Date.now() / 1000) + 1,
  };
  await mount(false);
  expect(host.textContent).not.toContain("Refund expired quest");
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  expect(host.textContent).toContain("Refund expired quest");
  bounty = { ...bounty, status: "paid" };
  await tick();
  expect(host.textContent).toContain("Payment confirmed");
  expect(host.textContent).not.toContain("Refund expired quest");
  expect(host.textContent).not.toContain("Claim this quest");
});
it("shows draft funding without implying a funded agreement, and keeps cancellation and withdrawal actions", async () => {
  process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID =
    "11111111111111111111111111111111";
  mocks.actor = "requester";
  bounty = { ...bounty, status: "draft", worker: null };
  await mount(false);
  expect(host.textContent).toContain("Draft brief");
  expect(host.textContent).toContain("Fund this quest");
  expect(host.textContent).not.toContain("The funded agreement");
  bounty = { ...bounty, status: "open" };
  await tick();
  expect(host.textContent).toContain("Cancel and refund");
  mocks.actor = "worker";
  bounty = { ...bounty, status: "in-progress", worker: "worker" };
  await mount(false);
  expect(host.textContent).toContain("Withdraw and refund requester");
});
it("keeps the public agreement available after a refresh failure", async () => {
  await mount(false);
  mocks.api.mockRejectedValue(new Error("Service unavailable"));
  await act(async () => window.dispatchEvent(new Event("focus")));
  expect(host.textContent).toContain("Original brief");
  expect(host.textContent).toContain("Service unavailable");
});
it("disables an open claim confirmation when a competing claim becomes confirmed", async () => {
  prepareClaim();
  await mount(false);
  await claimDialog();
  bounty = { ...bounty, status: "in-progress", worker: "another-worker" };
  await tick();
  const confirm = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
    (b) => b.textContent === "Confirm & open wallet",
  )!;
  expect(confirm.disabled).toBe(true);
  await act(async () => confirm.click());
  expect(mocks.sign).not.toHaveBeenCalled();
  expect(
    mocks.api.mock.calls.some(
      ([p, o]) => p.endsWith("/operations") && o?.method === "POST",
    ),
  ).toBe(false);
});
it("preserves context when the server rejects a competing claim before preparing a wallet request", async () => {
  prepareClaim();
  const previous = mocks.api.getMockImplementation()!;
  mocks.api.mockImplementation((path: string, options?: RequestInit) => {
    if (path.endsWith("/operations") && options?.method === "POST") {
      bounty = { ...bounty, status: "in-progress", worker: "another-worker" };
      throw new Error("This quest has already been claimed");
    }
    return previous(path, options);
  });
  await mount(false);
  await claimDialog();
  await click("Confirm & open wallet");
  await tick();
  expect(host.textContent).toContain("This quest has already been claimed");
  expect(host.textContent).toContain("Original brief");
  expect(host.textContent).not.toContain("Request confirmed");
  expect(host.textContent).not.toContain("Claim this quest");
  expect(mocks.sign).not.toHaveBeenCalled();
});
