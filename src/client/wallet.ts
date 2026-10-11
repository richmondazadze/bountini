import {
  autoDiscover,
  createClient,
  type SolanaClient,
  type WalletConnector,
  type WalletSession,
} from "@solana/client";
import {
  signMetaMaskDevnet,
  getMetaMaskProvider,
  type MetaMaskProvider,
} from "./metamask";

export const WALLET_CHAIN = "solana:devnet";

export function createBountiniClient(connectors?: readonly WalletConnector[]) {
  let client: SolanaClient;
  let metamaskProvider: MetaMaskProvider | undefined;
  const wallets =
    connectors ??
    autoDiscover({
      overrides: (wallet) => {
        if (wallet.name.toLowerCase().includes("metamask"))
          metamaskProvider = getMetaMaskProvider(wallet);
        return { defaultChain: WALLET_CHAIN };
      },
    });
  client = createClient({
    cluster: "devnet",
    endpoint:
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
    websocketEndpoint:
      process.env.NEXT_PUBLIC_SOLANA_WS_URL || "wss://api.devnet.solana.com",
    walletConnectors: wallets.map((connector) => ({
      ...connector,
      async connect(options) {
        const original = await connector.connect(options);
        // Client 1.7 updates its internal signing account on change, but leaves
        // session.account and the React store unchanged. Publish both together.
        const subscribe: WalletSession["onAccountsChanged"] =
          original.onAccountsChanged
            ? (listener) =>
                original.onAccountsChanged!((accounts) => {
                  const current = client.store.getState().wallet;
                  if (
                    accounts.length &&
                    current.status === "connected" &&
                    current.session.onAccountsChanged === subscribe
                  ) {
                    client.store.setState((state) => ({
                      ...state,
                      wallet: {
                        ...current,
                        session: { ...current.session, account: accounts[0] },
                      },
                      lastUpdatedAt: Date.now(),
                    }));
                  }
                  listener(accounts);
                })
            : undefined;
        return {
          ...original,
          onAccountsChanged: subscribe,
          ...(connector.name.toLowerCase().includes("metamask")
            ? {
                sendTransaction: undefined,
                signTransaction: async (
                  transaction: Parameters<typeof signMetaMaskDevnet>[0],
                ) => {
                  const current = client.store.getState().wallet;
                  if (
                    current.status !== "connected" ||
                    current.session.onAccountsChanged !== subscribe
                  )
                    throw new Error("Reconnect MetaMask before signing.");
                  return signMetaMaskDevnet(
                    transaction,
                    current.session.account.address,
                    metamaskProvider,
                  );
                },
              }
            : {}),
        };
      },
    })),
  });
  return client;
}
