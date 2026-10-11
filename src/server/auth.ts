import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { database, HttpError } from "./db";
export const COOKIE = "bountini_session";
export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function walletSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) throw new HttpError(401, "Connect and sign in with your wallet");
  const rows =
    await database()`SELECT wallet FROM sessions WHERE token_hash=${tokenHash(token)} AND expires_at>now()`;
  if (!rows[0]) throw new HttpError(401, "Session expired. Sign in again.");
  return rows[0].wallet as string;
}
