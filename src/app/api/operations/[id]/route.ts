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
    const op = await owned(id, await walletSession());
    const parsed = schema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new HttpError(400, "Invalid operation update");
    if (["confirmed", "failed", "rejected"].includes(op.status))
      return Response.json({ operation: op });
    const { signature: tx, status } = parsed.data;
    if (op.signature && op.signature !== tx)
      throw new HttpError(409, "A submitted operation cannot be replaced");
    const sql = database();
    if (tx)
      await sql`UPDATE operations SET signature=${tx},status='confirming',updated_at=now() WHERE id=${id} AND signature IS NULL`;
    else if (!op.signature && status === "rejected")
      await sql`UPDATE operations SET status='rejected',updated_at=now() WHERE id=${id} AND signature IS NULL`;
    return Response.json({
      operation: tx
        ? await reconcileOperation(id)
        : { ...op, status: "rejected" },
    });
  } catch (e) {
    return failure(e);
  }
}
