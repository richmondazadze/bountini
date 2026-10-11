import assert from "node:assert/strict";
import { randomUUID, generateKeyPairSync, sign } from "node:crypto";
import { getBase58Decoder } from "@solana/kit";
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { accountOptions } from "../src/server/account-config";
const origin = process.env.ACCOUNT_TEST_ORIGIN || "http://localhost:3001";
const options = accountOptions();
options.baseURL = origin;
options.trustedOrigins = [origin];
options.advanced = {
  ...options.advanced,
  useSecureCookies: origin.startsWith("https:"),
};
const auth = betterAuth(options);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const run = randomUUID();
const accounts: {
  id: string;
  email: string;
  cookie: string;
  wallet: string;
  privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"];
}[] = [];
let bountyId: string | undefined;
async function api(
  path: string,
  account?: (typeof accounts)[number],
  body?: unknown,
  method = body ? "POST" : "GET",
) {
  return fetch(origin + path, {
    method,
    headers: {
      origin,
      "content-type": "application/json",
      "x-forwarded-for": "198.51.100.103",
      ...(account ? { cookie: account.cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
try {
  for (let i = 0; i < 3; i++) {
    const email = `delivered+bountini-workroom-${run}-${i}@resend.dev`;
    const signup = await auth.handler(
      new Request(origin + "/api/account-auth/sign-up/email", {
        method: "POST",
        headers: {
          origin,
          "content-type": "application/json",
          "x-forwarded-for": `198.51.100.${110 + i}`,
        },
        body: JSON.stringify({
          email,
          password: "Workroom controlled passphrase " + randomUUID(),
          name: "Workroom QA " + i,
          callbackURL: "/my",
        }),
      }),
    );
    assert.equal(signup.status, 200);
    const id = (await signup.json()).user.id;
    const cookie = signup.headers
      .getSetCookie()
      .map((s) => s.split(";")[0])
      .join("; ");
    assert(cookie);
    const keys = generateKeyPairSync("ed25519");
    const wallet = getBase58Decoder().decode(
      keys.publicKey.export({ type: "spki", format: "der" }).subarray(-32),
    );
    const account = { id, email, cookie, wallet, privateKey: keys.privateKey };
    accounts.push(account);
    const challenge = await api("/api/auth/challenge", account, { wallet });
    assert.equal(challenge.status, 200);
    const c = await challenge.json();
    const signature = Array.from(
      sign(null, Buffer.from(c.message), keys.privateKey),
    );
    const verified = await api("/api/auth/verify", account, {
      id: c.id,
      signature,
    });
    assert.equal(verified.status, 200);
    account.cookie +=
      "; " +
      verified.headers
        .getSetCookie()
        .map((s) => s.split(";")[0])
        .join("; ");
  }
  const [requester, worker, outsider] = accounts;
  const challenge = await (
    await api("/api/auth/challenge", requester, { wallet: requester.wallet })
  ).json();
  assert.equal(
    (
      await api("/api/auth/verify", outsider, {
        id: challenge.id,
        signature: Array.from(
          sign(null, Buffer.from(challenge.message), requester.privateKey),
        ),
      })
    ).status,
    401,
  );
  const foreignChallenge = await (
    await api("/api/auth/challenge", outsider, { wallet: requester.wallet })
  ).json();
  assert.equal(
    (
      await api("/api/auth/verify", outsider, {
        id: foreignChallenge.id,
        signature: Array.from(
          sign(
            null,
            Buffer.from(foreignChallenge.message),
            requester.privateKey,
          ),
        ),
      })
    ).status,
    401,
  );
  const created = await api("/api/bounties", requester, {
    title: "Workroom QA " + run,
    description:
      "Controlled database integration test. No chain funds or real work.",
    category: "Development",
    requirements: ["Verify private participant messaging"],
    reward: "0.001",
  });
  assert.equal(created.status, 201);
  bountyId = (await created.json()).bounty.id;
  assert.equal((await api(`/api/bounties/${bountyId}`, outsider)).status, 403);
  await pool.query("UPDATE bounties SET worker=$1 WHERE id=$2", [
    worker.wallet,
    bountyId,
  ]);
  const clientId = randomUUID();
  const sent = await api(`/api/bounties/${bountyId}/messages`, requester, {
    clientId,
    body: "Please check the private delivery notes.",
  });
  assert.equal(sent.status, 201);
  const repeated = await api(`/api/bounties/${bountyId}/messages`, requester, {
    clientId,
    body: "Please check the private delivery notes.",
  });
  assert.equal(repeated.status, 200);
  const workerRead = await api(`/api/bounties/${bountyId}/messages`, worker);
  assert.equal(workerRead.status, 200);
  const messages = await workerRead.json();
  assert.equal(messages.messages.length, 1);
  assert.equal(messages.messages[0].sender_name, "Workroom QA 0");
  assert.equal(
    (await api(`/api/bounties/${bountyId}/messages`, outsider)).status,
    403,
  );
  assert.equal(
    (
      await api(`/api/bounties/${bountyId}/messages`, outsider, {
        clientId: randomUUID(),
        body: "Forbidden",
      })
    ).status,
    403,
  );
  const notifications = await (await api("/api/notifications", worker)).json();
  assert.equal(notifications.unread, 1);
  await api(
    "/api/notifications",
    worker,
    { ids: [String(notifications.notifications[0].id)] },
    "PATCH",
  );
  assert.equal(
    (await (await api("/api/notifications", worker)).json()).unread,
    0,
  );
  // More than one dashboard's worth of updates, plus another user's ID.
  for (let i = 0; i < 12; i++) {
    await pool.query(
      "INSERT INTO notifications(user_id,bounty_id,event_key,kind,body) VALUES($1,$2,$3,'qa','Controlled update')",
      [worker.id, bountyId, run + "-update-" + i],
    );
  }
  const foreign = await pool.query(
    "INSERT INTO notifications(user_id,bounty_id,event_key,kind,body) VALUES($1,$2,$3,'qa','Private update') RETURNING id",
    [outsider.id, bountyId, run + "-foreign"],
  );
  const updates = await (await api("/api/notifications", worker)).json();
  const displayed = updates.notifications
    .slice(0, 8)
    .map((n: { id: string }) => String(n.id));
  const marked = await api(
    "/api/notifications",
    worker,
    { ids: [...displayed, String(foreign.rows[0].id)] },
    "PATCH",
  );
  assert.equal(marked.status, 200);
  assert.equal((await marked.json()).unread, 4);
  const remaining = await (await api("/api/notifications", worker)).json();
  assert.equal(remaining.unread, 4);
  assert.equal(
    remaining.notifications.filter(
      (n: { read_at: string | null }) => !n.read_at,
    ).length,
    4,
  );
  const [foreignUnread] = (
    await pool.query("SELECT read_at FROM notifications WHERE id=$1", [
      foreign.rows[0].id,
    ])
  ).rows;
  assert.equal(foreignUnread.read_at, null);
  assert.equal(
    (await (await api("/api/bounties?mine=true&role=Claimed", worker)).json())
      .bounties[0].id,
    bountyId,
  );
  assert.equal(
    (
      await api(
        "/api/me",
        requester,
        {
          activeRole: "worker",
          bio: "Controlled account profile",
          skills: ["Writing"],
          portfolioUrl: "https://example.com",
        },
        "PATCH",
      )
    ).status,
    200,
  );
  const me = await (await api("/api/me", requester)).json();
  assert.equal(me.profile.activeRole, "worker");
  assert.equal(me.wallets[0].wallet, requester.wallet);
  const anon = await api(`/api/bounties/${bountyId}/messages`);
  assert.equal(anon.status, 401);
  console.log(
    "PASS: account-bound wallet signatures, exclusive wallet ownership, draft privacy, two-participant messaging, retry deduplication, outsider denial, notifications, linked-wallet dashboards and profile sync",
  );
} finally {
  if (bountyId) {
    await pool.query("DELETE FROM notifications WHERE bounty_id=$1", [
      bountyId,
    ]);
    await pool.query("DELETE FROM messages WHERE bounty_id=$1", [bountyId]);
    await pool.query("DELETE FROM bounties WHERE id=$1", [bountyId]);
  }
  for (const a of accounts) {
    await pool.query("DELETE FROM auth_challenges WHERE user_id=$1", [a.id]);
    await pool.query("DELETE FROM sessions WHERE user_id=$1", [a.id]);
    await pool.query("DELETE FROM wallet_links WHERE user_id=$1", [a.id]);
    await pool.query("DELETE FROM auth_users WHERE id=$1 AND email=$2", [
      a.id,
      a.email,
    ]);
  }
  await pool.end();
  await (options.database as Pool).end();
}
