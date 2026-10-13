import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createPrivateKey, sign } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { createSolanaRpc, signature, address } from "@solana/kit";
import { decodeBounty } from "../src/chain/escrow";
const origin = process.env.STAGE5_ORIGIN || "https://bountini.us";
const evidence = JSON.parse(
  readFileSync("output/stage-4-backend/hosted-devnet.json", "utf8"),
);
const deployment = JSON.parse(
  readFileSync("output/stage-4/deployment-verified.json", "utf8"),
);
const secrets = JSON.parse(
  readFileSync(`tmp/stage4-wallets-${evidence.runId}.json`, "utf8"),
);
const requester = secrets.find(
  (x: { address: string }) => x.address === evidence.requester,
);
assert(
  requester?.password && requester?.email,
  "Controlled test credentials are unavailable",
);
const id = evidence.receipts.find(
  (x: { action: string }) => x.action === "submit",
).id;
let cookie = "";
async function api(path: string, body?: unknown) {
  const r = await fetch(origin + path, {
    method: body ? "POST" : "GET",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(65000),
  });
  const data = await r.json();
  assert(r.ok, `HTTP ${r.status} ${path}`);
  const fresh = r.headers
    .getSetCookie()
    .map((x) => x.split(";")[0])
    .join("; ");
  if (fresh) cookie += (cookie ? "; " : "") + fresh;
  return data;
}
await api("/api/account-auth/sign-in/email", {
  email: requester.email,
  password: requester.password,
});
const challenge = await api("/api/auth/challenge", {
  wallet: requester.address,
});
const privateKey = createPrivateKey({
  key: Buffer.concat([
    Buffer.from("302e020100300506032b657004220420", "hex"),
    Buffer.from(requester.keypair.slice(0, 32)),
  ]),
  format: "der",
  type: "pkcs8",
});
await api("/api/auth/verify", {
  id: challenge.id,
  signature: Array.from(sign(null, Buffer.from(challenge.message), privateKey)),
});
const sql = neon(process.env.DATABASE_URL!);
const [latest] =
  await sql`SELECT content_hash,revision FROM submissions WHERE bounty_id=${id} AND confirmed=true ORDER BY revision DESC LIMIT 1`;
// Exactly ONE real Gemini advisory request; never retry generation automatically.
const review = await api("/api/ai/review", { bountyId: id });
assert.equal(review.submissionHash, latest.content_hash);
assert.equal(latest.revision, 1);
assert(review.result.criteria.length > 0);
assert(
  review.materials.some((x: { status: string }) => x.status === "not-assessed"),
);
const rpc = createSolanaRpc("https://api.devnet.solana.com");
assert.equal(
  await rpc.getGenesisHash().send(),
  "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
);
const sample = evidence.receipts.find(
  (x: { action: string }) => x.action === "approve",
);
const status = (
  await rpc
    .getSignatureStatuses([signature(sample.signature)], {
      searchTransactionHistory: true,
    })
    .send()
).value[0];
assert(
  status && !status.err && status.confirmationStatus === "finalized",
  "Recorded approval receipt is not finalized",
);
const bounty = await api(`/api/bounties/${id}`);
const chainAccount = await rpc
  .getAccountInfo(address(bounty.bounty.chainAddress), {
    encoding: "base64",
    commitment: "finalized",
  })
  .send();
assert(chainAccount.value);
const chain = await decodeBounty(
  Buffer.from(chainAccount.value.data[0], "base64"),
);
assert.equal(chain.status, "paid");
assert.equal(chain.submissionHash, latest.content_hash);
const repo = await fetch(
  "https://api.github.com/repos/richmondazadze/bountini",
);
assert(repo.ok);
const repository = await repo.json();
assert.equal(repository.private, false);
const checks = [];
for (const [method, path, body] of [
  ["GET", "/api/bounties?state=open"],
  ["GET", "/api/bounties?mine=true"],
  ["GET", `/api/bounties/${id}/messages`],
  ["GET", `/api/bounties/${id}/submissions`],
  ["GET", `/api/bounties/${id}/feedback`],
  ["POST", "/api/bounties", {}],
  [
    "POST",
    "/api/ai/draft",
    { text: "Controlled typed task for privacy verification" },
  ],
  ["POST", "/api/ai/review", { bountyId: id }],
  ["POST", "/api/voice/session", {}],
] as const) {
  const r = await fetch(origin + path, {
    method,
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
  const expected = path === "/api/bounties?state=open" ? 200 : 401;
  assert.equal(r.status, expected, `Guest boundary ${path}`);
  checks.push({ method, path, status: r.status });
}
mkdirSync("output/stage-5-backend", { recursive: true });
const result = {
  origin,
  sourceSHA: process.env.STAGE5_SOURCE_SHA || deployment.commit,
  releaseStage:
    "Stage 4 hosted baseline unless STAGE5_SOURCE_SHA is explicitly provided",
  geminiRequests: 1,
  geminiModel: review.model,
  latestConfirmedRevision: latest.revision,
  submissionHash: review.submissionHash,
  assessedMaterials: review.materials.map(
    (x: { label: string; status: string; detail: string }) => ({
      kind: x.label.includes("https:") ? "External URL recorded only" : x.label,
      status: x.status,
      detail: x.detail,
    }),
  ),
  externalURLFetching: false,
  publicRepository: repository.html_url,
  publicRepositoryVerified: true,
  recordedDevnetReceiptVerified: {
    signature: sample.signature,
    action: "approve",
    finalized: true,
    chainState: "paid",
  },
  guestEndpointChecks: checks,
  humanMicrophoneCoverage: false,
  humanWalletSigningCoverage: false,
};
writeFileSync(
  "output/stage-5-backend/hosted-service-baseline.json",
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify({
    origin,
    model: review.model,
    revision: latest.revision,
    geminiRequests: 1,
    guestChecks: checks.length,
    receiptFinalized: true,
  }),
);
