import { accountHref } from "../src/client/account-flow";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { accountOptions } from "../src/server/account-config";
const captured: { url: string; kind: string }[] = [];
const options = accountOptions();
options.baseURL = "http://localhost:3001";
options.trustedOrigins = ["http://localhost:3001"];
options.advanced = { ...options.advanced, useSecureCookies: false };
options.emailVerification = {
  ...options.emailVerification,
  sendVerificationEmail: async ({ url }) => {
    captured.push({ url, kind: "verify" });
  },
};
options.emailAndPassword = {
  ...options.emailAndPassword!,
  sendResetPassword: async ({ url }) => {
    captured.push({ url, kind: "reset" });
  },
};
const auth = betterAuth(options);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const email = `delivered+bountini-${randomUUID()}@resend.dev`;
const password = "Controlled test passphrase " + randomUUID();
let userId: string | undefined;
async function req(
  path: string,
  body?: unknown,
  cookie?: string,
  origin = "http://localhost:3001",
) {
  return auth.handler(
    new Request("http://localhost:3001/api/account-auth/" + path, {
      method: body ? "POST" : "GET",
      headers: {
        "x-forwarded-for": "198.51.100.77",
        origin,
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
}
function cookie(r: Response) {
  return r.headers
    .getSetCookie()
    .map((x) => x.split(";")[0])
    .join("; ");
}
try {
  const short = await req("sign-up/email", {
    email,
    password: "short",
    name: "Account QA",
  });
  assert.equal(short.status, 400);
  const signup = await req("sign-up/email", {
    email,
    password,
    name: "Account QA",
    callbackURL: accountHref("/create", "requester"),
  });
  assert.equal(signup.status, 200);
  userId = (await signup.json()).user.id;
  assert(userId);
  assert.equal(captured.length, 1);
  const denied = await req("sign-in/email", { email, password });
  assert.equal(denied.status, 403);
  const verified = await auth.handler(
    new Request(captured.find((x) => x.kind === "verify")!.url, {
      headers: { origin: "http://localhost:3001" },
    }),
  );
  assert(verified.status < 400);
  assert.equal(
    new URL(
      verified.headers.get("location")!,
      "http://localhost:3001",
    ).searchParams.get("next"),
    "/create",
  );
  assert.equal(
    new URL(
      verified.headers.get("location")!,
      "http://localhost:3001",
    ).searchParams.get("role"),
    "requester",
  );
  const firstCookie = cookie(verified);
  assert(firstCookie);
  const session = await req("get-session", undefined, firstCookie);
  assert.equal((await session.json()).user.id, userId);
  const wrong = await req("sign-in/email", {
    email,
    password: "Different test passphrase",
  });
  assert.equal(wrong.status, 401);
  const hostile = await req(
    "sign-in/email",
    { email, password },
    undefined,
    "https://hostile.example",
  );
  assert.equal(hostile.status, 403);
  const reset = await req("request-password-reset", {
    email,
    redirectTo: "/account/reset",
  });
  assert.equal(reset.status, 200);
  const resetUrl = captured.find((x) => x.kind === "reset")!.url;
  const token = new URL(resetUrl).pathname.split("/").at(-1)!;
  const newPassword = "Replacement test passphrase " + randomUUID();
  const changed = await req("reset-password", { token, newPassword });
  assert.equal(changed.status, 200);
  assert.equal(
    await (await req("get-session", undefined, firstCookie)).json(),
    null,
  );
  const repeated = await req("reset-password", { token, newPassword });
  assert.equal(repeated.status, 400);
  const oldLogin = await req("sign-in/email", { email, password });
  assert.equal(oldLogin.status, 401);
  const newLogin = await req("sign-in/email", { email, password: newPassword });
  assert.equal(newLogin.status, 200);
  const stored = await pool.query(
    'SELECT password FROM auth_accounts WHERE "userId"=$1',
    [userId],
  );
  assert.notEqual(stored.rows[0].password, newPassword);
  assert(stored.rows[0].password.length > 80);
  console.log(
    "PASS: password policy, verification, login, origin protection, hashing, single-use recovery and session revocation",
  );
} finally {
  if (userId)
    await pool.query("DELETE FROM auth_users WHERE id=$1 AND email=$2", [
      userId,
      email,
    ]);
  await pool.query("DELETE FROM auth_verifications WHERE identifier LIKE $1", [
    "%" + email + "%",
  ]);
  await pool.end();
  await (options.database as Pool).end();
}
