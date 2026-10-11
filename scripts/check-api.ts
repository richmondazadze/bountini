import { generateKeyPairSync, sign, randomUUID } from "node:crypto";
import { getBase58Decoder } from "@solana/kit";
import { neon } from "@neondatabase/serverless";
import assert from "node:assert/strict";
const origin = "http://localhost:3000";
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const wallet = getBase58Decoder().decode(
  publicKey.export({ format: "der", type: "spki" }).subarray(-32),
);
async function request(
  path: string,
  body?: unknown,
  cookie?: string,
  otherOrigin = origin,
) {
  return fetch(origin + path, {
    method: body ? "POST" : "GET",
    headers: {
      Origin: otherOrigin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const challenge = await request("/api/auth/challenge", { wallet });
assert.equal(challenge.status, 200);
const c = await challenge.json();
const wrong = await request("/api/auth/verify", {
  id: c.id,
  signature: Array(64).fill(0),
});
assert.equal(wrong.status, 401);
const signature = Array.from(sign(null, Buffer.from(c.message), privateKey));
const verified = await request("/api/auth/verify", { id: c.id, signature });
assert.equal(verified.status, 200);
const cookie = verified.headers.get("set-cookie")!.split(";")[0];
const replay = await request("/api/auth/verify", { id: c.id, signature });
assert.equal(replay.status, 401);
const badOrigin = await request(
  "/api/auth/challenge",
  { wallet },
  undefined,
  "https://attacker.example",
);
assert.equal(badOrigin.status, 403);
const draft = {
  title: "API check " + randomUUID(),
  description: "Translate a community announcement into neutral Spanish.",
  category: "Translation",
  requirements: ["Preserve the date, time and URL"],
  reward: "0.000000001",
};
const unauth = await request("/api/bounties", draft);
assert.equal(unauth.status, 401);
const invalid = await request(
  "/api/bounties",
  { ...draft, reward: "1e9" },
  cookie,
);
assert.equal(invalid.status, 400);
const created = await request("/api/bounties", draft, cookie);
assert.equal(created.status, 201);
const { bounty } = await created.json();
assert.equal(bounty.reward, "0.000000001");
assert.equal(bounty.status, "draft");
const privateDraft = await request("/api/bounties/" + bounty.id);
assert.equal(privateDraft.status, 401);
const ownDraft = await request("/api/bounties/" + bounty.id, undefined, cookie);
assert.equal(ownDraft.status, 200);
const mine = await request("/api/bounties?mine=true", undefined, cookie);
assert.equal(mine.status, 200);
assert(
  (await mine.json()).bounties.some((b: { id: string }) => b.id === bounty.id),
);
const market = await request("/api/bounties");
assert.equal(market.status, 200);
assert(
  !(await market.json()).bounties.some(
    (b: { id: string }) => b.id === bounty.id,
  ),
);
const sql = neon(process.env.DATABASE_URL!);
await sql.transaction([
  sql`DELETE FROM bounties WHERE id=${bounty.id} AND status='draft'`,
  sql`DELETE FROM sessions WHERE wallet=${wallet}`,
  sql`DELETE FROM auth_challenges WHERE wallet=${wallet}`,
]);
console.log(
  "API integration passed: signature proof, nonce replay, origin checks, exact reward, persistence, draft privacy and role filtering.",
);
