"use client";
import { useState, type ReactNode } from "react";
import { createBountiniClient } from "@/client/wallet";
import { SolanaProvider } from "@solana/react-hooks";
import { AccountProvider } from "./account-provider";
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => createBountiniClient());
  return (
    <SolanaProvider client={client}>
      <AccountProvider>{children}</AccountProvider>
    </SolanaProvider>
  );
}
