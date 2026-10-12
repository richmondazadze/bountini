"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
export type AccountRole = "requester" | "worker";
export type Me = {
  user: { id: string; name: string; email: string };
  profile: {
    activeRole: AccountRole;
    bio: string;
    skills: string[];
    portfolioUrl: string;
  };
  wallets: { wallet: string }[];
};
const Context = createContext<{
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  switchRole: (role: AccountRole) => Promise<void>;
  rolePending: boolean;
  roleError: string;
  roleNotice: string;
}>({
  me: null,
  loading: false,
  refresh: async () => {},
  switchRole: async () => {},
  rolePending: false,
  roleError: "",
  roleNotice: "",
});
export const useAccount = () => useContext(Context);
export function AccountProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleOperation, setRoleOperation] = useState<{
    userId: string;
    pending: boolean;
    error: string;
    notice: string;
  } | null>(null);
  const seq = useRef(0);
  const account = useRef(me);
  account.current = me;
  const roleAttempt = useRef(0);
  const roleLock = useRef<{ userId: string; attempt: number } | null>(null);
  const seenUser = useRef(me?.user.id);
  if (seenUser.current !== me?.user.id) {
    seenUser.current = me?.user.id;
    roleAttempt.current++;
    roleLock.current = null;
  }
  const refresh = useCallback(async () => {
    // A poll started before PATCH must not overwrite a committed preference.
    const current = ++seq.current;
    try {
      const r = await fetch("/api/me", { cache: "no-store" });
      if (!r.ok && r.status !== 401) throw new Error("Unable to load account");
      const data: Me | null = r.ok ? await r.json() : null;
      if (current === seq.current) {
        setMe((previous) =>
          data &&
          previous?.user.id === data.user.id &&
          roleLock.current?.userId === data.user.id
            ? {
                ...data,
                profile: {
                  ...data.profile,
                  activeRole: previous.profile.activeRole,
                },
              }
            : data,
        );
      }
    } catch {
    } finally {
      if (current === seq.current) setLoading(false);
    }
  }, []);
  const switchRole = useCallback(async (activeRole: AccountRole) => {
    const currentAccount = account.current;
    if (
      !currentAccount ||
      currentAccount.profile.activeRole === activeRole ||
      roleLock.current?.userId === currentAccount.user.id
    )
      return;
    const userId = currentAccount.user.id;
    const attempt = ++roleAttempt.current;
    roleLock.current = { userId, attempt };
    seq.current++;
    setRoleOperation({ userId, pending: true, error: "", notice: "" });
    try {
      const r = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeRole }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "Unable to save workspace mode");
      if (
        account.current?.user.id !== userId ||
        attempt !== roleAttempt.current
      )
        return;
      seq.current++;
      setMe((previous) =>
        previous?.user.id === userId
          ? { ...previous, profile: { ...previous.profile, activeRole } }
          : previous,
      );
      setRoleOperation({
        userId,
        pending: false,
        error: "",
        notice: `${activeRole === "worker" ? "Worker" : "Requester"} workspace saved.`,
      });
    } catch (e) {
      if (
        account.current?.user.id === userId &&
        attempt === roleAttempt.current
      )
        setRoleOperation({
          userId,
          pending: false,
          error:
            e instanceof Error ? e.message : "Unable to save workspace mode",
          notice: "",
        });
    } finally {
      if (roleLock.current?.attempt === attempt) roleLock.current = null;
    }
  }, []);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let running = false;
    const poll = async (force = false) => {
      if (!alive || running) return;
      running = true;
      try {
        if (
          force ||
          (document.visibilityState === "visible" && navigator.onLine)
        )
          await refresh();
      } finally {
        running = false;
        if (alive) timer = setTimeout(() => void poll(), 10000);
      }
    };
    const changed = () => {
      clearTimeout(timer);
      void poll(true);
    };
    void poll(true);
    window.addEventListener("bountini-auth-change", changed);
    window.addEventListener("bountini-account-change", changed);
    window.addEventListener("focus", changed);
    return () => {
      alive = false;
      seq.current++;
      roleAttempt.current++;
      clearTimeout(timer);
      window.removeEventListener("bountini-auth-change", changed);
      window.removeEventListener("bountini-account-change", changed);
      window.removeEventListener("focus", changed);
    };
  }, [refresh]);
  const ownOperation =
    roleOperation?.userId === me?.user.id ? roleOperation : null;
  return (
    <Context.Provider
      value={{
        me,
        loading,
        refresh,
        switchRole,
        rolePending: ownOperation?.pending || false,
        roleError: ownOperation?.error || "",
        roleNotice: ownOperation?.notice || "",
      }}
    >
      {children}
    </Context.Provider>
  );
}
