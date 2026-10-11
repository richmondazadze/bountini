import { z } from "zod";
import { database, failure, HttpError } from "@/server/db";
import { participantAccount } from "@/server/accounts";
import { bountyFromRow } from "@/server/bounties";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(404, "Quest not found");
    const rows =
      await database()`SELECT b.*,ru.name AS requester_name,wu.name AS worker_name,ru.id AS requester_user_id,wu.id AS worker_user_id FROM bounties b LEFT JOIN wallet_links rw ON rw.wallet=b.requester LEFT JOIN auth_users ru ON ru.id=rw.user_id LEFT JOIN wallet_links ww ON ww.wallet=b.worker LEFT JOIN auth_users wu ON wu.id=ww.user_id WHERE b.id=${id}`;
    if (!rows[0]) throw new HttpError(404, "Quest not found");
    const b = bountyFromRow(rows[0]);
    if (b.status === "draft") await participantAccount(id);
    return Response.json(
      { bounty: b, serverTime: Date.now() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
