import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  participant: vi.fn(),
  sql: vi.fn(),
  rate: vi.fn(),
}));
vi.mock("@/server/accounts", () => ({ participantAccount: m.participant }));
vi.mock("@/server/rate-limit", () => ({ consumeRate: m.rate }));
vi.mock("@/server/db", async (original) => ({
  ...(await original<typeof import("@/server/db")>()),
  database: () => m.sql,
}));
import { GET, POST } from "../src/app/api/bounties/[id]/messages/route";
const id = "11111111-1111-4111-8111-111111111111";
const ctx = { params: Promise.resolve({ id }) };
const clientId = "22222222-2222-4222-8222-222222222222";
const request = (body: unknown) =>
  new Request("http://localhost:3000/api", {
    method: "POST",
    headers: { origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
  m.participant.mockResolvedValue({ session: { user: { id: "account" } } });
});
it("rejects oversized message cursors before querying history", async () => {
  const r = await GET(
    new Request("http://localhost:3000/?before=9999999999999999999"),
    ctx,
  );
  expect(r.status).toBe(400);
  expect(m.sql).not.toHaveBeenCalled();
});
it("does not read history for an outsider", async () => {
  const { HttpError } = await import("@/server/db");
  m.participant.mockRejectedValue(new HttpError(403, "Participants only"));
  expect((await GET(new Request("http://localhost:3000"), ctx)).status).toBe(
    403,
  );
  expect(m.sql).not.toHaveBeenCalled();
});
it("deduplicates a retried message without consuming another rate limit", async () => {
  m.sql.mockResolvedValue([{ id: "message", bounty_id: id }]);
  expect((await POST(request({ body: "Hello", clientId }), ctx)).status).toBe(
    200,
  );
  expect(m.rate).not.toHaveBeenCalled();
  expect(m.sql).toHaveBeenCalledTimes(1);
});
it("rejects retry IDs reused for a different workroom", async () => {
  m.sql.mockResolvedValue([{ id: "message", bounty_id: "other" }]);
  expect((await POST(request({ body: "Hello", clientId }), ctx)).status).toBe(
    409,
  );
});
it("guards membership again at the atomic insert", async () => {
  m.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  expect((await POST(request({ body: "Hello", clientId }), ctx)).status).toBe(
    403,
  );
  expect(m.sql.mock.calls[1][0].join("?")).toContain("EXISTS");
});
it("rejects whitespace-only messages", async () => {
  expect((await POST(request({ body: "   ", clientId }), ctx)).status).toBe(
    400,
  );
  expect(m.sql).not.toHaveBeenCalled();
});
