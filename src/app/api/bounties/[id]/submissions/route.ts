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
      await sql`SELECT body,revision,created_at FROM submissions WHERE bounty_id=${id} AND confirmed=true ORDER BY revision`;
    return Response.json(
      { submissions },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
