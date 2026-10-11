"use client";
import { useState, type ReactNode } from "react";
import { createBountiniClient } from "@/client/wallet";
import { SolanaProvider } from "@solana/react-hooks";
import { AccountProvider } from "./account-provider";
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => createBountiniClient());
  // Saved SDK preferences can re-enable autoconnect even when autoConnect is
  // false. Disable persistence so wallets open only after an explicit action.
  return (
    <SolanaProvider client={client} walletPersistence={false}>
      <AccountProvider>{children}</AccountProvider>
    </SolanaProvider>
  );
}
