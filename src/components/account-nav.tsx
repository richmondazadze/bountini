"use client";
import Link from "next/link";
import { useAccount } from "./account-provider";
export function AccountNav() {
  const { me, loading } = useAccount();
  return (
    <Link className="account-link" href={me ? "/my" : "/account"}>
      {loading ? "Account…" : me ? me.user.name.split(" ")[0] : "Sign in"}
    </Link>
  );
}
