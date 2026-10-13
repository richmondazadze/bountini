import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const deploymentPath =
  process.env.STAGE5_DEPLOYMENT_EVIDENCE ||
  "output/stage-5/deployment-verified.json";
const deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));
const sha = deployment.commit || deployment.meta?.githubCommitSha;
assert(/^[0-9a-f]{40}$/.test(sha), "Verified exact deployment SHA is required");
assert.equal(deployment.readyState || deployment.state, "READY");
assert.equal(deployment.source, "git");
assert(deployment.alias.includes("bountini.us"));
const origin = "https://bountini.us";
const htmlResponse = await fetch(origin, { cache: "no-store" });
assert.equal(htmlResponse.status, 200);
const html = await htmlResponse.text();
assert(html.includes('href="/create"'), "Live public create CTA missing");
for (const category of ["Translation", "Writing", "Community", "Development"])
  assert(
    html.includes(`/discover?category=${category}`),
    `Live ${category} category CTA missing`,
  );
for (const match of html.matchAll(/href="\/?#([a-zA-Z][a-zA-Z0-9-]*)"/g))
  assert(
    html.includes(`id="${match[1]}"`),
    `Broken on-page anchor ${match[1]}`,
  );
assert(html.includes("https://github.com/richmondazadze/bountini"));
assert(html.includes("cluster=devnet"));
const previous = JSON.parse(
  readFileSync("output/stage-4-backend/hosted-devnet.json", "utf8"),
);
const id = previous.receipts.find(
  (r: { action: string }) => r.action === "submit",
).id;
const checks = [];
for (const path of [
  "/api/bounties?state=open",
  "/api/bounties?category=Development&state=open",
  "/api/bounties?mine=true",
  `/api/bounties/${id}/messages`,
  `/api/bounties/${id}/submissions`,
  `/api/bounties/${id}/feedback`,
]) {
  const response = await fetch(origin + path, { cache: "no-store" });
  const expected = path.includes("state=open") ? 200 : 401;
  assert.equal(response.status, expected, path);
  if (expected === 200) {
    const data = await response.json();
    assert(
      data.bounties.every(
        (b: { status: string; category: string }) =>
          b.status === "open" &&
          (!path.includes("category=") || b.category === "Development"),
      ),
    );
  }
  checks.push({ path, status: response.status });
}
for (const path of [
  "/api/bounties",
  "/api/ai/draft",
  "/api/ai/review",
  "/api/voice/session",
]) {
  const response = await fetch(origin + path, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(response.status, 401, path);
  checks.push({ path, method: "POST", status: response.status });
}
mkdirSync("output/stage-5-backend", { recursive: true });
writeFileSync(
  "output/stage-5-backend/hosted-stage5.json",
  JSON.stringify(
    {
      sourceSHA: sha,
      deploymentId: deployment.id,
      source: "git",
      readyState: "READY",
      alias: "bountini.us",
      homepageStatus: 200,
      createCTA: true,
      supportedCategoryCTAs: true,
      anchorTargets: true,
      guestEndpointChecks: checks,
      geminiRequests: 0,
      geminiBaseline:
        "hosted-service-baseline.json (one Stage 4 live advisory request)",
      humanMicrophoneCoverage: false,
      humanWalletSigningCoverage: false,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    sourceSHA: sha,
    checks: checks.length,
    homepage: "passed",
    geminiRequests: 0,
  }),
);
