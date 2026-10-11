import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  transaction: vi.fn(),
  worker: vi.fn(),
  validate: vi.fn(),
  store: vi.fn(),
  rate: vi.fn(),
  access: vi.fn(),
  bytes: vi.fn(),
}));
vi.mock("@/server/db", async (original) => ({
  ...(await original<typeof import("@/server/db")>()),
  database: () => Object.assign(mocks.sql, { transaction: mocks.transaction }),
}));
vi.mock("@/server/attachments", async (original) => ({
  ...(await original<typeof import("@/server/attachments")>()),
  uploadWorker: mocks.worker,
  validateFile: mocks.validate,
  attachmentAccess: mocks.access,
  verifiedBytes: mocks.bytes,
}));
vi.mock("@/server/attachment-storage", () => ({ storeObject: mocks.store }));
vi.mock("@/server/rate-limit", () => ({ consumeRate: mocks.rate }));
import { POST as upload } from "@/app/api/bounties/[id]/attachments/route";
import { POST as prepare } from "@/app/api/bounties/[id]/submissions/prepare/route";
import { GET as download } from "@/app/api/attachments/[id]/route";
import { accessTicket } from "@/server/attachments";
import { HttpError } from "@/server/db";
const id = "11111111-1111-4111-8111-111111111111",
  ctx = { params: Promise.resolve({ id }) };
const metadata = {
  id,
  bounty_id: id,
  worker: "worker",
  filename: "answer.txt",
  size: 15,
  content_type: "text/plain",
  sha256: "a".repeat(64),
  status: "uploading",
};
function uploadRequest() {
  const form = new FormData();
  form.set("uploadId", id);
  form.set("file", new File(["Completed work!"], "answer.txt"));
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { Origin: "http://localhost:3000" },
    body: form,
  });
}
beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  process.env.APP_ORIGIN = "http://localhost:3000";
  process.env.BETTER_AUTH_SECRET = "controlled ticket secret";
  mocks.worker.mockResolvedValue("worker");
  mocks.rate.mockResolvedValue(undefined);
  mocks.validate.mockResolvedValue({
    filename: "answer.txt",
    size: 15,
    contentType: "text/plain",
    sha256: "a".repeat(64),
    bytes: Buffer.from("Completed work!"),
  });
});
it("denies uploads from anyone except the verified assigned worker", async () => {
  mocks.worker.mockRejectedValue(new HttpError(403, "Assigned worker only"));
  expect((await upload(uploadRequest(), ctx)).status).toBe(403);
  expect(mocks.validate).not.toHaveBeenCalled();
  expect(mocks.store).not.toHaveBeenCalled();
});
it("rejects oversized uploads before parsing their bodies", async () => {
  const request = uploadRequest();
  request.headers.set("content-length", "3000000");
  expect((await upload(request, ctx)).status).toBe(413);
  expect(mocks.store).not.toHaveBeenCalled();
});
it("reports a truncated multipart upload as retryable invalid input", async () => {
  const request = new Request("http://localhost/api", {
    method: "POST",
    headers: {
      Origin: "http://localhost:3000",
      "Content-Type": "multipart/form-data; boundary=missing",
    },
    body: "--missing\r\ncut off",
  });
  expect((await upload(request, ctx)).status).toBe(400);
  expect(mocks.store).not.toHaveBeenCalled();
});
it("retries a completed upload without rewriting it", async () => {
  mocks.transaction.mockResolvedValue([
    [],
    [],
    [{ ...metadata, status: "ready" }],
  ]);
  const response = await upload(uploadRequest(), ctx);
  expect(response.status).toBe(200);
  expect((await response.json()).attachment.id).toBe(id);
  expect(mocks.store).not.toHaveBeenCalled();
});
it("retains the reservation when object storage fails and resumes the same upload", async () => {
  mocks.transaction.mockResolvedValue([[], [], [metadata]]);
  mocks.sql.mockResolvedValue([{ id }]);
  mocks.store.mockRejectedValueOnce(new HttpError(503, "Storage interrupted"));
  expect((await upload(uploadRequest(), ctx)).status).toBe(503);
  mocks.store.mockResolvedValue(undefined);
  mocks.sql
    .mockResolvedValueOnce([{ id }])
    .mockResolvedValueOnce([{ ...metadata, status: "ready" }]);
  expect((await upload(uploadRequest(), ctx)).status).toBe(200);
  expect(mocks.store.mock.calls[0][0]).toBe(mocks.store.mock.calls[1][0]);
});
it("rejects reuse of an upload ID for different bytes", async () => {
  mocks.transaction.mockResolvedValue([
    [],
    [],
    [{ ...metadata, sha256: "b".repeat(64) }],
  ]);
  expect((await upload(uploadRequest(), ctx)).status).toBe(409);
  expect(mocks.store).not.toHaveBeenCalled();
});
it("does not freeze an unfinished or foreign upload", async () => {
  mocks.sql
    .mockResolvedValueOnce([{ revision_used: false }])
    .mockResolvedValueOnce([]);
  const response = await prepare(
    new Request("http://localhost/api", {
      method: "POST",
      headers: { Origin: "http://localhost:3000" },
      body: JSON.stringify({ attachmentIds: [id] }),
    }),
    ctx,
  );
  expect(response.status).toBe(409);
  expect(mocks.transaction).not.toHaveBeenCalled();
});
it("serves uploaded code as a download and never as executable HTML", async () => {
  mocks.access.mockResolvedValue({
    row: { ...metadata, filename: "result.html" },
    userId: "account",
  });
  mocks.bytes.mockResolvedValue(Buffer.from("<script>bad()</script>"));
  const ticket = accessTicket(id, "account", false);
  const response = await download(
    new Request(`http://localhost/api?ticket=${ticket}`),
    ctx,
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/octet-stream");
  expect(response.headers.get("content-disposition")).toMatch(/^attachment/);
  expect(response.headers.get("content-security-policy")).toContain("sandbox");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("denies expired or copied access URLs before loading file bytes", async () => {
  mocks.access.mockResolvedValue({ row: metadata, userId: "other-account" });
  const ticket = accessTicket(id, "account", false);
  expect(
    (await download(new Request(`http://localhost/api?ticket=${ticket}`), ctx))
      .status,
  ).toBe(403);
  expect(mocks.bytes).not.toHaveBeenCalled();
});
