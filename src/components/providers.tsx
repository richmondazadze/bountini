"use client";
import { useState, type ReactNode } from "react";
import { createBountiniClient } from "@/client/wallet";
import { SolanaProvider } from "@solana/react-hooks";
import { ExpressiveMotion } from "./motion-system/expressive-motion";
import { MotionSystem } from "./motion-system/motion-system";
import { AccountProvider } from "./account-provider";
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => createBountiniClient());
  // Saved SDK preferences can re-enable autoconnect even when autoConnect is
  // false. Disable persistence so wallets open only after an explicit action.
  return (
    <SolanaProvider client={client} walletPersistence={false}>
      <AccountProvider>
        <MotionSystem>
          <ExpressiveMotion />
          {children}
        </MotionSystem>
      </AccountProvider>
    </SolanaProvider>
  );
}
