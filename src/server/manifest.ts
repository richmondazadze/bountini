import { createHash } from "node:crypto";
import type { Attachment, Manifest } from "@/domain/deliverables";
import { submissionInput } from "@/domain/deliverables";

const normalized = (x: string) => x.normalize("NFC").replace(/\r\n?/g, "\n");
// Fixed key order, UTF-8, NFC/LF strings, sorted attachment IDs. No timestamps,
// operation IDs, storage paths, or access URLs enter the agreement hash.
export function makeManifest(
  bountyId: string,
  version: number,
  input: unknown,
  attachments: Attachment[],
): Manifest {
  const value = submissionInput.parse(input);
  if (
    attachments.length !== value.attachmentIds.length ||
    attachments.some((a) => !value.attachmentIds.includes(a.id))
  )
    throw new Error("Attachment set does not match submission");
  return {
    format: "bountini-deliverables-v1",
    bountyId,
    version,
    writtenResponse: normalized(value.writtenResponse),
    links: value.links.map((l) => ({
      label: normalized(l.label),
      url: normalized(l.url),
    })),
    attachments: [...attachments]
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((a) => ({
        id: a.id,
        filename: normalized(a.filename),
        size: Number(a.size),
        contentType: a.contentType,
        sha256: a.sha256,
      })),
  };
}
export function serializeManifest(manifest: Manifest) {
  return JSON.stringify(
    makeManifest(
      manifest.bountyId,
      manifest.version,
      {
        writtenResponse: manifest.writtenResponse,
        links: manifest.links,
        attachmentIds: manifest.attachments.map((a) => a.id),
      },
      manifest.attachments,
    ),
  );
}
export const contentHash = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
export const manifestHash = (manifest: Manifest) =>
  contentHash(serializeManifest(manifest));
