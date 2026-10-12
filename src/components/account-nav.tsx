"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountHref } from "@/client/account-flow";
import { useAccount } from "./account-provider";
export function AccountNav({ onNavigate }: { onNavigate?: () => void } = {}) {
  const path = usePathname();
  const { me, loading } = useAccount();
  if (loading)
    return (
      <span
        className="account-link account-loading"
        role="status"
        aria-label="Checking your account"
      >
        <span className="account-skeleton" aria-hidden="true" />
      </span>
    );
  return (
    <Link
      className="account-link"
      onClick={onNavigate}
      href={
        me
          ? "/my"
          : accountHref(
              path,
              path === "/create"
                ? "requester"
                : path === "/discover" || path.startsWith("/bounties/")
                  ? "worker"
                  : undefined,
            )
      }
    >
      {me ? me.user.name.split(" ")[0] : "Sign in"}
    </Link>
  );
}
