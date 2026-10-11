import { Pool } from "pg";
import { readFile, readdir } from "node:fs/promises";
if (!process.env.DATABASE_URL)
  throw new Error(
    "DATABASE_URL is required; use node --env-file=.env.local with tsx",
  );
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock(7814432)");
  for (const name of (await readdir(new URL("./migrations", import.meta.url)))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    const source = await readFile(
      new URL("./migrations/" + name, import.meta.url),
      "utf8",
    );
    await client.query("BEGIN");
    try {
      await client.query(source);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
    console.log("Migration applied: " + name);
  }
} finally {
  await client.query("SELECT pg_advisory_unlock(7814432)");
  client.release();
  await pool.end();
}
