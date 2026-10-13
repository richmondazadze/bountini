import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  sql: vi.fn(),
  transaction: vi.fn(),
  wallet: vi.fn(),
  participant: vi.fn(),
  reconcile: vi.fn(),
  rate: vi.fn(),
  instruction: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/server/db", async (original) => ({
  ...(await original<typeof import("@/server/db")>()),
  database: () => Object.assign(m.sql, { transaction: m.transaction }),
}));
vi.mock("@/server/auth", () => ({ walletSession: m.wallet }));
vi.mock("@/server/accounts", () => ({ participantAccount: m.participant }));
vi.mock("@/server/rate-limit", () => ({ consumeRate: m.rate }));
vi.mock("@/server/reconcile", () => ({ reconcileOperation: m.reconcile }));
vi.mock("@/chain/network", () => ({ devnetRpc: m.rpc }));
vi.mock("@/chain/escrow", async (original) => ({
  ...(await original<typeof import("@/chain/escrow")>()),
  escrowInstruction: m.instruction,
}));
import { GET as history } from "@/app/api/bounties/[id]/messages/route";
import { POST as prepareOperation } from "@/app/api/bounties/[id]/operations/route";
import {
  GET as operationStatus,
  PATCH as updateOperation,
} from "@/app/api/operations/[id]/route";
import { makeManifest, manifestHash } from "@/server/manifest";
const id = "11111111-1111-4111-8111-111111111111",
  ctx = { params: Promise.resolve({ id }) };
const signature = "1".repeat(64);
const req = (body: unknown) =>
  new Request("http://localhost:3000/api", {
    method: "POST",
    headers: { Origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });
const bounty = () => ({
  id,
  requester: "requester",
  worker: "worker",
  status: "in-progress",
  deadline: Math.floor(Date.now() / 1000) + 600,
  revision_used: false,
  reward_lamports: "1000000",
  requirements: ["Deliver work"],
  created_at: new Date().toISOString(),
});
beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
  vi.stubEnv(
    "NEXT_PUBLIC_ESCROW_PROGRAM_ID",
    "11111111111111111111111111111111",
  );
  m.wallet.mockResolvedValue("worker");
  m.participant.mockResolvedValue({ session: { user: { id: "account" } } });
});
it("returns 50 chronological messages and a continuation flag from an exclusive bigint cursor", async () => {
  m.sql.mockResolvedValue(
    Array.from({ length: 51 }, (_, n) => ({
      id: String(100 - n),
      seq: String(100 - n),
    })),
  );
  const r = await history(
    new Request("http://localhost:3000/?before=101"),
    ctx,
  );
  const result = await r.json();
  expect(result.hasMore).toBe(true);
  expect(result.messages).toHaveLength(50);
  expect(result.messages[0].seq).toBe("51");
  expect(result.messages.at(-1).seq).toBe("100");
  expect(r.headers.get("cache-control")).toBe("private, no-store");
  expect(m.sql.mock.calls[0][0].join("?")).toContain("m.seq<");
  expect(m.sql.mock.calls[0]).toContain("101");
});
it.each(["outsider", "requester"])(
  "refuses %s preparing the assigned worker's operation",
  async (actor) => {
    m.wallet.mockResolvedValue(actor);
    m.sql.mockResolvedValue([bounty()]);
    expect(
      (await prepareOperation(req({ action: "submit", manifestId: id }), ctx))
        .status,
    ).toBe(403);
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.transaction).not.toHaveBeenCalled();
  },
);
it("refuses a submission at the exact server delivery deadline", async () => {
  m.sql.mockResolvedValue([
    { ...bounty(), deadline: Math.floor(Date.now() / 1000) },
  ]);
  expect(
    (await prepareOperation(req({ action: "submit", manifestId: id }), ctx))
      .status,
  ).toBe(403);
  expect(m.rpc).not.toHaveBeenCalled();
});
it("blocks duplicate preparation while an unknown operation is unresolved", async () => {
  m.sql
    .mockResolvedValueOnce([bounty()])
    .mockResolvedValueOnce([{ id: "pending" }]);
  const r = await prepareOperation(
    req({ action: "submit", manifestId: id }),
    ctx,
  );
  expect(r.status).toBe(409);
  expect((await r.json()).error).toContain("pending");
  expect(m.instruction).not.toHaveBeenCalled();
});
it("rejects a foreign, wrong-version or already-confirmed frozen snapshot", async () => {
  m.sql
    .mockResolvedValueOnce([bounty()])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([]);
  expect(
    (await prepareOperation(req({ action: "submit", manifestId: id }), ctx))
      .status,
  ).toBe(409);
  const query = m.sql.mock.calls[2][0].join("?");
  expect(query).toContain("worker=");
  expect(query).toContain("revision=");
  expect(query).toContain("confirmed=false");
});
it("rejects a frozen manifest whose deterministic hash differs before creating an instruction", async () => {
  const manifest = makeManifest(
    id,
    0,
    { writtenResponse: "Completed written work" },
    [],
  );
  m.sql
    .mockResolvedValueOnce([bounty()])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ manifest, content_hash: "bad hash" }]);
  expect(
    (await prepareOperation(req({ action: "submit", manifestId: id }), ctx))
      .status,
  ).toBe(409);
  expect(m.instruction).not.toHaveBeenCalled();
  expect(manifestHash(manifest)).toHaveLength(64);
});
it("hides another wallet's operation before attempting reconciliation", async () => {
  m.sql.mockResolvedValue([]);
  expect(
    (await operationStatus(new Request("http://localhost:3000"), ctx)).status,
  ).toBe(404);
  expect(m.reconcile).not.toHaveBeenCalled();
});
it("keeps rejected/failed/confirmed operation updates terminal and does not reuse them", async () => {
  for (const status of ["rejected", "failed", "confirmed"]) {
    m.sql.mockResolvedValue([{ id, status }]);
    expect(
      (await (await updateOperation(req({ signature }), ctx)).json()).operation
        .status,
    ).toBe(status);
  }
  expect(m.sql).toHaveBeenCalledTimes(3);
  expect(m.reconcile).not.toHaveBeenCalled();
});
it("refuses replacing a persisted signature or marking it rejected", async () => {
  m.sql.mockResolvedValue([{ id, status: "confirming", signature }]);
  expect(
    (await updateOperation(req({ signature: "2".repeat(64) }), ctx)).status,
  ).toBe(409);
  expect((await updateOperation(req({ status: "rejected" }), ctx)).status).toBe(
    409,
  );
  expect(m.reconcile).not.toHaveBeenCalled();
});
it("returns the persisted signed operation when rejection loses its atomic update", async () => {
  const winner = { id, status: "confirming", signature };
  m.sql
    .mockResolvedValueOnce([{ id, status: "waiting-wallet", signature: null }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([winner]);
  const r = await updateOperation(req({ status: "rejected" }), ctx);
  expect((await r.json()).operation).toEqual(winner);
  const query = m.sql.mock.calls[1][0].join("?");
  expect(query).toContain("signature IS NULL");
  expect(query).toContain("status IN");
  expect(query).toContain("RETURNING *");
  expect(query).toContain("actor=");
  expect(m.sql).toHaveBeenCalledTimes(3);
});
it("returns the actual rejection row when unsigned rejection wins", async () => {
  const winner = {
    id,
    status: "rejected",
    signature: null,
    updated_at: "actual database timestamp",
  };
  m.sql
    .mockResolvedValueOnce([{ id, status: "waiting-wallet", signature: null }])
    .mockResolvedValueOnce([winner]);
  expect(
    (await (await updateOperation(req({ status: "rejected" }), ctx)).json())
      .operation,
  ).toEqual(winner);
  expect(m.sql).toHaveBeenCalledTimes(2);
});
it("does not revive a rejection that won a concurrent signature update", async () => {
  const winner = { id, status: "rejected", signature: null };
  m.sql
    .mockResolvedValueOnce([{ id, status: "waiting-wallet", signature: null }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([winner]);
  expect(
    (await (await updateOperation(req({ signature }), ctx)).json()).operation,
  ).toEqual(winner);
  expect(m.reconcile).not.toHaveBeenCalled();
});
it("reconciles the same-signature retry after a concurrent writer wins", async () => {
  const winner = { id, status: "confirming", signature };
  m.sql
    .mockResolvedValueOnce([{ id, status: "waiting-wallet", signature: null }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([winner]);
  m.reconcile.mockResolvedValue({ ...winner, status: "unknown" });
  expect(
    (await (await updateOperation(req({ signature }), ctx)).json()).operation
      .status,
  ).toBe("unknown");
  expect(m.reconcile).toHaveBeenCalledWith(id);
});
it("reconciles an already-recorded identical signature without replacing it", async () => {
  const winner = { id, status: "confirming", signature };
  m.sql
    .mockResolvedValueOnce([winner])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([winner]);
  m.reconcile.mockResolvedValue({ ...winner, status: "confirmed" });
  expect(
    (await (await updateOperation(req({ signature }), ctx)).json()).operation
      .status,
  ).toBe("confirmed");
});
it("refuses a conflicting signature that won after the initial unsigned read", async () => {
  m.sql
    .mockResolvedValueOnce([{ id, status: "waiting-wallet", signature: null }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([
      { id, status: "confirming", signature: "2".repeat(64) },
    ]);
  expect((await updateOperation(req({ signature }), ctx)).status).toBe(409);
  expect(m.reconcile).not.toHaveBeenCalled();
});
it.each(["confirmed", "failed", "rejected"])(
  "does not overwrite a concurrent terminal %s transition",
  async (status) => {
    const winner = { id, status, signature };
    m.sql
      .mockResolvedValueOnce([
        { id, status: "waiting-wallet", signature: null },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([winner]);
    expect(
      (await (await updateOperation(req({ signature }), ctx)).json()).operation,
    ).toEqual(winner);
    expect(m.reconcile).not.toHaveBeenCalled();
  },
);
