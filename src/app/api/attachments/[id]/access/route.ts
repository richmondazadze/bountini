import { z } from "zod";
import { attachmentAccess, accessTicket } from "@/server/attachments";
import { failure, HttpError, requireOrigin } from "@/server/db";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireOrigin(request);
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(404, "Attachment not found");
    const { userId } = await attachmentAccess(id);
    return Response.json(
      {
        previewUrl: `/api/attachments/${id}?preview=1&ticket=${accessTicket(id, userId, true)}`,
        downloadUrl: `/api/attachments/${id}?ticket=${accessTicket(id, userId, false)}`,
        expiresIn: 300,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
