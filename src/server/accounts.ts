import { headers } from "next/headers";
import { accountAuth } from "./account-config";
import { database, HttpError } from "./db";
export async function accountSession(fresh = false) {
  const session = await accountAuth().api.getSession({
    headers: await headers(),
  });
  if (!session?.user.emailVerified)
    throw new HttpError(401, "Sign in with your verified email account");
  if (
    fresh &&
    Date.now() - new Date(session.session.createdAt).getTime() > 3600000
  )
    throw new HttpError(401, "Sign in again before linking a new wallet");
  return session;
}
export async function participantAccount(bountyId: string) {
  const session = await accountSession();
  const rows =
    await database()`SELECT b.* FROM bounties b WHERE b.id=${bountyId} AND EXISTS (SELECT 1 FROM wallet_links w WHERE w.user_id=${session.user.id} AND w.wallet IN (b.requester,b.worker))`;
  if (!rows[0])
    throw new HttpError(
      403,
      "Only this bounty’s participants can access its workroom",
    );
  return { session, bounty: rows[0] };
}
