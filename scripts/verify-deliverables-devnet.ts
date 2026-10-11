import { generateKeyPairSync, sign, randomUUID } from "node:crypto";
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
import { contentHash, manifestHash } from "../src/server/manifest";
import { decodeBounty } from "../src/chain/escrow";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
const evidenceDatabase = neon(process.env.DATABASE_URL!);
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
  const options = {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: w.cookie,
    },
    body: body ? JSON.stringify(body) : undefined,
  };
  let r = await fetch(origin + path, options);
  if (r.status === 429) {
    console.log(
      "Account request throttled; waiting for the rate-limit window.",
    );
    await pause(61000);
    r = await fetch(origin + path, options);
  }
  const json = await r.json();
  assert(r.ok, `${r.status}: ${JSON.stringify(json)}`);
  return { json, r };
}
const demoAccounts: string[] = [];
async function login(w: Wallet) {
  const { json: account, r: signup } = await api(
    "/api/account-auth/sign-up/email",
    w,
    {
      email: `delivered+bountini-escrow-${randomUUID()}@resend.dev`,
      password: "Controlled deliverables passphrase 2026.",
      name: "Controlled Devnet participant",
    },
  );
  w.cookie = signup.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  demoAccounts.push(account.user.id);
  writeFileSync(
    "tmp/deliverable-test-accounts.json",
    JSON.stringify({
      accounts: [...demoAccounts.map((id) => ({ id }))],
      latest: {
        email: account.user.email,
        password: "Controlled deliverables passphrase 2026.",
      },
    }),
    { mode: 0o600 },
  );
  writeFileSync("tmp/devnet-demo-accounts.json", JSON.stringify(demoAccounts), {
    mode: 0o600,
  });
  const { json: c } = await api("/api/auth/challenge", w, {
    wallet: w.signer.address,
  });
  const { r } = await api("/api/auth/verify", w, {
    id: c.id,
    signature: Array.from(sign(null, Buffer.from(c.message), w.privateKey)),
  });
  w.cookie +=
    "; " +
    r.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
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
async function act(
  id: string,
  w: Wallet,
  action: string,
  content?: string,
  manifestId?: string,
) {
  const { json: p } = await api(`/api/bounties/${id}/operations`, w, {
    action,
    content,
    manifestId,
  });
  if (
    process.env.DEMO_REVISION === "true" &&
    ["revise", "reject"].includes(action)
  ) {
    const before = (await api(`/api/bounties/${id}/feedback`, worker)).json
      .feedback;
    assert(
      !before.some((item: { feedback: string }) => item.feedback === content),
      "Unconfirmed feedback must remain private",
    );
  }
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
      if (action === "submit" && manifestId) {
        const [stored] =
          await evidenceDatabase`SELECT * FROM submission_manifests WHERE id=${manifestId}`;
        assert(stored.confirmed);
        const account = await rpc
          .getAccountInfo(address(p.instruction.accounts[0].address), {
            encoding: "base64",
            commitment: "finalized",
          })
          .send();
        const chain = await decodeBounty(
          Buffer.from(account.value!.data[0], "base64"),
        );
        assert.equal(chain.submissionHash, stored.content_hash);
        assert.equal(manifestHash(stored.manifest), stored.content_hash);
        console.log(
          "Stored immutable manifest hash matches finalized on-chain hash.",
        );
      }
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
console.log(`Demonstration quest: ${id}`);
await act(id, requester, "fund");
await act(id, worker, "claim");
async function raw(path: string, w: Wallet, init: RequestInit = {}) {
  return fetch(origin + path, {
    ...init,
    headers: { Origin: origin, Cookie: w.cookie, ...init.headers },
  });
}
async function upload(
  id: string,
  filename: string,
  bytes: Uint8Array,
  uploadId = randomUUID(),
) {
  const form = new FormData();
  form.set("uploadId", uploadId);
  form.set("file", new File([new Uint8Array(bytes)], filename));
  const response = await raw(`/api/bounties/${id}/attachments`, worker, {
    method: "POST",
    body: form,
  });
  const body = await response.json();
  assert(response.ok, `${response.status}: ${JSON.stringify(body)}`);
  assert.equal(body.attachment.sha256, contentHash(bytes));
  return body.attachment;
}
const attachment = await upload(
  id,
  "announcement.txt",
  Buffer.from("La reunión de la comunidad comienza a las 10 a. m. el sábado."),
);
const picture = await upload(
  id,
  "red-square.png",
  await sharp({
    create: { width: 4, height: 4, channels: 3, background: "red" },
  })
    .png()
    .toBuffer(),
);
const document = await PDFDocument.create();
const page = document.addPage();
page.drawText("Community meeting: Saturday 10 AM.");
const pdf = await upload(id, "announcement.pdf", await document.save());
assert.equal(
  (
    await upload(
      id,
      "announcement.txt",
      Buffer.from(
        "La reunión de la comunidad comienza a las 10 a. m. el sábado.",
      ),
      attachment.id,
    )
  ).id,
  attachment.id,
);
// Simulate object upload success followed by a lost metadata response.
await evidenceDatabase`UPDATE attachments SET status='uploading' WHERE id=${attachment.id}`;
assert.equal(
  (
    await upload(
      id,
      "announcement.txt",
      Buffer.from(
        "La reunión de la comunidad comienza a las 10 a. m. el sábado.",
      ),
      attachment.id,
    )
  ).id,
  attachment.id,
);
assert.equal(
  (
    await raw(`/api/attachments/${attachment.id}/access`, requester, {
      method: "POST",
    })
  ).status,
  403,
);
const payload = {
  writtenResponse:
    "Completed the neutral Spanish translation; see the uploaded snapshot.",
  links: [
    {
      label: "Commit-specific example link",
      url: "https://github.com/richmondazadze/bountini/tree/6212e42f8c1dd77da6550c24c78e2f1be1abf638",
    },
  ],
  attachmentIds: [attachment.id, picture.id, pdf.id],
};
const frozen = (
  await api(`/api/bounties/${id}/submissions/prepare`, worker, payload)
).json;
assert.equal(manifestHash(frozen.manifest), frozen.contentHash);
assert.equal(
  (await api(`/api/bounties/${id}/submissions/prepare`, worker, payload)).json
    .id,
  frozen.id,
);
const rejected = (
  await api(`/api/bounties/${id}/operations`, worker, {
    action: "submit",
    manifestId: frozen.id,
  })
).json;
await api(
  `/api/operations/${rejected.operationId}`,
  worker,
  { status: "rejected" },
  "PATCH",
);
assert.equal(
  (await api(`/api/bounties/${id}/submissions`, requester)).json.submissions
    .length,
  0,
);
await act(id, worker, "submit", undefined, frozen.id);
const confirmed = (await api(`/api/bounties/${id}/submissions`, requester)).json
  .submissions;
assert.equal(confirmed[0].manifest.attachments.length, 3);
assert.equal(confirmed[0].manifest.links[0].url, payload.links[0].url);
const access = (
  await api(`/api/attachments/${attachment.id}/access`, requester, {})
).json;
const download = await raw(access.downloadUrl, requester);
assert.equal(download.status, 200);
assert.equal(
  contentHash(Buffer.from(await download.arrayBuffer())),
  attachment.sha256,
);
assert.equal((await raw(access.downloadUrl, worker)).status, 403);
assert.equal((await fetch(origin + access.downloadUrl)).status, 401);
for (const update of [
  evidenceDatabase`UPDATE submission_manifests SET manifest='{}'::jsonb WHERE id=${frozen.id}`,
  evidenceDatabase`UPDATE submissions SET body='changed' WHERE bounty_id=${id} AND confirmed=true`,
  evidenceDatabase`UPDATE attachments SET status='deleting' WHERE id=${attachment.id}`,
]) {
  let denied = false;
  try {
    await update;
  } catch {
    denied = true;
  }
  assert(denied, "Confirmed snapshot must be immutable");
}
console.log(
  "Private download, lost-response retries, duplicate preparation, rejected-signature recovery and immutability verified.",
);
if (process.env.DEMO_REVISION === "true") {
  const instructions =
    "Keep the original meeting time; replace comienza with empieza.";
  await act(id, requester, "revise", instructions);
  for (const participant of [requester, worker]) {
    const response = await api(`/api/bounties/${id}/feedback`, participant);
    assert.equal(response.json.feedback.at(-1).feedback, instructions);
    assert.equal(response.r.headers.get("cache-control"), "private, no-store");
  }
  assert.equal(
    (await api(`/api/bounties/${id}`, worker)).json.bounty.status,
    "revision-requested",
  );
  const outsider = await wallet();
  await login(outsider);
  assert.equal(
    (
      await raw(`/api/attachments/${attachment.id}/access`, outsider, {
        method: "POST",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await raw(`/api/bounties/${id}/attachments`, requester, {
        method: "POST",
      })
    ).status,
    403,
  );
  const forbidden = await fetch(`${origin}/api/bounties/${id}/feedback`, {
    headers: { Cookie: outsider.cookie },
  });
  assert.equal(forbidden.status, 403);
  const anonymous = await fetch(`${origin}/api/bounties/${id}/feedback`);
  assert.equal(anonymous.status, 401);
  const revision = (
    await api(`/api/bounties/${id}/submissions/prepare`, worker, {
      ...payload,
      writtenResponse:
        "La reunión de la comunidad empieza a las 10 a. m. el sábado.",
    })
  ).json;
  await act(id, worker, "submit", undefined, revision.id);
  const versions = (await api(`/api/bounties/${id}/submissions`, requester))
    .json.submissions;
  assert.equal(versions.length, 2);
  assert.equal(versions[1].revision, 1);
  assert(versions[1].body.includes("empieza"));
  assert.equal(versions[0].content_hash, frozen.contentHash);
  assert.equal(
    versions[1].manifest.attachments[0].sha256,
    versions[0].manifest.attachments[0].sha256,
  );
  await act(
    id,
    requester,
    "reject",
    "Rejection recorded for demonstration; approval remains available.",
  );
  assert.equal(
    (await api(`/api/bounties/${id}/feedback`, worker)).json.feedback.length,
    2,
  );
  console.log(
    "Confirmed revision/rejection feedback, pending exclusion, participant privacy and revised content verified.",
  );
}
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
  assert.equal(
    advice.materials.filter((m: { status: string }) => m.status === "supplied")
      .length,
    4,
  );
  assert(
    advice.materials.some(
      (m: { status: string; label: string }) =>
        m.status === "not-assessed" && m.label.includes("Commit-specific"),
    ),
  );
  writeFileSync(
    "output/deliverables-ai-review.json",
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
// Keep the public legacy text-only operation contract working.
const legacy = await draft("Controlled text-only deliverable compatibility");
await act(legacy, requester, "fund");
await act(legacy, worker, "claim");
const legacyText =
  "La reunión de la comunidad empieza a las 10 a. m. el sábado.";
await act(legacy, worker, "submit", legacyText);
const legacySubmission = (
  await api(`/api/bounties/${legacy}/submissions`, requester)
).json.submissions[0];
assert.equal(legacySubmission.content_hash, contentHash(legacyText));
assert.equal(legacySubmission.manifest, null);
await act(legacy, requester, "approve");
console.log("Legacy text-only submission and receipt verified.");
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
  process.env.DEMO_REVISION === "true"
    ? "output/deliverables-devnet-demo.json"
    : demoDatabase
      ? "output/render-worker-demo.json"
      : "output/devnet-demo.json",
  JSON.stringify(
    {
      network: "devnet",
      appOrigin: origin,
      backgroundWorkerOnly: !!demoDatabase,
      revisionFeedbackVerified: process.env.DEMO_REVISION === "true",
      manifestHash: frozen.contentHash,
      attachmentHash: attachment.sha256,
      privateDownloadVerified: true,
      legacyTextOnlyVerified: true,
      failedSignatureRecoveryVerified: true,
      revisionHistoryVerified: true,
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
