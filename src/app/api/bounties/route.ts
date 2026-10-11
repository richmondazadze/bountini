import { randomUUID, createHash } from "node:crypto";
import { draftSchema, canonicalAgreement, parseSOL } from "@/domain/bounty";
import { walletSession } from "@/server/auth";
import {
  database,
  failure,
  jsonBody,
  requireOrigin,
  HttpError,
} from "@/server/db";
import { bountyFromRow } from "@/server/bounties";
export async function GET(request: Request) {
  try {
    const mine = new URL(request.url).searchParams.get("mine") === "true";
    const sql = database();
    const rows = mine
      ? await sql`SELECT * FROM bounties WHERE requester=${await walletSession()} OR worker=${await walletSession()} ORDER BY created_at DESC LIMIT 100`
      : await sql`SELECT * FROM bounties WHERE status!='draft' ORDER BY created_at DESC LIMIT 100`;
    return Response.json({
      bounties: rows.map(bountyFromRow),
      serverTime: Date.now(),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const wallet = await walletSession();
    const parsed = draftSchema.safeParse(await jsonBody(request));
    if (!parsed.success)
      throw new HttpError(400, parsed.error.issues[0].message);
    const d = parsed.data;
    const agreement = canonicalAgreement(d);
    const hash = createHash("sha256").update(agreement).digest("hex");
    const id = randomUUID();
    const sql = database();
    const rows =
      await sql`INSERT INTO bounties(id,requester,title,description,category,requirements,agreement,requirements_hash,reward_lamports) VALUES(${id},${wallet},${d.title},${d.description},${d.category},${JSON.stringify(d.requirements)},${agreement},${hash},${parseSOL(d.reward).toString()}) RETURNING *`;
    return Response.json({ bounty: bountyFromRow(rows[0]) }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
