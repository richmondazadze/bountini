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
    await participantAccount(id);
    const submissions =
      await sql`SELECT s.body,s.revision,s.created_at,s.content_hash,m.manifest FROM submissions s LEFT JOIN submission_manifests m ON m.id=s.manifest_id AND m.confirmed=true WHERE s.bounty_id=${id} AND s.confirmed=true ORDER BY s.revision`;
    return Response.json(
      { submissions },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
