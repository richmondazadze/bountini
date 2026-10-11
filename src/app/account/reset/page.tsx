import {AccountForm} from "@/components/account-form";
import Link from "next/link";
export default async function Page({searchParams}:{searchParams:Promise<{token?:string;error?:string}>}){const p=await searchParams;return p.token&&!p.error?<AccountForm resetToken={p.token}/>:<div className="page account-page"><h1>This recovery link is invalid or expired.</h1><Link href="/account">Request a new password reset</Link></div>;}
