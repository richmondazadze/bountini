import { randomUUID } from "node:crypto";
import { z } from "zod";
import { participantAccount } from "@/server/accounts";
import {
  database,
  failure,
  requireOrigin,
  jsonBody,
  HttpError,
} from "@/server/db";
import { consumeRate } from "@/server/rate-limit";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(404, "Quest not found");
    await participantAccount(id);
    const p = new URL(request.url).searchParams;
    const before = p.get("before") || "9223372036854775807";
    if (!/^\d{1,19}$/.test(before) || BigInt(before) > 9223372036854775807n)
      throw new HttpError(400, "Invalid message cursor");
    const rows =
      await database()`SELECT m.id,m.seq::text,m.sender_id,m.body,m.created_at,u.name AS sender_name FROM messages m JOIN auth_users u ON u.id=m.sender_id WHERE m.bounty_id=${id} AND m.seq<${before}::bigint ORDER BY m.seq DESC LIMIT 51`;
    return Response.json(
      { messages: rows.slice(0, 50).reverse(), hasMore: rows.length > 50 },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    requireOrigin(request);
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(404, "Quest not found");
    const { session } = await participantAccount(id);
    const p = z
      .object({ body: z.string().trim().min(1).max(4000), clientId: z.uuid() })
      .safeParse(await jsonBody(request));
    if (!p.success)
      throw new HttpError(400, "Write a message of 1–4,000 characters");
    const sql = database();
    const existing =
      await sql`SELECT id,bounty_id FROM messages WHERE sender_id=${session.user.id} AND client_id=${p.data.clientId}`;
    if (existing[0]) {
      if (existing[0].bounty_id !== id)
        throw new HttpError(409, "Message identifier was already used");
      return Response.json({ id: existing[0].id });
    }
    await consumeRate("message:" + session.user.id, 10);
    const rows =
      await sql`INSERT INTO messages(id,bounty_id,sender_id,client_id,body) SELECT ${randomUUID()},b.id,${session.user.id},${p.data.clientId},${p.data.body} FROM bounties b WHERE b.id=${id} AND EXISTS(SELECT 1 FROM wallet_links w WHERE w.user_id=${session.user.id} AND w.wallet IN(b.requester,b.worker)) ON CONFLICT(sender_id,client_id) DO UPDATE SET client_id=EXCLUDED.client_id WHERE messages.bounty_id=EXCLUDED.bounty_id RETURNING id`;
    if (!rows[0])
      throw new HttpError(403, "Workroom access changed. Refresh this quest.");
    return Response.json({ id: rows[0].id }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
