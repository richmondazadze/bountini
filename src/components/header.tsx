"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { Button, Dialog, Banner, Icon } from "./ui";
import { WorkspaceHeader } from "./experience/workspace-header";
import { StatusNotice } from "./experience/primitives";
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
  const { me, loading, switchRole, rolePending, roleError, roleNotice } =
    useAccount();
  const { connectors, connect, disconnect, wallet, status } =
    useWalletConnection();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  function closeWallet() {
    setOpen(false);
    requestAnimationFrame(() => menuButton.current?.focus());
  }
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
      <WorkspaceHeader
        menuButtonRef={menuButton}
        mode={me && !loading ? me.profile.activeRole : undefined}
        pending={rolePending}
        onModeChange={(role) => void switchRole(role)}
        links={(me && !loading
          ? me.profile.activeRole === "worker"
            ? [
                ["/discover", "Find quests"],
                ["/my", "My work"],
              ]
            : [
                ["/my", "My quests"],
                ["/create", "Create a quest"],
                ["/discover", "Discover"],
              ]
          : [
              ["/discover", "Discover"],
              ["/create", "Create a quest"],
            ]
        ).map(([href, label]) => ({ href, label, active: path === href }))}
        publicAccountContent={!me || loading ? <AccountNav /> : undefined}
        accountContent={(closeMenu) => (
          <div className="experience-account-menu">
            <AccountNav onNavigate={closeMenu} />
            {me && !loading && (
              <>
                <Link href="/settings" onClick={closeMenu}>
                  Account & profile
                </Link>
                <Button
                  variant="secondary"
                  onClick={() => {
                    closeMenu();
                    setOpen(true);
                  }}
                >
                  <Icon name="wallet" />
                  {address
                    ? `${address.slice(0, 4)}…${address.slice(-4)}`
                    : "Connect wallet"}
                </Button>
                <p className="helper">
                  Workspace mode changes navigation, not quest permissions.
                </p>
              </>
            )}
          </div>
        )}
      />
      {roleError && (
        <div className="experience-role-feedback">
          <StatusNotice title="Workspace mode could not be saved" tone="danger">
            {roleError} Your previous mode is still selected. Try switching
            again.
          </StatusNotice>
        </div>
      )}
      <span className="experience-sr-only" role="status" aria-live="polite">
        {rolePending ? "Saving workspace mode…" : roleNotice}
      </span>
      <Dialog
        open={open && Boolean(me) && !loading}
        onClose={closeWallet}
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
