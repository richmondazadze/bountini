import { z } from "zod";
import { participantAccount } from "@/server/accounts";
import { database, failure, HttpError } from "@/server/db";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(404, "Quest not found");
    const sql = database();
    const { bounty } = await participantAccount(id);
    const feedback = await sql`
      SELECT r.id,r.action,r.feedback,o.signature,o.updated_at AS confirmed_at
      FROM reviews r JOIN operations o ON o.id=r.operation_id
      WHERE r.bounty_id=${id} AND o.bounty_id=r.bounty_id
        AND r.requester=${bounty.requester} AND o.actor=r.requester
        AND o.action=r.action AND r.action IN ('revise','reject') AND o.status='confirmed'
      ORDER BY o.updated_at,r.id`;
    return Response.json(
      { feedback },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
