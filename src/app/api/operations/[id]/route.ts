import { z } from "zod";
import { walletSession } from "@/server/auth";
import {
  database,
  failure,
  requireOrigin,
  jsonBody,
  HttpError,
} from "@/server/db";
import { reconcileOperation } from "@/server/reconcile";
const schema = z
  .object({
    signature: z
      .string()
      .regex(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/)
      .optional(),
    status: z.enum(["rejected"]).optional(),
  })
  .refine((v) => Boolean(v.signature) !== Boolean(v.status));
async function owned(id: string, actor: string) {
  if (!z.uuid().safeParse(id).success)
    throw new HttpError(404, "Operation not found");
  const rows =
    await database()`SELECT * FROM operations WHERE id=${id} AND actor=${actor}`;
  if (!rows[0]) throw new HttpError(404, "Operation not found");
  return rows[0];
}
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await owned(id, await walletSession());
    return Response.json({ operation: await reconcileOperation(id) });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireOrigin(request);
    const { id } = await params;
    const actor = await walletSession();
    const op = await owned(id, actor);
    const parsed = schema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new HttpError(400, "Invalid operation update");
    if (["confirmed", "failed", "rejected"].includes(op.status))
      return Response.json({ operation: op });
    const { signature: tx } = parsed.data;
    if (op.signature && op.signature !== tx)
      throw new HttpError(409, "A submitted operation cannot be replaced");
    const sql = database();
    const updated = tx
      ? await sql`UPDATE operations SET signature=${tx},status='confirming',updated_at=now() WHERE id=${id} AND actor=${actor} AND signature IS NULL AND status IN ('waiting-wallet','submitting','confirming','unknown') RETURNING *`
      : await sql`UPDATE operations SET status='rejected',updated_at=now() WHERE id=${id} AND actor=${actor} AND signature IS NULL AND status IN ('waiting-wallet','submitting','confirming','unknown') RETURNING *`;
    // The conditional transition may lose to another signature, a rejection,
    // or reconciliation. Return the winner, never a status from the stale read.
    const current = updated[0] || (await owned(id, actor));
    if (tx && current.signature && current.signature !== tx)
      throw new HttpError(409, "A submitted operation cannot be replaced");
    return Response.json({
      operation:
        tx &&
        current.signature === tx &&
        !["confirmed", "failed", "rejected"].includes(current.status)
          ? await reconcileOperation(id)
          : current,
    });
  } catch (e) {
    return failure(e);
  }
}
