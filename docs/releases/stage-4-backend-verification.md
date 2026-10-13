# Stage 4 backend verification — updated 2026-10-13

Status: **backend locally ready**. Atomic PATCH fix, regression checks and the fresh isolated full Devnet journey passed. No Stage 4 commit, push or deployment performed by this backend assignment. Frontend Lead owns the coordinated release and production builds. Read Stage 4 handoff, AGENTS.md and relevant installed Next.js route/CLI/Turbopack guides. No frontend, schema, authentication or escrow policy changes were made.

## Atomic operation PATCH

`src/app/api/operations/[id]/route.ts` retains exact wallet ownership, origin/input checks and the `{ operation }` response. Signature recording and unsigned rejection now use conditional `UPDATE ... RETURNING *` with the owned actor, `signature IS NULL` and eligible active states (`waiting-wallet`, `submitting`, `confirming`, `unknown`). A zero-row update rereads the owned authoritative row. Rejection never synthesizes rejected from a stale read; a signature cannot revive rejected/failed/confirmed state or replace another persisted signature. Identical signature retries reconcile the existing active operation; a raced different signature returns 409. An already-terminal initial read retains the prior API behavior of returning that terminal operation unchanged. Only active matching persisted signatures enter reconciliation.

This resolves the server P2 documented in Stage 3. The frontend's additional GET-after-rejection safeguard remains useful defense in depth and was not removed. No hashes, transaction instructions, deadlines or escrow policies changed.

## Files owned by this backend handoff

- `src/app/api/operations/[id]/route.ts`: atomic updates and authoritative winner responses.
- `tests/stage-3-backend-contracts.test.ts`: replaced the passing incorrect-behavior characterization with desired-behavior tests; added same-signature, conflicting-signature, terminal and rejection race coverage.
- `scripts/verify-stage-4-operation-races.ts`: executes the **exact SQL templates extracted from the route** through independent PostgreSQL connections in a newly created disposable namespace; deletes only that namespace afterward.
- `scripts/verify-stage-4-devnet.ts`: controlled participant/outsider identities, Devnet-only scripted signing, messages/dedup, attachment/link delivery, immutable manifests, revision, rejection preserving balances/deadline, payout, legacy text and separate refund. Saves generated recovery secrets only in ignored `tmp/` with mode 0600, never in reports or stdout. Existing user records are preserved.
- This report and local aggregate evidence under `output/stage-4-backend/`.

## Completed checks

- Desired-behavior operation/reconciliation regression suite: **24 tests / 2 files passed**.
- Combined backend suite: **84 tests / 12 files passed**, rerun on 2026-10-13. Covers desired operation transitions, reconciliation, participant messages/feedback, authentication contracts, funding, attachment validation/access/retry, immutable hashes, advisory materials, domain/codec and LiteSVM execution.
- `npm run typecheck`: **passed**, including a fresh shared-tree run on 2026-10-13. Frontend Lead must rerun all checks for final release sources because concurrent frontend edits continue.
- Real PostgreSQL exact-route-SQL checks: **8 passed** for signature/rejection in both orders, duplicate signatures, conflicting signatures, all three terminal states and wrong-actor denial. Exactly one competing transition wins; terminal rows do not revive. Tests used only their private temporary namespace and dropped it. Evidence: `output/stage-4-backend/operation-races.json`.

## Integration setup and remaining release gates

An isolated local source copy at ignored `tmp/stage-4-integration-app` serves port 3204, with its own Next development output/lock and local auth origin. It shares installed dependencies and configured Neon/private Blob/Devnet services. It does not run a production build or interfere with Frontend Lead's port 3000 server. The captured backend source fingerprint/base SHA are recorded in `output/stage-4-backend/local-source.json`; uncommitted source is used for local verification only, never deployment.

The fresh journey uses generated controlled Ed25519 wallets and the existing ignored Devnet deployment payer. **These are scripted test-wallet transactions, not human browser wallet signing.** No human signing result is claimed. No mainnet transactions, bulk deletes, user-record edits, migrations or paid services are part of this verification. Fresh accounts/quests are explicitly controlled test records; confirmed test deliverables are retained under the existing immutability policy.

### Fresh local Devnet result

**Passed: 13 finalized transactions** against `http://localhost:3204`, run `96bf9c8a-c1bb-42db-b455-6ed40904f4b1`. Isolated copy base: `c07b88f34e3ad0c516f1d6fa156175c3b8be05e5` with uncommitted Stage 4 changes. The current operation route's SHA-256 matches the captured verified route; this is a local source fingerprint, not a deployed commit.

Verified funding/claim; worker/requester messages and retry deduplication; text, image and PDF uploads plus a labeled commit-specific link; original/revised frozen hashes matching finalized on-chain submission hashes; private requester download and anonymous/outsider/copied-ticket denial; interrupted-response upload retry and immutable DB guards; declined-signature retry; repeated identical signature PATCH and conflicting-signature 409; confirmed revision and rejection feedback; rejection keeping `in-review`, the exact prior deadline and unchanged worker balance; approval crediting **1,000,000 lamports** to the worker; legacy text-only submit/pay; and a separate funded cancellation refund crediting **995,000 net lamports** after its 5,000-lamport transaction fee.

Evidence: `output/stage-4-backend/local-devnet.json` (all public Devnet transaction receipts and assertions), `local-source.json` (captured source), `local-readiness.json` (current route match/readiness), and `operation-races.json` (real PostgreSQL races). The existing configured credentials/storage and ignored Devnet payer were sufficient: no credential or funding dependency blocks local readiness. Human browser wallet signing was **not** performed and is not represented as passed. Optional live Gemini review was not requested by this script run; attachment advisory schema/material regression checks did pass.

### Coordinated release and hosted verification

Frontend Lead must run final working-tree/isolated-source tests, TypeScript and production build, then perform the single authorized coordinated commit/push. Hosted integration is pending that release; no current Stage 4 deployment SHA or hosted-pass result is claimed. After release, run:

```sh
STAGE4_ORIGIN=https://bountini.us STAGE4_SOURCE_SHA=<verified-deployment-sha> STAGE4_EVIDENCE=output/stage-4-backend/hosted-devnet.json DEMO_WORKER_ONLY=true node --env-file=.env.local --import tsx scripts/verify-stage-4-devnet.ts
```

Use the exact Git-triggered READY deployment SHA/production alias, record it with hosted receipts, and preserve the distinction between local uncommitted-source checks and hosted exact-SHA checks. The backend introduces no additional frontend API requirements beyond the unchanged `{ operation }` response now reflecting the authoritative race winner. The known server P2 is fixed and locally verified; no backend release blocker remains.
