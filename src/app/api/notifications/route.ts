import { z } from "zod";
import { accountSession } from "@/server/accounts";
import {
  database,
  failure,
  requireOrigin,
  jsonBody,
  HttpError,
} from "@/server/db";
export async function GET() {
  try {
    const { user } = await accountSession();
    const sql = database();
    const notifications =
      await sql`SELECT id,bounty_id,kind,body,read_at,created_at FROM notifications WHERE user_id=${user.id} ORDER BY id DESC LIMIT 50`;
    const [count] =
      await sql`SELECT count(*) AS unread FROM notifications WHERE user_id=${user.id} AND read_at IS NULL`;
    return Response.json(
      { notifications, unread: Number(count.unread) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    requireOrigin(request);
    const { user } = await accountSession();
    const p = z
      .object({
        ids: z
          .array(
            z
              .string()
              .regex(/^[1-9]\d*$/)
              .refine((id) => BigInt(id) <= 9223372036854775807n),
          )
          .min(1)
          .max(50),
      })
      .safeParse(await jsonBody(request));
    if (!p.success) throw new HttpError(400, "Invalid notification");
    const sql = database();
    await sql`UPDATE notifications SET read_at=now() WHERE user_id=${user.id} AND id IN (SELECT value::bigint FROM jsonb_array_elements_text(${JSON.stringify(p.data.ids)}::jsonb)) AND read_at IS NULL`;
    const [count] =
      await sql`SELECT count(*) AS unread FROM notifications WHERE user_id=${user.id} AND read_at IS NULL`;
    return Response.json({ saved: true, unread: Number(count.unread) });
  } catch (e) {
    return failure(e);
  }
}
