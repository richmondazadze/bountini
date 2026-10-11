import { AccountForm } from "@/components/account-form";
import { safeDestination } from "@/client/account-flow";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next =
    typeof params.next === "string" ? safeDestination(params.next) : undefined;
  const role =
    params.role === "requester" || params.role === "worker"
      ? params.role
      : undefined;
  return <AccountForm destination={next} intendedRole={role} />;
}
