import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  address,
  blockhash,
  compileTransaction,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  getBase64EncodedWireTransaction,
} from "@solana/kit";
import {
  signMetaMaskDevnet,
  METAMASK_DEVNET_SCOPE,
} from "../src/client/metamask";
const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  getSession: vi.fn(),
  invokeMethod: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@metamask/connect-solana", () => ({
  createSolanaClient: mocks.create,
}));
const account = "11111111111111111111111111111111";
const tx = compileTransaction(
  setTransactionMessageLifetimeUsingBlockhash(
    { blockhash: blockhash(account), lastValidBlockHeight: 100n },
    setTransactionMessageFeePayer(
      address(account),
      createTransactionMessage({ version: 0 }),
    ),
  ),
) as unknown as Parameters<typeof signMetaMaskDevnet>[0];
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("window", { location: { origin: "https://bountini.us" } });
  mocks.create.mockResolvedValue({
    core: {
      connect: mocks.connect,
      provider: { getSession: mocks.getSession },
      invokeMethod: mocks.invokeMethod,
    },
  });
  mocks.connect.mockResolvedValue(undefined);
  mocks.invokeMethod.mockResolvedValue({
    signedTransaction: getBase64EncodedWireTransaction(tx),
  });
});
afterEach(() => vi.unstubAllGlobals());
it("requests only Devnet and signs in that scope despite an existing mainnet session", async () => {
  mocks.getSession.mockResolvedValue({
    sessionScopes: {
      "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": { accounts: [] },
      [METAMASK_DEVNET_SCOPE]: {
        accounts: [`${METAMASK_DEVNET_SCOPE}:${account}`],
      },
    },
  });
  await signMetaMaskDevnet(tx, account);
  expect(mocks.create.mock.calls[0][0].api.supportedNetworks).toEqual({
    devnet: "https://api.devnet.solana.com",
  });
  expect(mocks.connect).toHaveBeenCalledWith(
    [METAMASK_DEVNET_SCOPE],
    [`${METAMASK_DEVNET_SCOPE}:${account}`],
  );
  expect(mocks.invokeMethod.mock.calls[0][0]).toMatchObject({
    scope: METAMASK_DEVNET_SCOPE,
    request: {
      method: "signTransaction",
      params: { scope: METAMASK_DEVNET_SCOPE, account: { address: account } },
    },
  });
});
it("never requests a signature when the account has only mainnet permission", async () => {
  mocks.getSession.mockResolvedValue({
    sessionScopes: {
      "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": { accounts: [account] },
    },
  });
  await expect(signMetaMaskDevnet(tx, account)).rejects.toThrow(
    "Connect this MetaMask account to Solana Devnet",
  );
  expect(mocks.invokeMethod).not.toHaveBeenCalled();
});
it("never requests a signature for a different Devnet account", async () => {
  mocks.getSession.mockResolvedValue({
    sessionScopes: {
      [METAMASK_DEVNET_SCOPE]: { accounts: [`${METAMASK_DEVNET_SCOPE}:other`] },
    },
  });
  await expect(signMetaMaskDevnet(tx, account)).rejects.toThrow(
    "Connect this MetaMask account",
  );
  expect(mocks.invokeMethod).not.toHaveBeenCalled();
});
it("reuses the injected transport and requests only the existing account on Devnet", async () => {
  const caipAccount = `${METAMASK_DEVNET_SCOPE}:${account}`;
  const provider = {
    getSession: vi
      .fn()
      .mockResolvedValueOnce({ sessionScopes: {} })
      .mockResolvedValue({
        sessionScopes: { [METAMASK_DEVNET_SCOPE]: { accounts: [caipAccount] } },
      }),
    createSession: vi.fn().mockResolvedValue(undefined),
    invokeMethod: vi
      .fn()
      .mockResolvedValue({
        signedTransaction: getBase64EncodedWireTransaction(tx),
      }),
  };
  await signMetaMaskDevnet(tx, account, provider);
  expect(mocks.create).not.toHaveBeenCalled();
  expect(provider.createSession).toHaveBeenCalledWith({
    optionalScopes: {
      [METAMASK_DEVNET_SCOPE]: {
        accounts: [caipAccount],
        methods: [],
        notifications: [],
      },
    },
  });
  expect(provider.invokeMethod.mock.calls[0][0].scope).toBe(
    METAMASK_DEVNET_SCOPE,
  );
});
it("refuses the injected transport when Devnet permission was not granted", async () => {
  const provider = {
    getSession: vi.fn().mockResolvedValue({ sessionScopes: {} }),
    createSession: vi.fn().mockResolvedValue(undefined),
    invokeMethod: vi.fn(),
  };
  await expect(signMetaMaskDevnet(tx, account, provider)).rejects.toThrow(
    "Connect this MetaMask account",
  );
  expect(provider.invokeMethod).not.toHaveBeenCalled();
});
