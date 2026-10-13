import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const schema = `stage4_races_${randomUUID().replaceAll("-", "")}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const route = readFileSync("src/app/api/operations/[id]/route.ts", "utf8");
// Exercise the exact SQL templates used by the route in a disposable namespace.
// Production operations, accounts and escrow records are never mutated.
function statement(
  kind: "signature" | "rejection",
  values: Record<string, string>,
) {
  const pattern =
    kind === "signature"
      ? /sql`(UPDATE operations SET signature=[\s\S]*?RETURNING \*)`/
      : /sql`(UPDATE operations SET status='rejected'[\s\S]*?RETURNING \*)`/;
  const template = route.match(pattern)?.[1];
  assert(template, `Atomic ${kind} SQL template not found`);
  const parameters: string[] = [];
  const text = template
    .replace("UPDATE operations", `UPDATE "${schema}".operations`)
    .replace(/\$\{(\w+)\}/g, (_, name: string) => {
      assert(values[name] !== undefined, "Unexpected SQL parameter");
      parameters.push(values[name]);
      return `$${parameters.length}`;
    });
  return { text, values: parameters };
}
const table = `"${schema}".operations`;
let checks = 0;
try {
  await pool.query(`CREATE SCHEMA "${schema}"`);
  await pool.query(
    `CREATE TABLE ${table}(id uuid PRIMARY KEY, actor text NOT NULL, signature text UNIQUE, status text NOT NULL CHECK(status IN ('waiting-wallet','submitting','confirming','unknown','confirmed','failed','rejected')), updated_at timestamptz NOT NULL DEFAULT now())`,
  );
  async function fixture(
    status = "waiting-wallet",
    signature: string | null = null,
  ) {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO ${table}(id,actor,status,signature) VALUES($1,'worker',$2,$3)`,
      [id, status, signature],
    );
    return id;
  }
  async function current(id: string) {
    return (await pool.query(`SELECT * FROM ${table} WHERE id=$1`, [id]))
      .rows[0];
  }
  async function race(
    first: "signature" | "rejection",
    second: "signature" | "rejection",
    firstSig: string,
    secondSig: string,
  ) {
    const id = await fixture();
    const [a, b] = await Promise.all([pool.connect(), pool.connect()]);
    try {
      const stale = await Promise.all([
        a.query(`SELECT * FROM ${table} WHERE id=$1`, [id]),
        b.query(`SELECT * FROM ${table} WHERE id=$1`, [id]),
      ]);
      assert(
        stale.every(
          (r) =>
            r.rows[0].signature === null &&
            r.rows[0].status === "waiting-wallet",
        ),
      );
      const results = await Promise.all([
        a.query(statement(first, { id, actor: "worker", tx: firstSig })),
        b.query(statement(second, { id, actor: "worker", tx: secondSig })),
      ]);
      assert.equal(
        results.reduce((n, r) => n + (r.rowCount || 0), 0),
        1,
        "Exactly one conditional transition must win",
      );
      const winner = await current(id);
      if (winner.signature) assert.equal(winner.status, "confirming");
      else assert.equal(winner.status, "rejected");
      assert.equal(
        results.find((r) => r.rowCount)?.rows[0].signature,
        winner.signature,
      );
      checks++;
      return winner;
    } finally {
      a.release();
      b.release();
    }
  }
  await race("signature", "rejection", "same-signature", "unused");
  await race("rejection", "signature", "unused", "other-signature");
  const same = await race("signature", "signature", "same-retry", "same-retry");
  assert.equal(same.signature, "same-retry");
  const conflict = await race(
    "signature",
    "signature",
    "conflict-a",
    "conflict-b",
  );
  assert(["conflict-a", "conflict-b"].includes(conflict.signature));
  for (const status of ["confirmed", "failed", "rejected"]) {
    const id = await fixture(status);
    assert.equal(
      (
        await pool.query(
          statement("signature", {
            id,
            actor: "worker",
            tx: `terminal-${status}`,
          }),
        )
      ).rowCount,
      0,
    );
    assert.equal(
      (await pool.query(statement("rejection", { id, actor: "worker" })))
        .rowCount,
      0,
    );
    assert.equal((await current(id)).status, status);
    checks++;
  }
  const owned = await fixture();
  assert.equal(
    (
      await pool.query(
        statement("signature", { id: owned, actor: "outsider", tx: "foreign" }),
      )
    ).rowCount,
    0,
  );
  checks++;
  mkdirSync("output/stage-4-backend", { recursive: true });
  writeFileSync(
    "output/stage-4-backend/operation-races.json",
    JSON.stringify(
      {
        passed: true,
        checks,
        exactRouteSQL: true,
        isolatedDatabaseNamespace: true,
        productionRecordsMutated: false,
        cases: [
          "signature/rejection",
          "rejection/signature",
          "identical signatures",
          "conflicting signatures",
          "confirmed/failed/rejected terminal states",
          "ownership",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    `Passed ${checks} real PostgreSQL atomic-transition checks in an isolated namespace.`,
  );
} finally {
  await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await pool.end();
}
