export const maxDuration = 60;
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { walletSession } from "@/server/auth";
import {
  failure,
  requireOrigin,
  jsonBody,
  HttpError,
  database,
} from "@/server/db";
import { gemini, quota, advisorySchema } from "@/server/assistance";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const wallet = await walletSession();
    const p = z
      .object({ bountyId: z.uuid() })
      .safeParse(await jsonBody(request));
    if (!p.success) throw new HttpError(400, "Invalid quest");
    const sql = database();
    const rows = await sql`SELECT * FROM bounties WHERE id=${p.data.bountyId}`;
    const b = rows[0];
    if (!b || ![b.requester, b.worker].includes(wallet))
      throw new HttpError(403, "Only quest participants can request review");
    const submissions =
      await sql`SELECT * FROM submissions WHERE bounty_id=${b.id} AND confirmed=true ORDER BY revision DESC LIMIT 1`;
    if (!submissions[0])
      throw new HttpError(409, "A confirmed submission is required");
    const s = submissions[0];
    await quota(wallet, "review");
    const result = await gemini(
      advisorySchema,
      "Review the supplied text against each immutable requirement. Give a criterion, quoted evidence, specific concern and suggested revision. Be candid about uncertainty. This is advisory only; the requester decides payment.",
      {
        description: b.description,
        requirements: b.requirements,
        submission: s.body,
      },
    );
    await sql`INSERT INTO ai_reviews(id,bounty_id,submission_hash,requirements_hash,model,prompt_version,result) VALUES(${randomUUID()},${b.id},${s.content_hash},${b.requirements_hash},${result.model},${result.promptVersion},${JSON.stringify(result.result)}::jsonb)`;
    return Response.json({
      ...result,
      requirementsHash: b.requirements_hash,
      submissionHash: s.content_hash,
    });
  } catch (e) {
    return failure(e);
  }
}
