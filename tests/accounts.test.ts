import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  session: vi.fn(),
  sql: vi.fn(),
  headers: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: m.headers }));
vi.mock("@/server/account-config", () => ({
  accountAuth: () => ({ api: { getSession: m.session } }),
}));
vi.mock("@/server/db", async (original) => ({
  ...(await original<typeof import("@/server/db")>()),
  database: () => m.sql,
}));
import { accountSession, participantAccount } from "@/server/accounts";
beforeEach(() => {
  vi.clearAllMocks();
  m.headers.mockResolvedValue(new Headers());
});
it.each([null, {}])("requires an account session", async (session) => {
  m.session.mockResolvedValue(session);
  await expect(accountSession()).rejects.toMatchObject({ status: 401 });
});
it("requires a recent session when linking a wallet", async () => {
  m.session.mockResolvedValue({
    user: { id: "user", emailVerified: true },
    session: { createdAt: new Date(Date.now() - 3600001) },
  });
  await expect(accountSession(true)).rejects.toMatchObject({ status: 401 });
  expect((await accountSession()).user.id).toBe("user");
});
it("checks participant access through verified wallet links rather than selected role", async () => {
  m.session.mockResolvedValue({ user: { id: "user", emailVerified: true } });
  m.sql.mockResolvedValue([{ requester: "wallet", worker: null }]);
  expect((await participantAccount("quest")).bounty.requester).toBe("wallet");
  const [parts, ...values] = m.sql.mock.calls[0];
  expect(parts.join("?")).toContain("wallet_links");
  expect(parts.join("?")).toContain("w.wallet IN (b.requester,b.worker)");
  expect(values).toContain("user");
});
it("denies an account with no matching participant wallet", async () => {
  m.session.mockResolvedValue({
    user: { id: "outsider", emailVerified: true },
  });
  m.sql.mockResolvedValue([]);
  await expect(participantAccount("quest")).rejects.toMatchObject({
    status: 403,
  });
});

it("accepts an authenticated account without email confirmation", async () => {
  m.session.mockResolvedValue({
    user: { id: "new-user", emailVerified: false },
  });
  expect((await accountSession()).user.id).toBe("new-user");
});
