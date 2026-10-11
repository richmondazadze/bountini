import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { database, HttpError } from "./db";
import { accountSession } from "./accounts";
export const COOKIE = "bountini_session";
export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function walletSession() {
  const account = await accountSession();
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token)
    throw new HttpError(401, "Connect and verify your wallet in the header");
  const rows =
    await database()`SELECT s.wallet FROM sessions s JOIN wallet_links w ON w.wallet=s.wallet AND w.user_id=s.user_id WHERE s.token_hash=${tokenHash(token)} AND s.user_id=${account.user.id} AND s.expires_at>now()`;
  if (!rows[0])
    throw new HttpError(
      401,
      "Wallet verification expired. Verify your wallet again.",
    );
  return rows[0].wallet as string;
}
