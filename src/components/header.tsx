"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { Button, Dialog, Banner, Icon } from "./ui";
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || "Request failed");
  return body;
}
export function Header() {
  const path = usePathname();
  const { connectors, connect, disconnect, wallet, status } =
    useWalletConnection();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const address = wallet?.account.address;
  useEffect(() => {
    setSignedIn(false);
    api<{ wallet: string }>("/api/auth/session")
      .then((v) => setSignedIn(v.wallet === address))
      .catch(() => {});
  }, [address]);
  async function signIn() {
    if (!wallet?.signMessage) {
      setError(
        "This wallet does not support message signing. Use a compatible wallet.",
      );
      return;
    }
    setPending(true);
    setError("");
    try {
      const c = await api<{ id: string; message: string }>(
        "/api/auth/challenge",
        { method: "POST", body: JSON.stringify({ wallet: address }) },
      );
      const signature = await wallet.signMessage(
        new TextEncoder().encode(c.message),
      );
      await api("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ id: c.id, signature: Array.from(signature) }),
      });
      setSignedIn(true);
      window.dispatchEvent(new Event("bountini-auth-change"));
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in was not completed");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header>
        <div className="header-inner">
          <Link href="/" aria-label="Bountini home">
            <img
              className="logo"
              src="/brand/logos/bountini-horizontal-ink.svg"
              alt="Bountini"
              width="180"
              height="42"
            />
          </Link>
          <nav aria-label="Main navigation">
            {[
              ["/discover", "Discover"],
              ["/create", "Create"],
              ["/my", "My Bountini"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={path === href ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="wallet-nav">
            <span className="network">
              <span aria-hidden="true">●</span> Devnet
            </span>
            <Button
              variant="secondary"
              size="compact"
              onClick={() => setOpen(true)}
            >
              <Icon name="wallet" />
              {address
                ? `${address.slice(0, 4)}…${address.slice(-4)}`
                : "Connect wallet"}
            </Button>
          </div>
        </div>
      </header>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={address ? "Your wallet" : "Connect a wallet"}
      >
        <p>Solana Devnet · Test SOL has no cash value.</p>
        {error && <Banner error>{error}</Banner>}
        {address ? (
          <>
            <p className="address">{address}</p>
            <p>
              {signedIn
                ? "Signed in to Bountini"
                : "Sign a message to save quests and submissions."}
            </p>
            <Button pending={pending} disabled={signedIn} onClick={signIn}>
              {pending
                ? "Waiting for wallet…"
                : signedIn
                  ? "Signed in"
                  : "Sign in with wallet"}
            </Button>
            <Button
              variant="quiet"
              onClick={async () => {
                try {
                  await api("/api/auth/session", { method: "DELETE" });
                } catch {}
                await disconnect();
                window.dispatchEvent(new Event("bountini-auth-change"));
                setOpen(false);
              }}
            >
              Disconnect
            </Button>
          </>
        ) : connectors.length ? (
          connectors.map((c) => (
            <Button
              key={c.id}
              variant="secondary"
              pending={status === "connecting"}
              onClick={async () => {
                setError("");
                try {
                  await connect(c.id);
                } catch {
                  setError(
                    "Wallet connection was rejected or unavailable. Try again.",
                  );
                }
              }}
            >
              {c.name}
            </Button>
          ))
        ) : (
          <Banner>
            No compatible wallet detected. Install a Wallet Standard wallet,
            then reload this page.
          </Banner>
        )}
      </Dialog>
    </>
  );
}
