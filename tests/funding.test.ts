import { expect, it, vi, afterEach } from "vitest";
const m = vi.hoisted(() => ({
  sql: vi.fn(),
  instruction: vi.fn(),
  balance: vi.fn(),
  rent: vi.fn(),
}));
vi.mock("@/server/auth", () => ({
  walletSession: async () => "11111111111111111111111111111111",
}));
vi.mock("@/server/db", async (original) => ({
  ...(await original<typeof import("@/server/db")>()),
  database: () => m.sql,
}));
vi.mock("@/chain/network", () => ({
  devnetRpc: async () => ({
    getBalance: () => ({ send: m.balance }),
    getMinimumBalanceForRentExemption: () => ({ send: m.rent }),
  }),
}));
vi.mock("@/chain/escrow", async (original) => ({
  ...(await original<typeof import("@/chain/escrow")>()),
  escrowInstruction: m.instruction,
}));
import { POST } from "../src/app/api/bounties/[id]/operations/route";
afterEach(() => vi.unstubAllEnvs());
it("explains insufficient Devnet funds before creating an operation or opening a wallet transaction", async () => {
  vi.stubEnv(
    "NEXT_PUBLIC_ESCROW_PROGRAM_ID",
    "11111111111111111111111111111111",
  );
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
  m.sql
    .mockResolvedValueOnce([
      {
        id: "11111111-1111-4111-8111-111111111111",
        requester: "11111111111111111111111111111111",
        title: "Example quest",
        description: "Example description for a quest",
        category: "Writing",
        requirements: ["Write the requested text"],
        reward_lamports: "100000000",
        status: "draft",
        requirements_hash: "hash",
        created_at: new Date().toISOString(),
      },
    ])
    .mockResolvedValueOnce([]);
  m.balance.mockResolvedValue({ value: 0n });
  m.rent.mockResolvedValue(2303760n);
  const response = await POST(
    new Request("http://localhost:3000", {
      method: "POST",
      headers: { Origin: "http://localhost:3000" },
      body: JSON.stringify({ action: "fund" }),
    }),
    { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
  );
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain("0 test SOL on Devnet");
  expect(m.sql).toHaveBeenCalledTimes(2);
  expect(m.instruction).not.toHaveBeenCalled();
});
