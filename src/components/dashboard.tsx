"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "./account-provider";
import { authClient } from "@/client/account";
import { api } from "./header";
import { Banner, Button } from "./ui";
import { Market } from "./market";
type Notification = {
  id: string;
  body: string;
  bounty_id: string | null;
  read_at: string | null;
  created_at: string;
};
export function Dashboard() {
  const { me, loading, refresh } = useAccount();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [readPending, setReadPending] = useState(false);
  const notificationVersion = useRef(0);
  useEffect(() => {
    notificationVersion.current++;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async (force = false) => {
      try {
        if (
          me &&
          (force ||
            (document.visibilityState === "visible" && navigator.onLine))
        ) {
          const version = notificationVersion.current;
          const r = await api<{
            notifications: Notification[];
            unread: number;
          }>("/api/notifications", { cache: "no-store" });
          if (!stopped && version === notificationVersion.current) {
            setNotifications(r.notifications);
            setUnread(r.unread);
          }
        }
      } catch {
      } finally {
        if (!stopped) timer = setTimeout(() => void load(), 5000);
      }
    };
    setNotifications([]);
    setUnread(0);
    void load(true);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [me?.user.id]);
  if (loading)
    return (
      <div className="page">
        <p role="status">Loading your account…</p>
      </div>
    );
  if (!me)
    return (
      <div className="page account-page">
        <h1>Your work, in one place.</h1>
        <p>
          Sign in to track your quests, messages and updates across devices.
        </p>
        <Link className="button primary" href="/account">
          Sign in or create an account
        </Link>
      </div>
    );
  const role = me.profile.activeRole;
  async function switchRole(activeRole: "requester" | "worker") {
    setPending(true);
    setError("");
    try {
      await api("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ activeRole }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="page">
        <p className="eyebrow">
          Your {role === "requester" ? "Requester" : "Worker"} dashboard
        </p>
        <h1>Welcome, {me.user.name}.</h1>
        <div className="role-switch" aria-label="Dashboard role">
          <Button
            variant={role === "requester" ? "primary" : "secondary"}
            disabled={pending}
            onClick={() => void switchRole("requester")}
            aria-pressed={role === "requester"}
          >
            Post work
          </Button>
          <Button
            variant={role === "worker" ? "primary" : "secondary"}
            disabled={pending}
            onClick={() => void switchRole("worker")}
            aria-pressed={role === "worker"}
          >
            Do work
          </Button>
          <Link className="button secondary" href="/settings">
            Account & profile
          </Link>
          <Button
            variant="quiet"
            onClick={async () => {
              setPending(true);
              try {
                const r = await authClient.signOut();
                if (r.error) throw new Error(r.error.message);
                await api("/api/auth/session", { method: "DELETE" }).catch(
                  () => {},
                );
                await refresh();
                window.dispatchEvent(new Event("bountini-auth-change"));
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Unable to sign out");
              } finally {
                setPending(false);
              }
            }}
          >
            Sign out
          </Button>
        </div>
        {error && <Banner error>{error}</Banner>}
        {!me.wallets.length && (
          <Banner>
            Complete your profile, then use “Connect wallet” in the header to
            link your Solana wallet. Existing quests appear after you prove
            ownership of their wallet.
          </Banner>
        )}
        <section aria-label="Notifications">
          <h2>Updates {unread > 0 && `(${unread} unread)`}</h2>
          {notifications.length ? (
            <>
              <div className="notification-list">
                {notifications.slice(0, 8).map((n) => (
                  <Link
                    key={n.id}
                    href={n.bounty_id ? `/bounties/${n.bounty_id}` : "/my"}
                  >
                    {!n.read_at && "● "}
                    {n.body}
                    <span className="helper">
                      {" "}
                      · {new Date(n.created_at).toLocaleString()}
                    </span>
                  </Link>
                ))}
              </div>
              {notifications.slice(0, 8).some((n) => !n.read_at) && (
                <Button
                  variant="quiet"
                  disabled={readPending}
                  onClick={async () => {
                    const ids = notifications
                      .slice(0, 8)
                      .map((n) => String(n.id));
                    setReadPending(true);
                    const version = ++notificationVersion.current;
                    try {
                      const result = await api<{ unread: number }>(
                        "/api/notifications",
                        {
                          method: "PATCH",
                          body: JSON.stringify({
                            ids,
                          }),
                        },
                      );
                      if (version !== notificationVersion.current) return;
                      notificationVersion.current++;
                      setUnread(result.unread);
                      setNotifications((items) =>
                        items.map((n) =>
                          ids.includes(String(n.id))
                            ? {
                                ...n,
                                read_at: n.read_at || new Date().toISOString(),
                              }
                            : n,
                        ),
                      );
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Unable to mark updates read",
                      );
                    } finally {
                      setReadPending(false);
                    }
                  }}
                >
                  Mark displayed updates read
                </Button>
              )}
            </>
          ) : (
            <p className="muted">
              Quest changes and participant messages will appear here.
            </p>
          )}
        </section>
        {role === "worker" && (
          <Link className="button primary" href="/discover">
            Find available work
          </Link>
        )}
      </div>
      <Market
        key={`${me.user.id}:${role}`}
        mine
        fixedRole={role === "requester" ? "Posted" : "Claimed"}
      />
    </>
  );
}
