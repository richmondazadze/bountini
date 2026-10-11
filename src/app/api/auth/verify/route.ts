import { randomBytes, createPublicKey, verify } from "node:crypto";
import { getBase58Encoder } from "@solana/kit";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  database,
  failure,
  jsonBody,
  requireOrigin,
  HttpError,
} from "@/server/db";
import { COOKIE, tokenHash } from "@/server/auth";
const schema = z.object({
  id: z.uuid(),
  signature: z.array(z.number().int().min(0).max(255)).length(64),
});
export async function POST(request: Request) {
  try {
    const origin = requireOrigin(request);
    const parsed = schema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new HttpError(400, "Invalid wallet signature");
    const { id, signature } = parsed.data;
    const sql = database();
    const rows =
      await sql`SELECT * FROM auth_challenges WHERE id=${id} AND origin=${origin} AND consumed_at IS NULL AND expires_at>now()`;
    const c = rows[0];
    if (!c) throw new HttpError(401, "Challenge expired or already used");
    const keyBytes = getBase58Encoder().encode(c.wallet);
    const key = createPublicKey({
      key: Buffer.concat([
        Buffer.from("302a300506032b6570032100", "hex"),
        Buffer.from(keyBytes),
      ]),
      format: "der",
      type: "spki",
    });
    if (!verify(null, Buffer.from(c.message), key, Buffer.from(signature)))
      throw new HttpError(401, "Signature does not match wallet");
    const token = randomBytes(32).toString("base64url");
    const claimed =
      await sql`WITH consumed AS (UPDATE auth_challenges SET consumed_at=now() WHERE id=${id} AND consumed_at IS NULL AND expires_at>now() RETURNING wallet) INSERT INTO sessions(token_hash,wallet,expires_at) SELECT ${tokenHash(token)},wallet,now()+interval '12 hours' FROM consumed RETURNING wallet`;
    if (!claimed[0]) throw new HttpError(401, "Challenge already used");
    (await cookies()).set(COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 43200,
    });
    return Response.json({ wallet: claimed[0].wallet });
  } catch (e) {
    return failure(e);
  }
}
