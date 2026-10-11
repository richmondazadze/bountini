import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ sql: vi.fn(), bytes: vi.fn() }));
vi.mock("@/server/db", () => ({ database: () => mocks.sql }));
vi.mock("@/server/attachments", () => ({ verifiedBytes: mocks.bytes }));
import { reviewMaterials } from "@/server/review-materials";
import type { Manifest } from "@/domain/deliverables";
const file = {
  id: "file",
  filename: "answer.txt",
  size: 6,
  contentType: "text/plain",
  sha256: "a".repeat(64),
};
const manifest: Manifest = {
  format: "bountini-deliverables-v1",
  bountyId: "quest",
  version: 0,
  writtenResponse: "Work",
  links: [{ label: "Repository", url: "https://example.org/repo" }],
  attachments: [file],
};
beforeEach(() => {
  mocks.sql.mockReset();
  mocks.bytes.mockReset();
  delete process.env.GEMINI_MODEL;
});
it("supplies verified text but never fetches the link destination", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  mocks.sql.mockResolvedValue([
    { sha256: file.sha256, size: 6, content_type: "text/plain" },
  ]);
  mocks.bytes.mockResolvedValue(Buffer.from("Answer"));
  const result = await reviewMaterials(manifest, "Work");
  expect(result.inventory[1]).toMatchObject({
    status: "not-assessed",
    detail: expect.stringContaining("not fetched"),
  });
  expect(result.inventory[2].status).toBe("supplied");
  expect(result.parts[0]).toMatchObject({
    text: expect.stringContaining("Answer"),
  });
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});
it("reports unreadable materials instead of claiming they were assessed", async () => {
  mocks.sql.mockResolvedValue([
    { sha256: file.sha256, size: 6, content_type: "text/plain" },
  ]);
  mocks.bytes.mockRejectedValue(new Error("Storage unavailable"));
  const result = await reviewMaterials(manifest, "Work");
  expect(result.inventory[2].status).toBe("not-assessed");
  expect(result.parts).toEqual([]);
});
it("bounds code extraction and refuses media for unverified model configurations", async () => {
  const long = { ...file, size: 30000 };
  mocks.sql.mockResolvedValue([
    { sha256: file.sha256, size: long.size, content_type: "text/plain" },
  ]);
  mocks.bytes.mockResolvedValue(Buffer.from("x".repeat(long.size)));
  const result = await reviewMaterials(
    { ...manifest, attachments: [long] },
    "Work",
  );
  expect(result.inventory[2].detail).toContain("First 20000 of 30000");
  process.env.GEMINI_MODEL = "unverified-model";
  const skipped = await reviewMaterials(
    { ...manifest, attachments: [{ ...file, contentType: "image/png" }] },
    "Work",
  );
  expect(skipped.parts).toEqual([]);
  expect(skipped.inventory[2].detail).toContain("not been verified");
});
