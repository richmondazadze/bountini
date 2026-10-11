// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { createClient, type SolanaClient } from "@solana/client";
import { useWalletConnection } from "@solana/react-hooks";
import { afterEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ client: null as SolanaClient | null }));
vi.mock("../src/client/wallet", () => ({
  createBountiniClient: () => m.client,
}));
vi.mock("../src/components/account-provider", () => ({
  AccountProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));
import { Providers } from "../src/components/providers";
afterEach(() => {
  localStorage.clear();
  m.client?.destroy();
});
it.each([
  "metamask",
  JSON.stringify({
    autoconnect: true,
    lastConnectorId: "metamask",
    version: 1,
  }),
])(
  "never reconnects a saved wallet on mount (%s), but allows an explicit click",
  async (saved) => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
    localStorage.setItem("solana:last-connector", saved);
    const connect = vi.fn(async () => ({
      account: {
        address: "11111111111111111111111111111111" as never,
        publicKey: new Uint8Array(32),
      },
      connector: { id: "metamask", name: "MetaMask" },
      disconnect: async () => {},
    }));
    m.client = createClient({
      cluster: "devnet",
      logger: () => {},
      endpoint: "https://api.devnet.solana.com",
      walletConnectors: [
        {
          id: "metamask",
          name: "MetaMask",
          canAutoConnect: true,
          connect,
          disconnect: async () => {},
          isSupported: () => true,
        },
      ],
    });
    function Connect() {
      const { connect } = useWalletConnection();
      return (
        <button onClick={() => void connect("metamask")}>
          Connect intentionally
        </button>
      );
    }
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () =>
        root.render(
          <Providers>
            <Connect />
          </Providers>,
        ),
      );
      expect(connect).not.toHaveBeenCalled();
      await act(async () => host.querySelector("button")!.click());
      expect(connect).toHaveBeenCalledTimes(1);
      expect(connect.mock.calls[0]).toEqual([{}]);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  },
);
