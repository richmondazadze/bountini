"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { Button, Dialog, Banner, Icon } from "./ui";
import { AccountNav } from "./account-nav";
import { useAccount } from "./account-provider";
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
  const { me, loading } = useAccount();
  const { connectors, connect, disconnect, wallet, status } =
    useWalletConnection();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const address = wallet?.account.address;
  const identity = `${me?.user.id || ""}:${wallet?.connector.id || ""}:${address || ""}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const sessionSync = useRef<Promise<void>>(Promise.resolve());
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setSignedIn(false);
    setAuthReady(false);
    setError("");
    sessionSync.current = sessionSync.current
      .catch(() => {})
      .then(async () => {
        if (cancelled) return;
        try {
          const session = await api<{ wallet: string }>("/api/auth/session", {
            cache: "no-store",
          });
          if (cancelled) return;
          if (address && session.wallet === address) setSignedIn(true);
          else await api("/api/auth/session", { method: "DELETE" });
        } catch {}
        if (!cancelled) {
          setAuthReady(true);
          window.dispatchEvent(new Event("bountini-auth-change"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [identity, address, me?.user.id]);
  useEffect(() => {
    if (!me) setOpen(false);
  }, [me?.user.id]);
  async function signIn() {
    if (!me || loading) return;
    if (!wallet?.signMessage) {
      setError(
        "This wallet does not support message signing. Use a compatible wallet.",
      );
      return;
    }
    setPending(true);
    setError("");
    const signingIdentity = identity;
    const signingWallet = wallet;
    const attempt = sessionSync.current
      .catch(() => {})
      .then(async () => {
        if (identityRef.current !== signingIdentity)
          throw new Error("Wallet changed. Verify the current wallet.");
        const c = await api<{ id: string; message: string }>(
          "/api/auth/challenge",
          { method: "POST", body: JSON.stringify({ wallet: address }) },
        );
        const signature = await signingWallet.signMessage!(
          new TextEncoder().encode(c.message),
        );
        await api("/api/auth/verify", {
          method: "POST",
          body: JSON.stringify({ id: c.id, signature: Array.from(signature) }),
        });
        if (identityRef.current !== signingIdentity) return;
        setSignedIn(true);
        window.dispatchEvent(new Event("bountini-auth-change"));
        setOpen(false);
      });
    sessionSync.current = attempt.catch(() => {});
    try {
      await attempt;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Wallet verification was not completed",
      );
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
            <AccountNav />
            <span className="network">
              <span aria-hidden="true">●</span> Devnet
            </span>
            {me && !loading && (
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
            )}
          </div>
        </div>
      </header>
      <Dialog
        open={open && Boolean(me) && !loading}
        onClose={() => setOpen(false)}
        title={address ? "Your wallet" : "Connect a wallet"}
      >
        <p>Solana Devnet · Test SOL has no cash value.</p>
        {error && <Banner error>{error}</Banner>}
        {address ? (
          <>
            {!me && (
              <p>
                <Link href="/account">Sign in or create your account</Link>{" "}
                before linking a wallet.
              </p>
            )}
            <p className="helper">Connected wallet: {wallet?.connector.name}</p>
            <p className="address">{address}</p>
            <p>
              {signedIn
                ? "Wallet linked and verified for escrow"
                : "Link this wallet to your email account with a signature."}
            </p>
            <Button
              pending={pending}
              disabled={signedIn || !authReady || !me}
              onClick={signIn}
            >
              {pending
                ? "Waiting for wallet…"
                : signedIn
                  ? "Wallet verified"
                  : "Link wallet"}
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
