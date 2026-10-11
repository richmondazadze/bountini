// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ account: "one", address: "A" }));
vi.mock("../src/components/account-provider", () => ({
  useAccount: () => ({
    me: m.account
      ? { user: { id: m.account }, wallets: [{ wallet: m.address }] }
      : null,
  }),
}));
vi.mock("@solana/react-hooks", () => ({
  useWalletConnection: () => ({ wallet: { account: { address: m.address } } }),
}));
import { useWalletAccess } from "../src/components/wallet-access";
function Probe() {
  return <span>{useWalletAccess() ? "verified" : "blocked"}</span>;
}
let root: Root, host: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  m.account = "one";
  m.address = "A";
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
it("rejects a late wallet session response after switching accounts", async () => {
  let finish!: (r: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            finish = r;
          }),
      )
      .mockResolvedValue(
        Response.json({ error: "No session" }, { status: 401 }),
      ),
  );
  await act(async () => root.render(<Probe />));
  m.account = "two";
  await act(async () => root.render(<Probe />));
  await act(async () => finish(Response.json({ wallet: "A" })));
  expect(host.textContent).toBe("blocked");
});
it("removes wallet access immediately when account signs out", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ wallet: "A" })),
  );
  await act(async () => root.render(<Probe />));
  expect(host.textContent).toBe("verified");
  m.account = "";
  await act(async () => root.render(<Probe />));
  expect(host.textContent).toBe("blocked");
});
