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
    const params = new URL(request.url).searchParams;
    const mine = params.get("mine") === "true";
    const page = Number(params.get("page") || "0");
    if (!Number.isInteger(page) || page < 0 || page > 10000)
      throw new HttpError(400, "Invalid page");
    const query = (params.get("q") || "").slice(0, 100);
    const category = params.get("category") || "All categories";
    const role = params.get("role") || "All";
    const state = params.get("state") || "All states";
    const wallet = mine ? await walletSession() : "";
    const sql = database();
    const rows =
      await sql`SELECT * FROM bounties WHERE (${mine} AND (requester=${wallet} OR worker=${wallet}) OR NOT ${mine} AND status!='draft') AND (title ILIKE ${"%" + query + "%"} OR description ILIKE ${"%" + query + "%"}) AND (${category}='All categories' OR category=${category}) AND (${state}='All states' OR status=${state}) AND (${role}='All' OR ${role}='Posted' AND requester=${wallet} OR ${role}='Claimed' AND worker=${wallet}) ORDER BY created_at DESC,id DESC LIMIT 26 OFFSET ${page * 25}`;

    return Response.json({
      bounties: rows.slice(0, 25).map(bountyFromRow),
      hasMore: rows.length > 25,
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
