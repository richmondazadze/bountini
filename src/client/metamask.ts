import {
  getBase64EncodedWireTransaction,
  getBase64Encoder,
  getTransactionDecoder,
} from "@solana/kit";
import type { WalletSession } from "@solana/client";

export const METAMASK_DEVNET_SCOPE = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

type Session =
  { sessionScopes: Record<string, { accounts?: string[] }> } | null | undefined;
export type MetaMaskProvider = {
  getSession(): Promise<Session>;
  createSession(request: {
    optionalScopes: Record<
      string,
      { accounts: string[]; methods: string[]; notifications: string[] }
    >;
  }): Promise<Session>;
  invokeMethod(request: {
    scope: string;
    request: { method: string; params: unknown };
  }): Promise<unknown>;
};
export function getMetaMaskProvider(
  wallet: unknown,
): MetaMaskProvider | undefined {
  if (!wallet || typeof wallet !== "object" || !("client" in wallet)) return;
  const client = wallet.client;
  if (
    client &&
    typeof client === "object" &&
    "getSession" in client &&
    typeof client.getSession === "function" &&
    "createSession" in client &&
    typeof client.createSession === "function" &&
    "invokeMethod" in client &&
    typeof client.invokeMethod === "function"
  )
    return client as MetaMaskProvider;
}

export async function signMetaMaskDevnet(
  transaction: Parameters<NonNullable<WalletSession["signTransaction"]>>[0],
  account: string,
  provider?: MetaMaskProvider,
) {
  const caipAccount = `${METAMASK_DEVNET_SCOPE}:${account}` as const;
  let session: Session;
  let invoke: MetaMaskProvider["invokeMethod"];
  if (provider) {
    session = await provider.getSession();
    if (
      !session?.sessionScopes[METAMASK_DEVNET_SCOPE]?.accounts?.includes(
        caipAccount,
      )
    ) {
      await provider.createSession({
        optionalScopes: {
          [METAMASK_DEVNET_SCOPE]: {
            accounts: [caipAccount],
            methods: [],
            notifications: [],
          },
        },
      });
      session = await provider.getSession();
    }
    invoke = (request) => provider.invokeMethod(request);
  } else {
    const { createSolanaClient } = await import("@metamask/connect-solana");
    const { core } = await createSolanaClient({
      dapp: { name: "Bountini", url: window.location.origin },
      api: { supportedNetworks: { devnet: "https://api.devnet.solana.com" } },
      analytics: { enabled: false },
      skipAutoRegister: true,
    });
    await core.connect([METAMASK_DEVNET_SCOPE], [caipAccount]);
    session = await core.provider.getSession();
    invoke = (request) =>
      core.invokeMethod({ ...request, scope: METAMASK_DEVNET_SCOPE });
  }
  if (
    !session?.sessionScopes[METAMASK_DEVNET_SCOPE]?.accounts?.includes(
      caipAccount,
    )
  )
    throw new Error(
      "Connect this MetaMask account to Solana Devnet before funding.",
    );
  // MetaMask's injected sign-only adapter ignores Wallet Standard's chain input.
  // Invoke its supported multichain API with an explicit, verified Devnet scope.
  const result = await invoke({
    scope: METAMASK_DEVNET_SCOPE,
    request: {
      method: "signTransaction",
      params: {
        account: { address: account },
        transaction: getBase64EncodedWireTransaction(transaction),
        scope: METAMASK_DEVNET_SCOPE,
      },
    },
  });
  if (
    !result ||
    typeof result !== "object" ||
    !("signedTransaction" in result) ||
    typeof result.signedTransaction !== "string"
  )
    throw new Error("MetaMask did not return a signed Devnet transaction.");
  return getTransactionDecoder().decode(
    getBase64Encoder().encode(result.signedTransaction),
  ) as typeof transaction;
}
