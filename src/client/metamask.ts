import {
  getBase64EncodedWireTransaction,
  getBase64Encoder,
  getTransactionDecoder,
} from "@solana/kit";
import type { WalletSession } from "@solana/client";

export const METAMASK_DEVNET_SCOPE = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

export async function signMetaMaskDevnet(
  transaction: Parameters<NonNullable<WalletSession["signTransaction"]>>[0],
  account: string,
) {
  const { createSolanaClient } = await import("@metamask/connect-solana");
  const { core } = await createSolanaClient({
    dapp: { name: "Bountini", url: window.location.origin },
    api: { supportedNetworks: { devnet: "https://api.devnet.solana.com" } },
    analytics: { enabled: false },
    skipAutoRegister: true,
  });
  const caipAccount = `${METAMASK_DEVNET_SCOPE}:${account}` as const;
  await core.connect([METAMASK_DEVNET_SCOPE], [caipAccount]);
  const session = await core.provider.getSession();
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
  const result = await core.invokeMethod({
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
