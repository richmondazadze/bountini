import { timingSafeEqual } from "node:crypto";
import { database, failure, HttpError } from "@/server/db";
import { deleteObject } from "@/server/attachment-storage";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const received = request.headers.get("authorization") || "";
    if (
      !secret ||
      received.length !== `Bearer ${secret}`.length ||
      !timingSafeEqual(Buffer.from(received), Buffer.from(`Bearer ${secret}`))
    )
      throw new HttpError(401, "Unauthorized cleanup");
    const sql = database();
    // Row lock and bind_attachment's lock serialize cleanup against freezing.
    // Preserve EVERY frozen attempt, including rejected or expired signatures.
    const rows =
      await sql`UPDATE attachments SET status='deleting',updated_at=now() WHERE id IN (
      SELECT a.id FROM attachments a WHERE ((a.status IN ('uploading','ready') AND a.updated_at<now()-interval '24 hours') OR a.status='deleting')
      AND NOT EXISTS(SELECT 1 FROM manifest_attachments m WHERE m.attachment_id=a.id)
      ORDER BY a.updated_at LIMIT 40 FOR UPDATE SKIP LOCKED
    ) RETURNING id,object_path`;
    let deleted = 0;
    for (const row of rows) {
      try {
        await deleteObject(row.object_path);
        await sql`UPDATE attachments SET status='deleted',updated_at=now() WHERE id=${row.id} AND status='deleting'`;
        deleted++;
      } catch {
        /* Keep tombstone for the next run; never rebind a deleting file. */
      }
    }
    return Response.json({ selected: rows.length, deleted });
  } catch (e) {
    return failure(e);
  }
}
