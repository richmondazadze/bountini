// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
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
    me: { user: { id: "test-user", name: "Test" } },
    loading: false,
  }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("../src/components/ui", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
    <button onClick={onClick} disabled={disabled}>
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
    host.querySelector<HTMLButtonElement>("header button")!.click(),
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
