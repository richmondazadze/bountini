import { randomUUID } from "node:crypto";
import { z } from "zod";
import { accountSession } from "@/server/accounts";
import {
  database,
  failure,
  requireOrigin,
  jsonBody,
  HttpError,
} from "@/server/db";
import { consumeRate } from "@/server/rate-limit";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const { user } = await accountSession();
    const p = z
      .object({
        bountyId: z.uuid(),
        reason: z.string().trim().min(10).max(2000),
      })
      .safeParse(await jsonBody(request));
    if (!p.success)
      throw new HttpError(400, "Describe the issue in 10–2,000 characters");
    await consumeRate("report:" + user.id, 3);
    await database()`INSERT INTO reports(id,reporter_id,bounty_id,reason) VALUES(${randomUUID()},${user.id},${p.data.bountyId},${p.data.reason})`;
    return Response.json({ received: true }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
