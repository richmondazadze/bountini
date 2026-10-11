import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), sql: vi.fn() }));
vi.mock("@/server/auth", () => ({ walletSession: mocks.session }));
vi.mock("@/server/db", async (original) => ({
  ...(await original<typeof import("@/server/db")>()),
  database: () => mocks.sql,
}));
import { GET } from "../src/app/api/bounties/[id]/feedback/route";
const ctx = {
  params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
};
beforeEach(() => {
  mocks.sql.mockReset();
  mocks.session.mockReset();
});
it.each(["worker", "requester"])(
  "allows %s and restricts the query to confirmed matching review operations",
  async (actor) => {
    mocks.session.mockResolvedValue(actor);
    mocks.sql
      .mockResolvedValueOnce([{ requester: "requester", worker: "worker" }])
      .mockResolvedValueOnce([{ feedback: "Fix the link" }]);
    const response = await GET(new Request("http://localhost"), ctx);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      feedback: [{ feedback: "Fix the link" }],
    });
    const query = mocks.sql.mock.calls[1][0].join("?");
    expect(query).toContain("o.status='confirmed'");
    expect(query).toContain("o.bounty_id=r.bounty_id");
    expect(query).toContain("o.actor=r.requester");
    expect(query).toContain("o.action=r.action");
  },
);
it("denies outsiders before reading reviews", async () => {
  mocks.session.mockResolvedValue("outsider");
  mocks.sql.mockResolvedValue([{ requester: "requester", worker: "worker" }]);
  expect((await GET(new Request("http://localhost"), ctx)).status).toBe(403);
  expect(mocks.sql).toHaveBeenCalledTimes(1);
});
