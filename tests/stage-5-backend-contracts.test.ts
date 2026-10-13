import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  sql: vi.fn(),
  account: vi.fn(),
  wallet: vi.fn(),
  quota: vi.fn(),
  gemini: vi.fn(),
  materials: vi.fn(),
}));
vi.mock("@/server/db", async (original) => ({
  ...(await original<typeof import("@/server/db")>()),
  database: () => m.sql,
}));
vi.mock("@/server/accounts", () => ({ accountSession: m.account }));
vi.mock("@/server/auth", () => ({ walletSession: m.wallet }));
vi.mock("@/server/assistance", async (original) => ({
  ...(await original<typeof import("@/server/assistance")>()),
  quota: m.quota,
  gemini: m.gemini,
}));
vi.mock("@/server/review-materials", () => ({ reviewMaterials: m.materials }));
import { GET as discover, POST as create } from "@/app/api/bounties/route";
import { POST as review } from "@/app/api/ai/review/route";
import { HttpError } from "@/server/db";
const id = "11111111-1111-4111-8111-111111111111";
const req = (body: unknown) =>
  new Request("http://localhost:3000/api", {
    method: "POST",
    headers: { Origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  Object.values(m).forEach((x) => x.mockReset());
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
  m.wallet.mockResolvedValue("worker");
  m.account.mockResolvedValue({ user: { id: "account" } });
  m.sql.mockResolvedValue([]);
});
it("allows guest discovery but excludes drafts and filters category before pagination", async () => {
  const r = await discover(
    new Request(
      "http://localhost:3000/api?category=Development&state=open&page=1",
    ),
  );
  expect(r.status).toBe(200);
  expect(m.account).not.toHaveBeenCalled();
  const query = m.sql.mock.calls[0][0].join("?");
  expect(query).toContain("status!='draft'");
  expect(query.indexOf("category=")).toBeLessThan(query.indexOf("LIMIT 26"));
  expect(m.sql.mock.calls[0]).toContain("Development");
  expect(m.sql.mock.calls[0]).toContain(25);
});
it("requires an account for the private mine projection", async () => {
  m.account.mockRejectedValue(new HttpError(401, "Sign in"));
  expect(
    (await discover(new Request("http://localhost:3000/api?mine=true"))).status,
  ).toBe(401);
  expect(m.sql).not.toHaveBeenCalled();
});
it("requires verified account-wallet access before saving a public CTA's draft", async () => {
  m.wallet.mockRejectedValue(new HttpError(401, "Sign in and verify"));
  expect((await create(req({ title: "Guest draft" }))).status).toBe(401);
  expect(m.sql).not.toHaveBeenCalled();
});
it("denies advisory requests by nonparticipants before quota or Gemini", async () => {
  m.sql.mockResolvedValueOnce([
    { id, requester: "requester", worker: "assigned-worker" },
  ]);
  expect((await review(req({ bountyId: id }))).status).toBe(403);
  expect(m.quota).not.toHaveBeenCalled();
  expect(m.gemini).not.toHaveBeenCalled();
});
it("reviews only the latest confirmed version and records exact hash/material provenance", async () => {
  const manifest = { bountyId: id, version: 1 };
  const inventory = [
    { label: "revision.txt", status: "supplied" },
    { label: "External URL", status: "not-assessed" },
  ];
  m.sql
    .mockResolvedValueOnce([
      {
        id,
        requester: "requester",
        worker: "worker",
        requirements: ["Fixed funded criterion"],
        requirements_hash: "agreement",
        description: "Funded brief",
      },
    ])
    .mockResolvedValueOnce([
      {
        body: "Latest confirmed revised work",
        revision: 1,
        manifest_id: id,
        content_hash: "revision-hash",
      },
    ])
    .mockResolvedValueOnce([{ manifest }])
    .mockResolvedValueOnce([]);
  m.materials.mockResolvedValue({
    inventory,
    parts: [{ text: "Bounded revision content" }],
  });
  m.quota.mockResolvedValue(undefined);
  m.gemini.mockResolvedValue({
    result: { summary: "Advisory", criteria: [] },
    model: "controlled-model",
    promptVersion: "test",
  });
  const r = await review(req({ bountyId: id }));
  expect(r.status).toBe(200);
  const response = await r.json();
  expect(response.submissionHash).toBe("revision-hash");
  expect(response.requirementsHash).toBe("agreement");
  expect(response.materials).toEqual(inventory);
  expect(m.sql.mock.calls[1][0].join("?")).toContain(
    "confirmed=true ORDER BY revision DESC LIMIT 1",
  );
  expect(m.gemini.mock.calls[0][2].submission).toBe(
    "Latest confirmed revised work",
  );
  expect(m.gemini.mock.calls[0][1]).toContain(
    "destinations have NOT been fetched",
  );
  expect(m.materials).toHaveBeenCalledWith(
    manifest,
    "Latest confirmed revised work",
  );
});
it("blocks review without confirmed work and respects current quota denial", async () => {
  const participant = { id, requester: "requester", worker: "worker" };
  m.sql.mockResolvedValueOnce([participant]).mockResolvedValueOnce([]);
  expect((await review(req({ bountyId: id }))).status).toBe(409);
  m.sql
    .mockResolvedValueOnce([participant])
    .mockResolvedValueOnce([{ body: "Confirmed work", content_hash: "hash" }]);
  m.materials.mockResolvedValue({ inventory: [], parts: [] });
  m.quota.mockRejectedValue(new HttpError(429, "Daily assistance limit"));
  expect((await review(req({ bountyId: id }))).status).toBe(429);
  expect(m.gemini).not.toHaveBeenCalled();
});
