import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ sql: vi.fn() }));
vi.mock("@/server/db", async (original) => ({
  ...(await original<typeof import("@/server/db")>()),
  database: () => m.sql,
}));
import { assistanceLimits, quota } from "@/server/assistance";
beforeEach(() => m.sql.mockReset());
it("retains the configured account-scoped limits and atomic daily conflict guard", async () => {
  expect(assistanceLimits).toEqual({ voice: 25, draft: 50, review: 50 });
  for (const kind of ["voice", "draft", "review"] as const) {
    m.sql.mockResolvedValueOnce([{ used: 1 }]);
    await quota("linked-wallet", kind);
    const call = m.sql.mock.calls.at(-1)!;
    const query = call[0].join("?");
    expect(query).toContain("SELECT user_id FROM wallet_links");
    expect(query).toContain("'account:'");
    expect(query).toContain("ON CONFLICT(wallet,kind,day)");
    expect(query).toContain("WHERE assistance_usage.used<");
    expect(call).toContain(assistanceLimits[kind]);
  }
});
it("returns quota denial when there is no linked owner or the daily budget is exhausted", async () => {
  m.sql.mockResolvedValue([]);
  await expect(quota("unavailable-wallet", "review")).rejects.toMatchObject({
    status: 429,
  });
});
