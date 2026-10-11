"use client";
import { useEffect, useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { useAccount } from "./account-provider";
export function useWalletAccess() {
  const { me } = useAccount();
  const { wallet } = useWalletConnection();
  const address = wallet?.account.address;
  const identity = `${me?.user.id || ""}:${address || ""}`;
  const [verified, setVerified] = useState("");
  useEffect(() => {
    let alive = true;
    let sequence = 0;
    const refresh = async () => {
      const attempt = ++sequence;
      setVerified("");
      if (!me || !address || !me.wallets.some((w) => w.wallet === address))
        return;
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const data = response.ok ? await response.json() : null;
        if (alive && attempt === sequence && data?.wallet === address)
          setVerified(identity);
      } catch {}
    };
    void refresh();
    window.addEventListener("bountini-auth-change", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      sequence++;
      window.removeEventListener("bountini-auth-change", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [identity, me?.wallets.map((w) => w.wallet).join(":")]);
  return Boolean(me && address && verified === identity);
}
