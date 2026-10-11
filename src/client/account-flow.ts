export type AccountRole = "requester" | "worker";
export function safeDestination(value?: string): string {
  if (
    !value ||
    !/^\/(create|my|settings|discover|bounties\/[0-9a-f-]{36}(?:\/review)?)$/.test(
      value,
    )
  )
    return "/my";
  return value;
}
export function accountHref(destination: string, role?: AccountRole): string {
  const params = new URLSearchParams({ next: safeDestination(destination) });
  if (role) params.set("role", role);
  return `/account?${params}`;
}
