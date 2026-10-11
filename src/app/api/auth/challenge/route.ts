import { randomUUID } from "node:crypto";
import { address } from "@solana/kit";
import {
  database,
  failure,
  jsonBody,
  requireOrigin,
  HttpError,
} from "@/server/db";
import { accountSession } from "@/server/accounts";
export async function POST(request: Request) {
  try {
    const origin = requireOrigin(request);
    const account = await accountSession(true);
    const { wallet } = await jsonBody(request);
    try {
      address(wallet);
    } catch {
      throw new HttpError(400, "Invalid Solana address");
    }
    const sql = database();
    const recent =
      await sql`SELECT count(*) AS count FROM auth_challenges WHERE wallet=${wallet} AND created_at>now()-interval '1 minute'`;
    if (Number(recent[0].count) >= 5)
      throw new HttpError(
        429,
        "Wait a minute before requesting another sign-in",
      );
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 300000);
    const message = `Bountini wallet sign-in\nOrigin: ${origin}\nWallet: ${wallet}\nNonce: ${id}\nExpires: ${expiresAt.toISOString()}\nAccount: ${account.user.id}\nNetwork: Solana Devnet\nThis signature authenticates your wallet. It does not authorize transactions.`;
    await sql`INSERT INTO auth_challenges(id,wallet,message,origin,expires_at,user_id) VALUES(${id},${wallet},${message},${origin},${expiresAt.toISOString()},${account.user.id})`;
    return Response.json({ id, message, expiresAt });
  } catch (e) {
    return failure(e);
  }
}
