"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountHref } from "@/client/account-flow";
import { useAccount } from "./account-provider";
export function AccountNav() {
  const path = usePathname();
  const { me, loading } = useAccount();
  return (
    <Link
      className="account-link"
      href={
        me
          ? "/my"
          : accountHref(
              path,
              path === "/create"
                ? "requester"
                : path.startsWith("/bounties/")
                  ? "worker"
                  : undefined,
            )
      }
    >
      {loading ? "Account…" : me ? me.user.name.split(" ")[0] : "Sign in"}
    </Link>
  );
}
