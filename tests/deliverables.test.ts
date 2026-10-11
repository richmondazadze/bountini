import { beforeEach, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import {
  makeManifest,
  manifestHash,
  serializeManifest,
} from "@/server/manifest";
import { submissionInput, MAX_FILE_BYTES } from "@/domain/deliverables";
import {
  accessTicket,
  verifyTicket,
  validateFile,
  attachmentAccess,
} from "@/server/attachments";
import { HttpError } from "@/server/db";
const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  participant: vi.fn(),
  wallet: vi.fn(),
}));
vi.mock("@/server/db", async (original) => ({
  ...(await original<typeof import("@/server/db")>()),
  database: () => mocks.sql,
}));
vi.mock("@/server/accounts", () => ({ participantAccount: mocks.participant }));
vi.mock("@/server/auth", () => ({ walletSession: mocks.wallet }));
const id = "11111111-1111-4111-8111-111111111111";
const a = {
  id,
  filename: "answer.txt",
  size: 12,
  contentType: "text/plain",
  sha256: "a".repeat(64),
};
beforeEach(() => {
  mocks.sql.mockReset();
  mocks.participant.mockReset();
  mocks.wallet.mockReset();
  process.env.BETTER_AUTH_SECRET = "controlled attachment ticket test secret";
});
it("hashes stable UTF-8 snapshots regardless of attachment order, CRLF or composed characters", () => {
  const second = { ...a, id: "22222222-2222-4222-8222-222222222222" };
  const m = makeManifest(
    id,
    0,
    {
      writtenResponse: "Cafe\u0301 completed\r\nDeliverable",
      attachmentIds: [a.id, second.id],
    },
    [second, a],
  );
  const equivalent = makeManifest(
    id,
    0,
    {
      writtenResponse: "Café completed\nDeliverable",
      attachmentIds: [second.id, a.id],
    },
    [a, second],
  );
  expect(manifestHash(m)).toBe(manifestHash(equivalent));
  expect(manifestHash(JSON.parse(JSON.stringify(m)))).toBe(manifestHash(m));
  expect(serializeManifest(m)).not.toContain("object_path");
  expect(manifestHash({ ...m, version: 1 })).not.toBe(manifestHash(m));
  expect(
    manifestHash({
      ...m,
      attachments: [{ ...a, sha256: "b".repeat(64) }, second],
    }),
  ).not.toBe(manifestHash(m));
});
it("requires substantive content and permits text, links or files independently", () => {
  expect(submissionInput.safeParse({ writtenResponse: "ok" }).success).toBe(
    false,
  );
  expect(
    submissionInput.safeParse({ writtenResponse: "Completed explanation" })
      .success,
  ).toBe(true);
  expect(
    submissionInput.safeParse({
      links: [
        { label: "Repository commit", url: "https://example.org/commit/abc" },
      ],
    }).success,
  ).toBe(true);
  expect(submissionInput.safeParse({ attachmentIds: [id] }).success).toBe(true);
  expect(
    submissionInput.safeParse({
      links: [{ label: "Script", url: "javascript:alert(1)" }],
    }).success,
  ).toBe(false);
  expect(
    submissionInput.safeParse({
      links: [
        { label: "Credentials", url: "https://secret:password@example.org" },
      ],
    }).success,
  ).toBe(false);
  expect(submissionInput.safeParse({ attachmentIds: [id, id] }).success).toBe(
    false,
  );
});
it("validates bytes instead of browser content types, and keeps HTML as plain text", async () => {
  const html = await validateFile(
    new File(["<script>danger()</script>"], "snapshot.html", {
      type: "text/html",
    }),
  );
  expect(html.contentType).toBe("text/plain");
  const png = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  expect(
    (
      await validateFile(
        new File([new Uint8Array(png)], "result.png", { type: "text/html" }),
      )
    ).contentType,
  ).toBe("image/png");
  await expect(
    validateFile(new File(["not an image"], "fake.png", { type: "image/png" })),
  ).rejects.toThrow();
  await expect(
    validateFile(new File([Uint8Array.of(0, 255, 0)], "fake.txt")),
  ).rejects.toThrow();
  await expect(
    validateFile(new File(["data"], "../unsafe.txt")),
  ).rejects.toThrow();
  await expect(
    validateFile(new File(["data"], "unsafe.exe")),
  ).rejects.toThrow();
  await expect(
    validateFile(new File([new Uint8Array(MAX_FILE_BYTES + 1)], "large.txt")),
  ).rejects.toThrow("2 MiB");
});
it("accepts bounded valid PDFs and rejects malformed or excessive pages", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  expect(
    (
      await validateFile(
        new File([new Uint8Array(await pdf.save())], "snapshot.pdf"),
      )
    ).contentType,
  ).toBe("application/pdf");
  await expect(
    validateFile(new File(["%PDF-invalid"], "fake.pdf")),
  ).rejects.toThrow();
  for (let i = 0; i < 20; i++) pdf.addPage();
  await expect(
    validateFile(new File([new Uint8Array(await pdf.save())], "large.pdf")),
  ).rejects.toThrow("1–20 pages");
});
it("binds short-lived access to the account, file and preview mode", () => {
  const now = 1800000000000;
  const ticket = accessTicket(id, "worker", true, now);
  expect(() => verifyTicket(ticket, id, "worker", true, now)).not.toThrow();
  for (const [user, preview, time] of [
    ["requester", true, now],
    ["worker", false, now],
    ["worker", true, now + 301000],
  ] as const)
    expect(() => verifyTicket(ticket, id, user, preview, time)).toThrow();
  expect(() =>
    verifyTicket(ticket + ".extra", id, "worker", true, now),
  ).toThrow();
});
it("denies outsiders before private storage is read", async () => {
  mocks.sql.mockResolvedValueOnce([{ id, bounty_id: id, worker: "worker" }]);
  mocks.participant.mockRejectedValue(new HttpError(403, "Only participants"));
  await expect(attachmentAccess(id)).rejects.toMatchObject({ status: 403 });
  expect(mocks.sql).toHaveBeenCalledTimes(1);
});
it("allows the assigned worker's unconfirmed uploads but not the requester's", async () => {
  mocks.participant.mockResolvedValue({
    session: { user: { id: "account" } },
    bounty: { worker: "worker" },
  });
  mocks.sql
    .mockResolvedValueOnce([{ id, bounty_id: id, worker: "worker" }])
    .mockResolvedValueOnce([{}]);
  await expect(attachmentAccess(id)).resolves.toMatchObject({
    userId: "account",
  });
  mocks.sql
    .mockResolvedValueOnce([{ id, bounty_id: id, worker: "worker" }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([]);
  await expect(attachmentAccess(id)).rejects.toMatchObject({ status: 403 });
  mocks.sql
    .mockResolvedValueOnce([{ id, bounty_id: id, worker: "worker" }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{}]);
  await expect(attachmentAccess(id)).resolves.toMatchObject({
    userId: "account",
  });
});
