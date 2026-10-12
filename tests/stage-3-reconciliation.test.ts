import { beforeEach, expect, it, vi } from "vitest";
import { getBase58Decoder } from "@solana/kit";
const m = vi.hoisted(() => ({
  sql: vi.fn(),
  transaction: vi.fn(),
  statuses: vi.fn(),
  height: vi.fn(),
  tx: vi.fn(),
  account: vi.fn(),
  chain: vi.fn(),
}));
vi.mock("@/server/db", async (original) => ({
  ...(await original<typeof import("@/server/db")>()),
  database: () => Object.assign(m.sql, { transaction: m.transaction }),
}));
vi.mock("@/chain/network", () => ({
  devnetRpc: async () => ({
    getSignatureStatuses: () => ({ send: m.statuses }),
    getBlockHeight: () => ({ send: m.height }),
    getTransaction: () => ({ send: m.tx }),
    getAccountInfo: () => ({ send: m.account }),
  }),
}));
vi.mock("@/chain/escrow", async (original) => ({
  ...(await original<typeof import("@/chain/escrow")>()),
  bountyAddress: async () => "11111111111111111111111111111111",
  discriminator: async () => new Uint8Array(8).fill(9),
  decodeBounty: m.chain,
}));
import { reconcileOperation } from "@/server/reconcile";
const id = "11111111-1111-4111-8111-111111111111";
const data = new Uint8Array([
  ...new Uint8Array(8).fill(9),
  ...new Uint8Array(32).fill(1),
]);
const hash = "01".repeat(32);
let op: Record<string, unknown>;
beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  vi.stubEnv("NEXT_PUBLIC_ESCROW_PROGRAM_ID", "program");
  op = {
    id,
    bounty_id: id,
    actor: "worker",
    action: "submit",
    status: "confirming",
    signature: "1".repeat(64),
    expected_data: Buffer.from(data).toString("hex"),
    expected_account: "11111111111111111111111111111111",
    expected_blockhash: "blockhash",
    last_valid_block_height: "100",
  };
  m.sql.mockImplementation(async (strings) =>
    strings.join("?").startsWith("SELECT o.")
      ? [{ ...op }]
      : strings.join("?").startsWith("SELECT * FROM bounties")
        ? [
            {
              id,
              requester: "requester",
              worker: "worker",
              reward_lamports: "1000000",
              requirements: ["Deliver"],
              requirements_hash: "agreement",
              created_at: new Date().toISOString(),
            },
          ]
        : [],
  );
});
it("retains unknown signed operations until finalized blockheight proves expiry", async () => {
  m.statuses.mockResolvedValue({ value: [null] });
  m.height.mockResolvedValue(100n);
  expect((await reconcileOperation(id)).status).toBe("unknown");
  m.height.mockResolvedValue(101n);
  expect((await reconcileOperation(id)).status).toBe("failed");
  expect(m.transaction).not.toHaveBeenCalled();
});
it("recovers a failed signing attempt after its unsigned lifetime expires", async () => {
  op.signature = null;
  m.height.mockResolvedValue(101n);
  expect((await reconcileOperation(id)).status).toBe("failed");
  expect(m.sql.mock.calls.at(-1)![0].join("?")).toContain("BLOCKHASH_EXPIRED");
  expect(m.statuses).not.toHaveBeenCalled();
});
it("marks a chain error failed and never confirms merely confirmed commitments", async () => {
  m.statuses.mockResolvedValue({
    value: [{ err: { InstructionError: [] }, confirmationStatus: "finalized" }],
  });
  expect((await reconcileOperation(id)).status).toBe("failed");
  m.statuses.mockResolvedValue({
    value: [{ err: null, confirmationStatus: "confirmed" }],
  });
  expect((await reconcileOperation(id)).status).toBe("confirming");
  expect(m.tx).not.toHaveBeenCalled();
  expect(m.transaction).not.toHaveBeenCalled();
});
function finalized() {
  m.statuses.mockResolvedValue({
    value: [{ err: null, confirmationStatus: "finalized", slot: 10n }],
  });
  const tx = {
    meta: { err: null },
    transaction: {
      message: {
        accountKeys: ["worker", "program", "11111111111111111111111111111111"],
        header: { numRequiredSignatures: 1 },
        recentBlockhash: "blockhash",
        instructions: [
          {
            programIdIndex: 1,
            accounts: [2, 0],
            data: getBase58Decoder().decode(data),
          },
        ],
      },
    },
  };
  m.tx.mockResolvedValue(tx);
  m.account.mockResolvedValue({
    context: { slot: 10n },
    value: {
      owner: "program",
      data: [Buffer.from("account").toString("base64")],
    },
  });
  m.chain.mockResolvedValue({
    requester: "requester",
    id: id.replaceAll("-", ""),
    requirementsHash: "agreement",
    reward: 1000000n,
    worker: "worker",
    status: "in-review",
    deadline: 100,
    revisionUsed: false,
    submissionHash: hash,
  });
  return tx;
}
it("refuses another instruction hash, lifetime, missing actor signer or mismatched funded agreement", async () => {
  for (const kind of ["instruction", "blockhash", "signer", "agreement"]) {
    const tx = finalized();
    if (kind === "instruction")
      tx.transaction.message.instructions[0].data = getBase58Decoder().decode(
        new Uint8Array(40).fill(2),
      );
    if (kind === "blockhash")
      tx.transaction.message.recentBlockhash = "another";
    if (kind === "signer")
      tx.transaction.message.header.numRequiredSignatures = 0;
    if (kind === "agreement")
      m.chain.mockResolvedValue({
        requester: "requester",
        id: id.replaceAll("-", ""),
        requirementsHash: "changed",
        reward: 1000000n,
      });
    await expect(reconcileOperation(id)).rejects.toMatchObject({ status: 409 });
  }
  expect(m.transaction).not.toHaveBeenCalled();
});
it("confirms an exact finalized instruction and uses its historical hash rather than a later chain submission", async () => {
  finalized();
  m.chain.mockResolvedValue({
    requester: "requester",
    id: id.replaceAll("-", ""),
    requirementsHash: "agreement",
    reward: 1000000n,
    worker: "worker",
    status: "in-review",
    deadline: 100,
    revisionUsed: true,
    submissionHash: "02".repeat(32),
  });
  expect((await reconcileOperation(id)).status).toBe("confirmed");
  expect(m.transaction).toHaveBeenCalledTimes(1);
  const submissionUpdate = m.sql.mock.calls.find((call) =>
    call[0].join("?").startsWith("UPDATE submissions"),
  )!;
  expect(submissionUpdate).toContain(hash);
  expect(submissionUpdate).not.toContain("02".repeat(32));
});
