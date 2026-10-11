"use client";
import { useState, type ReactNode } from "react";
import { createClient, autoDiscover } from "@solana/client";
import { SolanaProvider } from "@solana/react-hooks";
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() =>
    createClient({
      cluster: "devnet",
      endpoint:
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
        "https://api.devnet.solana.com",
      websocketEndpoint:
        process.env.NEXT_PUBLIC_SOLANA_WS_URL || "wss://api.devnet.solana.com",
      walletConnectors: autoDiscover(),
    }),
  );
  return <SolanaProvider client={client}>{children}</SolanaProvider>;
}
