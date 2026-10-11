import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { storeObject, readObject } from "../src/server/attachment-storage";
import { contentHash } from "../src/server/manifest";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const sql = neon(process.env.DATABASE_URL!);
const evidence = JSON.parse(
  readFileSync("output/deliverables-devnet-demo.json", "utf8"),
);
const bountyId = evidence.receipts[0].id;
const [bounty] = await sql`SELECT * FROM bounties WHERE id=${bountyId}`;
const id = randomUUID(),
  bytes = Buffer.from("Controlled abandoned upload"),
  hash = contentHash(bytes);
const path = `deliverables/${bountyId}/${id}/${hash}`;
await sql`INSERT INTO attachments(id,bounty_id,worker,filename,size,content_type,sha256,object_path,created_at,updated_at) VALUES(${id},${bountyId},${bounty.worker},'abandoned.txt',${bytes.length},'text/plain',${hash},${path},now()-interval '26 hours',now()-interval '26 hours')`;
await storeObject(path, bytes, hash, "text/plain");
await sql`UPDATE attachments SET status='ready' WHERE id=${id}`;
const [protectedFile] =
  await sql`SELECT a.* FROM attachments a JOIN manifest_attachments ma ON ma.attachment_id=a.id JOIN submission_manifests m ON m.id=ma.manifest_id WHERE m.bounty_id=${bountyId} AND m.confirmed=true LIMIT 1`;
await sql`UPDATE attachments SET updated_at=now()-interval '26 hours' WHERE id=${protectedFile.id}`;
const origin = process.env.DEMO_ORIGIN || "http://localhost:3000";
assert.equal(
  (await fetch(origin + "/api/maintenance/attachments")).status,
  401,
);
const response = await fetch(origin + "/api/maintenance/attachments", {
  headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
});
assert(response.ok);
const result = await response.json();
assert(result.deleted >= 1);
const [removed] = await sql`SELECT status FROM attachments WHERE id=${id}`;
assert.equal(removed.status, "deleted");
const [retained] =
  await sql`SELECT status FROM attachments WHERE id=${protectedFile.id}`;
assert.equal(retained.status, "ready");
assert.equal(
  contentHash(await readObject(protectedFile.object_path)),
  protectedFile.sha256,
);
await assert.rejects(() => readObject(path));
writeFileSync(
  "output/deliverable-cleanup-verification.json",
  JSON.stringify(
    {
      origin,
      unauthorizedDenied: true,
      abandonedObjectDeleted: true,
      confirmedObjectRetained: true,
      result,
    },
    null,
    2,
  ),
);
console.log(
  "Cleanup denied unauthorized requests, deleted abandoned bytes and retained confirmed bytes.",
);
