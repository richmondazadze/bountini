import { z } from "zod";
import { database, failure, HttpError } from "@/server/db";
import { walletSession } from "@/server/auth";
import { bountyFromRow } from "@/server/bounties";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(404, "Quest not found");
    const rows = await database()`SELECT * FROM bounties WHERE id=${id}`;
    if (!rows[0]) throw new HttpError(404, "Quest not found");
    const b = bountyFromRow(rows[0]);
    if (b.status === "draft" && (await walletSession()) !== b.requester)
      throw new HttpError(403, "This draft is private");
    return Response.json(
      { bounty: b, serverTime: Date.now() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
