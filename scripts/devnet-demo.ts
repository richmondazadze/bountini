import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  address,
  blockhash,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  getBase58Decoder,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction,
  getBase64EncodedWireTransaction,
  AccountRole,
  type Instruction,
} from "@solana/kit";
import { neon } from "@neondatabase/serverless";
const demoDatabase =
  process.env.DEMO_WORKER_ONLY === "true"
    ? neon(process.env.DATABASE_URL!)
    : null;
const origin = process.env.DEMO_ORIGIN || "http://localhost:3000";
const rpc = createSolanaRpc("https://api.devnet.solana.com");
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function wallet() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const pub = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
  const seed = privateKey
    .export({ format: "der", type: "pkcs8" })
    .subarray(-32);
  return {
    privateKey,
    signer: await createKeyPairSignerFromBytes(Buffer.concat([seed, pub])),
    cookie: "",
  };
}
type Wallet = Awaited<ReturnType<typeof wallet>>;
async function api(
  path: string,
  w: Wallet,
  body?: unknown,
  method = body ? "POST" : "GET",
) {
  const r = await fetch(origin + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: w.cookie,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await r.json();
  assert(r.ok, `${r.status}: ${JSON.stringify(json)}`);
  return { json, r };
}
async function login(w: Wallet) {
  const { json: c } = await api("/api/auth/challenge", w, {
    wallet: w.signer.address,
  });
  const { r } = await api("/api/auth/verify", w, {
    id: c.id,
    signature: Array.from(sign(null, Buffer.from(c.message), w.privateKey)),
  });
  w.cookie = r.headers.get("set-cookie")!.split(";")[0];
}
async function signed(
  w: Wallet,
  ix: Instruction,
  lifetime: { blockhash: string; lastValidBlockHeight: string },
) {
  let msg = createTransactionMessage({ version: 0 });
  const prepared = appendTransactionMessageInstructions(
    [ix],
    setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: blockhash(lifetime.blockhash),
        lastValidBlockHeight: BigInt(lifetime.lastValidBlockHeight),
      },
      setTransactionMessageFeePayerSigner(w.signer, msg),
    ),
  );
  return signTransactionMessageWithSigners(prepared);
}
const requester = await wallet(),
  worker = await wallet();
const payer = {
  signer: await createKeyPairSignerFromBytes(
    Uint8Array.from(
      JSON.parse(readFileSync("tmp/devnet-payer.keypair.json", "utf8")),
    ),
  ),
} as Wallet;
for (const w of [requester, worker]) {
  const { value: l } = await rpc
    .getLatestBlockhash({ commitment: "finalized" })
    .send();
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true);
  view.setBigUint64(4, 100_000_000n, true);
  const tx = await signed(
    payer,
    {
      programAddress: address("11111111111111111111111111111111"),
      accounts: [
        { address: payer.signer.address, role: AccountRole.WRITABLE_SIGNER },
        { address: w.signer.address, role: AccountRole.WRITABLE },
      ],
      data,
    },
    {
      blockhash: l.blockhash,
      lastValidBlockHeight: String(l.lastValidBlockHeight),
    },
  );
  await rpc
    .sendTransaction(getBase64EncodedWireTransaction(tx), {
      encoding: "base64",
    })
    .send();
  await pause(2000);
  await login(w);
}
const receipts: unknown[] = [];
async function act(id: string, w: Wallet, action: string, content?: string) {
  const { json: p } = await api(`/api/bounties/${id}/operations`, w, {
    action,
    content,
  });
  const tx = await signed(
    w,
    {
      programAddress: address(p.instruction.programAddress),
      accounts: p.instruction.accounts,
      data: Uint8Array.from(p.instruction.data),
    },
    p.lifetime,
  );
  const signature = getSignatureFromTransaction(tx);
  await api(`/api/operations/${p.operationId}`, w, { signature }, "PATCH");
  await rpc
    .sendTransaction(getBase64EncodedWireTransaction(tx), {
      encoding: "base64",
      skipPreflight: false,
      maxRetries: 3n,
    })
    .send();
  for (let i = 0; i < 50; i++) {
    await pause(2000);
    const json = demoDatabase
      ? {
          operation: (
            await demoDatabase`SELECT status FROM operations WHERE id=${p.operationId}`
          )[0],
        }
      : (await api(`/api/operations/${p.operationId}`, w)).json;
    assert.notEqual(json.operation.status, "failed");
    if (json.operation.status === "confirmed") {
      receipts.push({
        id,
        action,
        signature,
        explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      });
      console.log(`${action}: finalized ${signature}`);
      return;
    }
  }
  throw new Error("Finalization timeout");
}
async function draft(title: string) {
  const { json } = await api("/api/bounties", requester, {
    title,
    description:
      "Translate this announcement: The community meeting starts at 10 AM on Saturday.",
    category: "Translation",
    requirements: ["Preserve Saturday and 10 AM", "Use neutral Spanish"],
    reward: "0.001",
  });
  return json.bounty.id as string;
}
const id = await draft("Devnet demonstration: Spanish announcement");
await act(id, requester, "fund");
await act(id, worker, "claim");
await act(
  id,
  worker,
  "submit",
  "La reunión de la comunidad comienza a las 10 a. m. el sábado.",
);
const workerBefore = (
  await rpc
    .getBalance(worker.signer.address, { commitment: "finalized" })
    .send()
).value;
if (process.env.DEMO_ASSISTANCE === "true") {
  const { json: advice } = await api("/api/ai/review", requester, {
    bountyId: id,
  });
  assert(advice.result.criteria.length > 0);
  writeFileSync(
    "output/deployed-ai-review.json",
    JSON.stringify(advice, null, 2),
  );
}
await act(id, requester, "approve");
const workerAfter = (
  await rpc
    .getBalance(worker.signer.address, { commitment: "finalized" })
    .send()
).value;
assert.equal(workerAfter - workerBefore, 1_000_000n);
assert.equal(
  (await api(`/api/bounties/${id}`, requester)).json.bounty.status,
  "paid",
);
const refund = await draft("Devnet demonstration: cancellation refund");
await act(refund, requester, "fund");
const refundBefore = (
  await rpc
    .getBalance(requester.signer.address, { commitment: "finalized" })
    .send()
).value;
await act(refund, requester, "cancel");
const refundAfter = (
  await rpc
    .getBalance(requester.signer.address, { commitment: "finalized" })
    .send()
).value;
assert.equal(refundAfter - refundBefore, 995_000n);
assert.equal(
  (await api(`/api/bounties/${refund}`, requester)).json.bounty.status,
  "refunded",
);
writeFileSync(
  demoDatabase ? "output/render-worker-demo.json" : "output/devnet-demo.json",
  JSON.stringify(
    {
      network: "devnet",
      appOrigin: origin,
      backgroundWorkerOnly: !!demoDatabase,
      verifiedPayoutLamports: "1000000",
      verifiedRefundNetLamports: "995000",
      requester: requester.signer.address,
      worker: worker.signer.address,
      receipts,
    },
    null,
    2,
  ),
);
console.log(
  "Two-wallet Devnet API journey passed: funding, claim, submission, payout and refund.",
);
