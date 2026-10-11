import { expect, it, vi, beforeEach, afterEach } from "vitest";
import { createWalletStandardConnector } from "@solana/client";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import {
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  address,
  blockhash,
} from "@solana/kit";
import { createBountiniClient, WALLET_CHAIN } from "../src/client/wallet";
beforeEach(() => {
  vi.stubGlobal("window", {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        jsonrpc: "2.0",
        id: 1,
        result: {
          context: { slot: 1 },
          value: {
            blockhash: "11111111111111111111111111111111",
            lastValidBlockHeight: 100,
          },
        },
      }),
    ),
  );
});
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const first: WalletAccount = {
    address: "11111111111111111111111111111111",
    publicKey: new Uint8Array(32),
    chains: ["solana:mainnet", "solana:devnet"],
    features: ["solana:signMessage", "solana:signTransaction"],
  };
  const second: WalletAccount = {
    ...first,
    address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  };
  let changed!: (event: { accounts: readonly WalletAccount[] }) => void;
  const signMessage = vi.fn(
    async ({ message }: { message: Uint8Array; account: WalletAccount }) => [
      { signature: new Uint8Array(64), signedMessage: message },
    ],
  );
  const signTransaction = vi.fn(
    async ({
      transaction,
    }: {
      transaction: Uint8Array;
      account: WalletAccount;
      chain?: string;
    }) => [{ signedTransaction: transaction }],
  );
  const wallet = {
    version: "1.0.0",
    name: "Test wallet",
    icon: "data:image/svg+xml;base64,PHN2Zy8+",
    accounts: [first],
    chains: first.chains,
    features: {
      "standard:connect": {
        version: "1.0.0",
        connect: async () => ({ accounts: [first] }),
      },
      "standard:disconnect": { version: "1.0.0", disconnect: async () => {} },
      "standard:events": {
        version: "1.0.0",
        on: (_event: string, listener: typeof changed) => {
          changed = listener;
          return () => {};
        },
      },
      "solana:signMessage": { version: "1.0.0", signMessage },
      "solana:signTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: [0, "legacy"],
        signTransaction,
      },
    },
  } as unknown as Wallet;
  const connector = createWalletStandardConnector(wallet, {
    defaultChain: WALLET_CHAIN,
  });
  const client = createBountiniClient([connector]);
  return {
    client,
    connector,
    first,
    second,
    signMessage,
    signTransaction,
    change: (accounts: readonly WalletAccount[]) => changed({ accounts }),
  };
}
it("publishes the new account to React's store and signs with that same account", async () => {
  const f = fixture();
  await f.client.actions.connectWallet(f.connector.id);
  f.change([f.second]);
  const current = f.client.store.getState().wallet;
  expect(current.status).toBe("connected");
  if (current.status !== "connected") throw new Error("Not connected");
  expect(current.session.account.address).toBe(f.second.address);
  await current.session.signMessage!(new Uint8Array([1]));
  expect(f.signMessage.mock.calls[0][0].account.address).toBe(f.second.address);
  f.client.destroy();
});
it("passes Devnet to wallet simulation even when the wallet lists mainnet first", async () => {
  const f = fixture();
  await f.client.actions.connectWallet(f.connector.id);
  const current = f.client.store.getState().wallet;
  if (current.status !== "connected") throw new Error("Not connected");
  const message = appendTransactionMessageInstructions(
    [],
    setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: blockhash("11111111111111111111111111111111"),
        lastValidBlockHeight: 100n,
      },
      setTransactionMessageFeePayer(
        address(f.first.address),
        createTransactionMessage({ version: 0 }),
      ),
    ),
  );
  await current.session.signTransaction!(
    compileTransaction(message) as unknown as Parameters<
      NonNullable<typeof current.session.signTransaction>
    >[0],
  );
  expect(f.signTransaction.mock.calls[0][0].chain).toBe("solana:devnet");
  f.client.destroy();
});
it("disconnects on an empty account event", async () => {
  const f = fixture();
  await f.client.actions.connectWallet(f.connector.id);
  f.change([]);
  await vi.waitFor(() =>
    expect(f.client.store.getState().wallet.status).toBe("disconnected"),
  );
  f.client.destroy();
});
