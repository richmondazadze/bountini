import { z } from "zod";
import {
  attachmentAccess,
  verifyTicket,
  verifiedBytes,
} from "@/server/attachments";
import { failure, HttpError } from "@/server/db";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(404, "Attachment not found");
    // Authorization is repeated on every access; a copied URL grants no access.
    const { row, userId } = await attachmentAccess(id);
    const q = new URL(request.url).searchParams;
    const preview = q.get("preview") === "1";
    verifyTicket(q.get("ticket") || "", id, userId, preview);
    const bytes = await verifiedBytes(row);
    const inline = preview && String(row.content_type).startsWith("image/");
    const plainPreview = preview && row.content_type === "text/plain";
    return new Response(bytes, {
      headers: {
        "Content-Type": inline
          ? row.content_type
          : plainPreview
            ? "text/plain; charset=utf-8"
            : "application/octet-stream",
        "Content-Disposition": `${inline || plainPreview ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "sandbox; default-src 'none'; frame-ancestors 'none'",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
