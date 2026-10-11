import { get, put, del } from "@vercel/blob";
import { HttpError } from "./db";
import { contentHash } from "./manifest";
import { MAX_FILE_BYTES } from "@/domain/deliverables";

function configured() {
  if (
    !process.env.BLOB_READ_WRITE_TOKEN &&
    !(process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)
  )
    throw new HttpError(
      503,
      "Private file storage is not configured. Your written response and links are preserved.",
    );
}
export async function readObject(path: string) {
  configured();
  const blob = await get(path, { access: "private", useCache: false });
  if (!blob?.stream || blob.statusCode !== 200)
    throw new HttpError(404, "Attachment is unavailable. Please retry.");
  const reader = blob.stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_FILE_BYTES)
        throw new HttpError(413, "Stored attachment exceeds the limit");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks);
}
export async function storeObject(
  path: string,
  bytes: Buffer,
  hash: string,
  contentType: string,
) {
  configured();
  try {
    await put(path, bytes, {
      access: "private",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
  } catch (e) {
    // A lost upload response is safely retryable, including concurrent retries.
    // Even a transport failure may mean put succeeded. A verified immutable
    // object at this exact path is the only acceptable retry success signal.
    let existing: Buffer;
    try {
      existing = await readObject(path);
    } catch {
      throw e;
    }
    if (contentHash(existing) !== hash)
      throw new HttpError(409, "Stored file does not match this upload");
  }
}
export async function deleteObject(path: string) {
  configured();
  await del(path);
}
