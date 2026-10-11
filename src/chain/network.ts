import { createSolanaRpc } from "@solana/kit";
export const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export async function devnetRpc(endpoint: string) {
  const rpc = createSolanaRpc(endpoint);
  if ((await rpc.getGenesisHash().send()) !== DEVNET_GENESIS)
    throw new Error("RPC is not Solana Devnet. Transactions are disabled.");
  return rpc;
}
