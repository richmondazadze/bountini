import { z } from "zod";
import { walletSession } from "@/server/auth";
import { database, failure, HttpError } from "@/server/db";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await walletSession();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(404, "Quest not found");
    const sql = database();
    const b = await sql`SELECT requester,worker FROM bounties WHERE id=${id}`;
    if (!b[0] || ![b[0].requester, b[0].worker].includes(actor))
      throw new HttpError(403, "Only participants can view submissions");
    const submissions =
      await sql`SELECT body,revision,created_at FROM submissions WHERE bounty_id=${id} AND confirmed=true ORDER BY revision`;
    return Response.json(
      { submissions },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
