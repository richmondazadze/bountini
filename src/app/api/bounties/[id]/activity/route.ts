import { z } from "zod";
import { walletSession } from "@/server/auth";
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
    const rows =
      await sql`SELECT requester,status FROM bounties WHERE id=${id}`;
    if (!rows[0]) throw new HttpError(404, "Quest not found");
    if (
      rows[0].status === "draft" &&
      rows[0].requester !== (await walletSession())
    )
      throw new HttpError(403, "Private draft");
    const activity =
      await sql`SELECT action,signature,updated_at FROM operations WHERE bounty_id=${id} AND status='confirmed' ORDER BY created_at`;
    return Response.json(
      { activity },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
