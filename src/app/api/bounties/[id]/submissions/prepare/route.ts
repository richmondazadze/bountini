import { randomUUID } from "node:crypto";
import { z } from "zod";
import { submissionInput } from "@/domain/deliverables";
import { attachmentMetadata, uploadWorker } from "@/server/attachments";
import { makeManifest, manifestHash } from "@/server/manifest";
import {
  database,
  failure,
  HttpError,
  jsonBody,
  requireOrigin,
} from "@/server/db";
import { consumeRate } from "@/server/rate-limit";
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
    await consumeRate(`manifest:${worker}`, 12);
    const input = submissionInput.safeParse(await jsonBody(request));
    if (!input.success) throw new HttpError(400, input.error.issues[0].message);
    const sql = database();
    const [b] = await sql`SELECT revision_used FROM bounties WHERE id=${id}`;
    const attachments = input.data.attachmentIds.length
      ? await sql`SELECT * FROM attachments WHERE id=ANY(${input.data.attachmentIds}::uuid[]) AND bounty_id=${id} AND worker=${worker} AND status='ready'`
      : [];
    if (attachments.length !== input.data.attachmentIds.length)
      throw new HttpError(
        409,
        "Wait for all uploads to finish, or remove unavailable files",
      );
    const manifest = makeManifest(
      id,
      b.revision_used ? 1 : 0,
      input.data,
      attachments.map(attachmentMetadata),
    );
    const hash = manifestHash(manifest);
    const manifestId = randomUUID();
    // Attachment binding takes row locks; cleanup cannot race a frozen snapshot.
    const results = await sql.transaction([
      sql`INSERT INTO submission_manifests(id,bounty_id,worker,revision,content_hash,manifest) VALUES(${manifestId},${id},${worker},${manifest.version},${hash},${JSON.stringify(manifest)}::jsonb) ON CONFLICT(bounty_id,revision,content_hash) DO NOTHING`,
      sql`INSERT INTO manifest_attachments(manifest_id,attachment_id) SELECT m.id,a.id FROM submission_manifests m JOIN attachments a ON a.id=ANY(${input.data.attachmentIds}::uuid[]) WHERE m.bounty_id=${id} AND m.revision=${manifest.version} AND m.content_hash=${hash} AND NOT EXISTS(SELECT 1 FROM manifest_attachments ma WHERE ma.manifest_id=m.id AND ma.attachment_id=a.id) ON CONFLICT DO NOTHING`,
      sql`SELECT id FROM submission_manifests WHERE bounty_id=${id} AND revision=${manifest.version} AND content_hash=${hash}`,
    ]);
    return Response.json(
      { id: results[2][0].id, contentHash: hash, manifest },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
