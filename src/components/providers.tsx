"use client";
import { useState, type ReactNode } from "react";
import { createBountiniClient } from "@/client/wallet";
import { SolanaProvider } from "@solana/react-hooks";
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => createBountiniClient());
  return <SolanaProvider client={client}>{children}</SolanaProvider>;
}
