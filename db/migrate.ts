import { neon } from "@neondatabase/serverless";
import { readFile, readdir } from "node:fs/promises";
if (!process.env.DATABASE_URL)
  throw new Error(
    "DATABASE_URL is required; use node --env-file=.env.local with tsx",
  );
const sql = neon(process.env.DATABASE_URL);
for (const name of (await readdir(new URL("./migrations", import.meta.url)))
  .filter((n) => n.endsWith(".sql"))
  .sort()) {
  const source = await readFile(
    new URL("./migrations/" + name, import.meta.url),
    "utf8",
  );
  await sql.transaction(
    source
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => sql.query(s)),
  );
  console.log("Migration applied: " + name);
}
