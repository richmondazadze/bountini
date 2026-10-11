import { describe, it, expect, beforeEach } from "vitest";
import { LiteSVM, FailedTransactionMetadata } from "litesvm";
import {
  generateKeyPairSigner,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  address,
  lamports,
  blockhash,
  type KeyPairSigner,
  type Instruction,
} from "@solana/kit";
import {
  escrowInstruction,
  bountyAddress,
  decodeBounty,
  PROGRAM_ADDRESS,
  type ChainAction,
} from "../src/chain/escrow";
import type { Bounty } from "../src/domain/bounty";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
const binary = "target/deploy/bountini_escrow.so";
describe.skipIf(!existsSync(binary))("compiled escrow execution", () => {
  let svm: LiteSVM,
    requester: KeyPairSigner,
    worker: KeyPairSigner,
    intruder: KeyPairSigner,
    b: Bounty;
  beforeEach(async () => {
    svm = new LiteSVM();
    svm.addProgramFromFile(address(PROGRAM_ADDRESS), binary);
    requester = await generateKeyPairSigner();
    worker = await generateKeyPairSigner();
    intruder = await generateKeyPairSigner();
    for (const s of [requester, worker, intruder])
      svm.airdrop(s.address, lamports(10_000_000_000n));
    const c = svm.getClock();
    c.unixTimestamp = 1000n;
    svm.setClock(c);
    b = {
      id: randomUUID(),
      requester: requester.address,
      worker: null,
      title: "Test translation quest",
      description: "Translate a community announcement into Spanish",
      category: "Translation",
      requirements: ["Preserve links"],
      requirementsHash: "11".repeat(32),
      reward: "0.1",
      status: "draft",
      deadline: null,
      revisionUsed: false,
      createdAt: "",
      chainAddress: null,
      signature: null,
    };
  });
  async function send(
    action: ChainAction,
    signer: KeyPairSigner,
    hash = "22".repeat(32),
    mutate?: (ix: Instruction) => Instruction,
  ) {
    svm.expireBlockhash();
    let ix = await escrowInstruction(b, action, signer.address, hash);
    if (mutate) ix = mutate(ix);
    let msg = setTransactionMessageFeePayerSigner(
      signer,
      createTransactionMessage({ version: 0 }),
    );
    const life = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: blockhash(svm.latestBlockhash()),
        lastValidBlockHeight: 999999n,
      },
      msg,
    );
    const tx = await signTransactionMessageWithSigners(
      appendTransactionMessageInstruction(ix, life),
    );
    return svm.sendTransaction(tx);
  }
  async function state() {
    const account = svm.getAccount(await bountyAddress(b));
    if (!account.exists) throw new Error("Escrow account missing");
    return decodeBounty(account.data);
  }
  function ok(result: unknown) {
    if (result instanceof FailedTransactionMetadata)
      throw new Error(result.meta().logs().join("\n"));
  }
  function fail(result: unknown) {
    expect(result).toBeInstanceOf(FailedTransactionMetadata);
  }
  function time(t: bigint) {
    const clock = svm.getClock();
    clock.unixTimestamp = t;
    svm.setClock(clock);
  }
  async function funded() {
    ok(await send("fund", requester));
    b.status = "open";
  }
  async function claimed() {
    await funded();
    ok(await send("claim", worker));
    b.worker = worker.address;
    b.status = "in-progress";
  }
  async function submitted() {
    await claimed();
    ok(await send("submit", worker));
    b.status = "in-review";
  }
  it("pays exact reward once and preserves rent", async () => {
    await submitted();
    const before = svm.getBalance(worker.address)!;
    ok(await send("approve", requester));
    expect(svm.getBalance(worker.address)! - before).toBe(100_000_000n);
    expect((await state()).status).toBe("paid");
    fail(await send("approve", requester));
    expect(svm.getBalance(worker.address)! - before).toBe(100_000_000n);
    expect(svm.getBalance(await bountyAddress(b))).toBeGreaterThan(0n);
  });
  it("rejects self-claim, second claim and unauthorized submission or approval", async () => {
    await funded();
    fail(await send("claim", requester));
    ok(await send("claim", worker));
    b.worker = worker.address;
    fail(await send("claim", intruder));
    fail(await send("submit", intruder));
    ok(await send("submit", worker));
    fail(await send("approve", worker));
    fail(await send("approve", intruder));
  });
  it("rejects a wrong payout recipient", async () => {
    await submitted();
    fail(
      await send("approve", requester, undefined, (ix) => ({
        ...ix,
        accounts: ix.accounts!.map((a, i) =>
          i === 2 ? { ...a, address: intruder.address } : a,
        ),
      })),
    );
    expect((await state()).status).toBe("in-review");
  });
  it("rejects early expiry, permits refund exactly at review deadline, disallows payment then", async () => {
    await submitted();
    fail(await send("expire", requester));
    time(1600n);
    fail(await send("approve", requester));
    const before = svm.getBalance(requester.address)!;
    ok(await send("expire", requester));
    expect((await state()).status).toBe("refunded");
    expect(svm.getBalance(requester.address)! - before).toBe(
      100_000_000n - 5000n,
    );
    fail(await send("expire", requester));
  });
  it("records rejection without changing deadline and still permits approval", async () => {
    await submitted();
    const old = await state();
    ok(await send("reject", requester, "33".repeat(32)));
    const next = await state();
    expect(next.status).toBe("in-review");
    expect(next.deadline).toBe(old.deadline);
    expect(next.feedbackHash).toBe("33".repeat(32));
    ok(await send("approve", requester));
  });
  it("requires worker withdrawal and refunds requester atomically", async () => {
    await claimed();
    fail(await send("withdraw", intruder));
    const before = svm.getBalance(requester.address)!;
    ok(await send("withdraw", worker));
    expect(svm.getBalance(requester.address)! - before).toBe(100_000_000n);
    expect((await state()).status).toBe("refunded");
    fail(await send("submit", worker));
  });
  it("refunds a missed revision at its deadline", async () => {
    await submitted();
    ok(await send("revise", requester));
    time(1600n);
    fail(await send("submit", worker));
    ok(await send("expire", requester));
    expect((await state()).status).toBe("refunded");
  });
  it("timely revision creates final review and prevents the old expiry path", async () => {
    await submitted();
    ok(await send("revise", requester));
    time(1599n);
    ok(await send("submit", worker, "44".repeat(32)));
    const next = await state();
    expect(next.deadline).toBe(2199);
    expect(next.revisionUsed).toBe(true);
    time(1600n);
    fail(await send("expire", requester));
    fail(await send("revise", requester));
    ok(await send("approve", requester));
  });
  it("supports unclaimed cancellation but not after claim", async () => {
    await funded();
    ok(await send("cancel", requester));
    expect((await state()).status).toBe("refunded");
    fail(await send("claim", worker));
  });
  it("rejects late initial delivery and returns reward after delivery deadline", async () => {
    await claimed();
    time(2800n);
    fail(await send("submit", worker));
    ok(await send("expire", requester));
    expect((await state()).status).toBe("refunded");
  });
});
