import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  MAX_FILE_BYTES,
  TEXT_EXTENSIONS,
  type Attachment,
} from "@/domain/deliverables";
import { database, HttpError } from "./db";
import { participantAccount } from "./accounts";
import { walletSession } from "./auth";
import { canAct } from "@/domain/bounty";
import { bountyFromRow } from "./bounties";
import { contentHash } from "./manifest";
import { readObject } from "./attachment-storage";

export function attachmentMetadata(row: Record<string, unknown>): Attachment {
  return {
    id: String(row.id),
    filename: String(row.filename),
    size: Number(row.size),
    contentType: String(row.content_type),
    sha256: String(row.sha256),
  };
}
export async function uploadWorker(id: string) {
  const actor = await walletSession();
  const rows = await database()`SELECT * FROM bounties WHERE id=${id}`;
  if (
    !rows[0] ||
    !canAct(
      bountyFromRow(rows[0]),
      "submit",
      actor,
      Math.floor(Date.now() / 1000),
    )
  )
    throw new HttpError(
      403,
      "Only the assigned worker can prepare deliverables before the delivery deadline",
    );
  return actor;
}
export async function validateFile(file: File) {
  if (!file.size || file.size > MAX_FILE_BYTES)
    throw new HttpError(413, "Each file must be nonempty and at most 2 MiB");
  const filename = file.name.normalize("NFC");
  if (!filename || filename.length > 180 || /[\x00-\x1f\x7f/\\]/.test(filename))
    throw new HttpError(
      400,
      "Use a filename without paths or control characters (at most 180 characters)",
    );
  const extension = filename.split(".").at(-1)?.toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());
  let contentType: string;
  try {
    if (["png", "jpg", "jpeg", "webp"].includes(extension || "")) {
      const image = sharp(bytes, {
        limitInputPixels: 16000000,
        animated: false,
      });
      const meta = await image.metadata();
      const expected = extension === "jpg" ? "jpeg" : extension;
      if (meta.format !== expected || (meta.pages || 1) > 1)
        throw new Error("Invalid image");
      await image.stats(); // Decode pixels; reject malformed data and decompression bombs.
      contentType = "image/" + expected;
    } else if (extension === "pdf") {
      if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-")))
        throw new Error("Invalid PDF");
      const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
      if (pdf.getPageCount() < 1 || pdf.getPageCount() > 20)
        throw new Error("PDF must contain 1–20 pages");
      contentType = "application/pdf";
    } else if (TEXT_EXTENSIONS.includes(extension || "")) {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (!text.trim() || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text))
        throw new Error("Upload UTF-8 text without binary content");
      contentType = "text/plain";
    } else throw new Error("Unsupported file type");
  } catch (e) {
    throw new HttpError(
      400,
      e instanceof Error ? e.message : "Invalid attachment",
    );
  }
  // Browser MIME hints are not trusted; derive the type from validated bytes.
  return {
    filename,
    bytes,
    size: bytes.length,
    contentType,
    sha256: contentHash(bytes),
  };
}
export async function attachmentAccess(id: string) {
  const rows =
    await database()`SELECT * FROM attachments WHERE id=${id} AND status='ready'`;
  if (!rows[0]) throw new HttpError(404, "Attachment not found");
  const row = rows[0];
  const { session, bounty } = await participantAccount(row.bounty_id);
  const workerOwns =
    await database()`SELECT 1 FROM wallet_links WHERE user_id=${session.user.id} AND wallet=${row.worker} AND wallet=${bounty.worker}`;
  if (!workerOwns[0]) {
    const confirmed =
      await database()`SELECT 1 FROM manifest_attachments a JOIN submission_manifests m ON m.id=a.manifest_id WHERE a.attachment_id=${id} AND m.bounty_id=${row.bounty_id} AND m.confirmed=true`;
    if (!confirmed[0])
      throw new HttpError(
        403,
        "The requester can access deliverables after submission confirmation",
      );
  }
  return { row, userId: session.user.id };
}
function mac(value: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret)
    throw new HttpError(503, "Attachment access signing is unavailable");
  return createHmac("sha256", secret)
    .update("bountini-attachment-v1:" + value)
    .digest("hex");
}
export function accessTicket(
  id: string,
  user: string,
  preview: boolean,
  now = Date.now(),
) {
  const expiry = Math.floor(now / 1000) + 300;
  const value = `${id}:${user}:${preview}:${expiry}`;
  return `${expiry}.${mac(value)}`;
}
export function verifyTicket(
  token: string,
  id: string,
  user: string,
  preview: boolean,
  now = Date.now(),
) {
  const [expiry, digest, extra] = token.split(".");
  if (
    extra ||
    !/^\d{10}$/.test(expiry || "") ||
    !/^[0-9a-f]{64}$/.test(digest || "") ||
    Number(expiry) < Math.floor(now / 1000) ||
    Number(expiry) > Math.floor(now / 1000) + 300
  )
    throw new HttpError(
      403,
      "Attachment link expired. Open it again to get a fresh link.",
    );
  if (
    !timingSafeEqual(
      Buffer.from(digest, "hex"),
      Buffer.from(mac(`${id}:${user}:${preview}:${expiry}`), "hex"),
    )
  )
    throw new HttpError(403, "Attachment link is invalid for this account");
}
export async function verifiedBytes(row: Record<string, unknown>) {
  const bytes = await readObject(String(row.object_path));
  if (bytes.length !== Number(row.size) || contentHash(bytes) !== row.sha256)
    throw new HttpError(409, "Attachment integrity check failed");
  return bytes;
}
