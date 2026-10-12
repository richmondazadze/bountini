// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  authenticated: true,
  loading: false,
  role: "requester",
  rolePending: false,
  roleError: "",
  switchRole: vi.fn(),
  wallet: null as null | {
    account: { address: string };
    connector: { id: string; name: string };
    signMessage: (bytes: Uint8Array) => Promise<Uint8Array>;
  },
}));
vi.mock("@solana/react-hooks", () => ({
  useWalletConnection: () => ({
    wallet: m.wallet,
    connectors: [],
    status: "connected",
    disconnect: vi.fn(),
    connect: vi.fn(),
  }),
}));
vi.mock("../src/components/account-provider", () => ({
  useAccount: () => ({
    me: m.authenticated
      ? {
          user: { id: "test-user", name: "Test" },
          profile: { activeRole: m.role },
        }
      : null,
    loading: m.loading,
    switchRole: m.switchRole,
    rolePending: m.rolePending,
    roleError: m.roleError,
    roleNotice: "",
  }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("../src/components/ui", () => ({
  Button: ({ children, variant, size, pending, ...props }: any) => (
    <button {...props} disabled={props.disabled || pending}>
      {children}
    </button>
  ),
  Dialog: ({ children, open }: React.PropsWithChildren<{ open: boolean }>) =>
    open ? <div>{children}</div> : null,
  Icon: () => null,
  Banner: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
import { Header } from "../src/components/header";
let root: Root, host: HTMLDivElement;
const wallet = (address: string) => ({
  account: { address },
  connector: { id: "test", name: "Test wallet" },
  signMessage: vi.fn(async () => new Uint8Array(64)),
});
beforeEach(() => {
  m.authenticated = true;
  m.loading = false;
  m.role = "requester";
  m.rolePending = false;
  m.roleError = "";
  m.switchRole.mockClear();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function render() {
  await act(async () => root.render(<Header />));
}
async function open() {
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>('[aria-label="Open workspace menu"]')!
      .click(),
  );
  await act(async () =>
    [...host.querySelectorAll("button")]
      .find(
        (b) =>
          b.textContent === "Connect wallet" || b.textContent?.includes("…"),
      )!
      .click(),
  );
}
it("ignores an old session response and clears the session when the connected account changes", async () => {
  let finish!: (r: Response) => void;
  const fetcher = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockImplementation(async (_path, init) =>
      Response.json(
        init?.method === "DELETE"
          ? { signedOut: true }
          : { wallet: "AAAA1111" },
      ),
    );
  vi.stubGlobal("fetch", fetcher);
  m.wallet = wallet("AAAA1111");
  await render();
  m.wallet = wallet("BBBB2222");
  await render();
  await act(async () => finish(Response.json({ wallet: "AAAA1111" })));
  await open();
  expect(host.textContent).toContain("BBBB2222");
  expect(host.textContent).toContain("Link wallet");
  expect(host.textContent).not.toContain(
    "Wallet linked and verified for escrow",
  );
  expect(
    fetcher.mock.calls.filter(([, init]) => init?.method === "DELETE"),
  ).toHaveLength(1);
});
it("clears an old sign-in that finishes after switching accounts", async () => {
  let signed!: (signature: Uint8Array<ArrayBuffer>) => void;
  const first = wallet("AAAA1111");
  first.signMessage.mockImplementation(
    () =>
      new Promise((resolve) => {
        signed = resolve;
      }),
  );
  let authenticated = "none";
  const fetcher = vi.fn(async (path: string, init?: RequestInit) => {
    if (path.endsWith("challenge"))
      return Response.json({ id: "challenge", message: "sign-in" });
    if (path.endsWith("verify")) {
      authenticated = "AAAA1111";
      return Response.json({ wallet: authenticated });
    }
    if (init?.method === "DELETE") {
      authenticated = "none";
      return Response.json({ signedOut: true });
    }
    return Response.json({ wallet: authenticated });
  });
  vi.stubGlobal("fetch", fetcher);
  m.wallet = first;
  await render();
  await open();
  await act(async () =>
    Array.from(host.querySelectorAll("button"))
      .find((b) => b.textContent === "Link wallet")!
      .click(),
  );
  m.wallet = wallet("BBBB2222");
  await render();
  await act(async () => signed(new Uint8Array(64)));
  expect(authenticated).toBe("none");
  expect(host.textContent).toContain("BBBB2222");
  expect(host.textContent).not.toContain(
    "Wallet linked and verified for escrow",
  );
});

it("hides the connector selector from guests even when a wallet is already connected", async () => {
  m.authenticated = false;
  m.wallet = wallet("AAAA1111");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ error: "Sign in" }, { status: 401 })),
  );
  await render();
  expect(host.querySelector("select")).toBeNull();
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>('[aria-label="Open workspace menu"]')!
      .click(),
  );
  expect(host.textContent).not.toContain("Connect wallet");
  expect(host.textContent).not.toContain("Link wallet");
  expect(host.textContent).toContain("Sign in");
});

it("uses the persisted role for navigation and disables concurrent mode changes", async () => {
  m.role = "worker";
  m.rolePending = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ error: "Sign in" }, { status: 401 })),
  );
  await render();
  expect(
    host.querySelector("header select")?.getAttribute("disabled"),
  ).not.toBeNull();
  expect(host.querySelector("header nav")?.textContent).toContain("My work");
  expect(host.querySelector("header nav")?.textContent).not.toContain(
    "Create a quest",
  );
  m.rolePending = false;
  await render();
  await act(async () => {
    const select = host.querySelector("select")!;
    select.value = "requester";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(m.switchRole).toHaveBeenCalledWith("requester");
});
it("announces a failed role save while keeping the previous navigation", async () => {
  m.roleError = "Network unavailable";
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ error: "Sign in" }, { status: 401 })),
  );
  await render();
  expect(host.querySelector("[role=alert]")?.textContent).toContain(
    "Network unavailable",
  );
  expect(host.querySelector<HTMLSelectElement>("header select")?.value).toBe(
    "requester",
  );
  expect(host.querySelector("header nav")?.textContent).toContain("My quests");
});
it("does not expose workspace or wallet actions while the account is loading", async () => {
  m.loading = true;
  m.wallet = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ error: "Sign in" }, { status: 401 })),
  );
  await render();
  expect(host.querySelector("header select")).toBeNull();
  expect(
    host.querySelector("header [role=status]")?.getAttribute("aria-label"),
  ).toBe("Checking your account");
});
