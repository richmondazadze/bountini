import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), sql: vi.fn() }));
vi.mock("@/server/accounts", () => ({ accountSession: m.session }));
vi.mock("@/server/db", async (original) => ({
  ...(await original<typeof import("@/server/db")>()),
  database: () => m.sql,
  requireOrigin: vi.fn(),
}));
import { PATCH } from "../src/app/api/notifications/route";
beforeEach(() => {
  m.sql.mockReset();
  m.session.mockResolvedValue({ user: { id: "owner" } });
});
const request = (body: unknown) =>
  new Request("http://localhost/api/notifications", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
it("marks only supplied IDs owned by the account and preserves the remaining unread count", async () => {
  m.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([{ unread: "12" }]);
  const response = await PATCH(request({ ids: ["31", "29"] }));
  expect(await response.json()).toEqual({ saved: true, unread: 12 });
  const [query, owner, ids] = m.sql.mock.calls[0];
  expect(query.join("?")).toContain("user_id=? AND id IN");
  expect(owner).toBe("owner");
  expect(JSON.parse(ids)).toEqual(["31", "29"]);
});
it.each([
  { throughId: "31" },
  { ids: [] },
  { ids: ["0"] },
  { ids: ["9223372036854775808"] },
  { ids: Array(51).fill("1") },
])("rejects invalid or overbroad read requests %j", async (body) => {
  expect((await PATCH(request(body))).status).toBe(400);
  expect(m.sql).not.toHaveBeenCalled();
});
it("requires an authenticated account", async () => {
  m.session.mockRejectedValueOnce(
    new (await import("@/server/db")).HttpError(401, "Sign in"),
  );
  expect((await PATCH(request({ ids: ["1"] }))).status).toBe(401);
  expect(m.sql).not.toHaveBeenCalled();
});
