import { z } from "zod";
import { database, failure, HttpError, requireOrigin } from "@/server/db";
import {
  attachmentMetadata,
  uploadWorker,
  validateFile,
} from "@/server/attachments";
import { storeObject } from "@/server/attachment-storage";
import { consumeRate } from "@/server/rate-limit";
import { MAX_FILE_BYTES } from "@/domain/deliverables";
export const maxDuration = 60;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireOrigin(request);
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(404, "Quest not found");
    const worker = await uploadWorker(id);
    await consumeRate(`attachments:${worker}`, 12);
    // Multipart overhead fits below Vercel's function request limit.
    if (Number(request.headers.get("content-length")) > MAX_FILE_BYTES + 16000)
      throw new HttpError(413, "File exceeds 2 MiB");
    const raw = await request.arrayBuffer();
    if (raw.byteLength > MAX_FILE_BYTES + 16000)
      throw new HttpError(413, "File exceeds 2 MiB");
    let form: FormData;
    try {
      form = await new Response(raw, {
        headers: { "Content-Type": request.headers.get("content-type") || "" },
      }).formData();
    } catch {
      throw new HttpError(
        400,
        "Upload interrupted or invalid. Choose the file again and retry.",
      );
    }
    const file = form.get("file"),
      uploadId = form.get("uploadId");
    if (!(file instanceof File) || !z.uuid().safeParse(uploadId).success)
      throw new HttpError(400, "Choose a file and a valid upload ID");
    const value = await validateFile(file);
    const sql = database();
    const objectPath = `deliverables/${id}/${uploadId}/${value.sha256}`;
    // Serialize reservations per quest. Retries retain their original identity.
    const reserved = await sql.transaction([
      sql`SELECT id FROM bounties WHERE id=${id} FOR UPDATE`,
      sql`INSERT INTO attachments(id,bounty_id,worker,filename,size,content_type,sha256,object_path)
       SELECT ${String(uploadId)},${id},${worker},${value.filename},${value.size},${value.contentType},${value.sha256},${objectPath}
       WHERE (SELECT count(*) FROM attachments WHERE bounty_id=${id} AND status NOT IN ('deleted','deleting'))<40
       ON CONFLICT(id) DO NOTHING RETURNING id`,
      sql`SELECT * FROM attachments WHERE id=${String(uploadId)}`,
    ]);
    const row = reserved[2][0];
    if (!row)
      throw new HttpError(
        429,
        "Quest upload limit reached. Reuse existing attachments or wait for abandoned uploads to be cleaned up.",
      );
    if (
      row.worker !== worker ||
      row.bounty_id !== id ||
      row.sha256 !== value.sha256 ||
      row.filename !== value.filename ||
      Number(row.size) !== value.size ||
      row.content_type !== value.contentType
    )
      throw new HttpError(
        409,
        "This upload ID belongs to a different file. Choose the file again.",
      );
    if (row.status === "ready")
      return Response.json({ attachment: attachmentMetadata(row) });
    const active =
      await sql`UPDATE attachments SET updated_at=now() WHERE id=${String(uploadId)} AND status='uploading' RETURNING id`;
    if (!active[0])
      throw new HttpError(409, "Upload expired. Choose the file again.");
    await storeObject(objectPath, value.bytes, value.sha256, value.contentType);
    const ready =
      await sql`UPDATE attachments SET status='ready',updated_at=now() WHERE id=${String(uploadId)} AND status='uploading' RETURNING *`;
    if (!ready[0])
      throw new HttpError(409, "Upload expired. Choose the file again.");
    return Response.json({ attachment: attachmentMetadata(ready[0]) });
  } catch (e) {
    return failure(e);
  }
}
