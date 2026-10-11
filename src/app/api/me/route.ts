import { z } from "zod";
import { accountSession } from "@/server/accounts";
import {
  database,
  failure,
  requireOrigin,
  jsonBody,
  HttpError,
} from "@/server/db";
const schema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  activeRole: z.enum(["requester", "worker"]).optional(),
  bio: z.string().trim().max(1000).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  portfolioUrl: z
    .union([
      z.literal(""),
      z
        .url()
        .refine((v) => new URL(v).protocol === "https:", "Use an HTTPS link"),
    ])
    .optional(),
});
export async function GET() {
  try {
    const { user } = await accountSession();
    const sql = database();
    await sql`INSERT INTO profiles(user_id) VALUES(${user.id}) ON CONFLICT DO NOTHING`;
    const [profile] =
      await sql`SELECT active_role AS "activeRole",bio,skills,portfolio_url AS "portfolioUrl" FROM profiles WHERE user_id=${user.id}`;
    const wallets =
      await sql`SELECT wallet,linked_at FROM wallet_links WHERE user_id=${user.id} ORDER BY linked_at`;
    return Response.json(
      {
        user: { id: user.id, name: user.name, email: user.email },
        profile,
        wallets,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    requireOrigin(request);
    const { user } = await accountSession();
    const p = schema.safeParse(await jsonBody(request));
    if (!p.success) throw new HttpError(400, p.error.issues[0].message);
    const d = p.data;
    const sql = database();
    await sql.transaction([
      sql`INSERT INTO profiles(user_id) VALUES(${user.id}) ON CONFLICT DO NOTHING`,
      sql`UPDATE profiles SET active_role=coalesce(${d.activeRole ?? null},active_role),bio=coalesce(${d.bio ?? null},bio),skills=coalesce(${d.skills ? JSON.stringify(d.skills) : null}::jsonb,skills),portfolio_url=coalesce(${d.portfolioUrl ?? null},portfolio_url),updated_at=now() WHERE user_id=${user.id}`,
      sql`UPDATE auth_users SET name=coalesce(${d.name ?? null},name),"updatedAt"=now() WHERE id=${user.id}`,
    ]);
    return Response.json({ saved: true });
  } catch (e) {
    return failure(e);
  }
}
