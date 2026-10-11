"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
export type Me = {
  user: { id: string; name: string; email: string };
  profile: {
    activeRole: "requester" | "worker";
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
}>({ me: null, loading: false, refresh: async () => {} });
export const useAccount = () => useContext(Context);
export function AccountProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  async function refresh() {
    const current = ++seq.current;
    try {
      const r = await fetch("/api/me", { cache: "no-store" });
      const data = r.ok ? await r.json() : null;
      if (current === seq.current) setMe(data);
    } catch {
    } finally {
      if (current === seq.current) setLoading(false);
    }
  }
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
      clearTimeout(timer);
      window.removeEventListener("bountini-auth-change", changed);
      window.removeEventListener("bountini-account-change", changed);
      window.removeEventListener("focus", changed);
    };
  }, []);
  return (
    <Context.Provider value={{ me, loading, refresh }}>
      {children}
    </Context.Provider>
  );
}
