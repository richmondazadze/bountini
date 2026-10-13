# Stage 4 — human review and settlement handoff

Frontend Lead owns React/CSS, UI tests and the final coordinated release. Full Stack Dev owns the atomic operation PATCH race fix, backend tests and fresh controlled two-account Devnet walkthrough. Inspect concurrent changes before editing shared files. Preserve all brand fonts, color/radius definitions, permissions, escrow instructions and policies.

## Frontend integration

The existing `/bounties/[id]/review#review` section will group confirmed original/revised deliverables, fixed acceptance criteria, participant feedback, optional Gemini evidence/limitations and requester decision controls. The existing transaction controller remains authoritative. Requester-only approval/revision/rejection/expiry and worker withdrawal stay wired to existing actions and confirmations. Revision is single-use; rejection does not settle or reset deadlines. Approval, refund and payout are displayed as confirmed only from actual confirmed state/receipts, never the countdown or AI.

Keep Stage 3 section history, drafts, uploads, message reader position, private access, saved signatures and authoritative GET-after-rejection safeguard. Use progressive disclosure for hashes, signature links and AI trace details. Preserve feedback after failed decisions; discard old identity/quest callbacks. Gemini is opt-in and advisory and cannot inspect external URLs or authorize payment.

## Release gates and ownership

- Read `docs/releases/stage-4-backend-verification.md` when available. Verify desired-behavior race tests replace the Stage 3 defect characterization.
- Fresh controlled two-account Devnet walkthrough against coordinated local source must cover attachment/link submission, revision, rejection feedback, payout and refund. Record scripted versus browser/human signing honestly. If funding/credentials/signing prevents it, record the exact dependency and leave the release local.
- Frontend Lead performs complete working-tree and isolated release-source tests, TypeScript and production build. Avoid concurrent Next builds with Full Stack Dev; backend handoff should record its checks without a production build.
- Once all gates pass: one coordinated commit/push, exact Git-triggered Vercel SHA/source/production alias verification, then hosted smoke/integration checks. No separate backend deployment, manual normal-release deployment or uncommitted-source release.

## Capability boundaries

Confirmed submissions and feedback are participant-private. Public source materials remain unsupported; private worker files use existing access tickets. Gemini does not fetch linked URLs; supplied evidence is advisory. Server upload-processing progress, cloud drafts, additional revisions, payment protection and automatic expiry settlement remain unsupported. Required new backend capabilities will be documented here without silently changing APIs/schema.

Status: implementation and verification underway; no Stage 4 commit or deployment yet.

## Final local verification

Coordinated working-tree checks: 236 tests, TypeScript and production build pass. Isolated release source excludes unrelated local prototypes and is checked separately before commit. Backend signoff includes 84 targeted tests, eight real PostgreSQL exact-SQL race checks and a fresh 13-transaction local Devnet journey; see stage-4-backend-verification.md and output/stage-4-backend/local-devnet.json. Signing is scripted controlled-wallet signing, not human browser wallet signing.

Browser checks use those fresh controlled participant accounts and real confirmed submissions: requester review, version comparison, authorized file access, contributor feedback/terminal controls, deep links, and 320/390/768/1440 px layouts without horizontal overflow. Current requester decision eligibility/rejection/retry, active contributor forbidden controls, empty/error/private states and receipt-action matching are covered by UI tests. Reduced motion disables the existing section indicator; content remains immediately visible. Fonts, semantic colors and radii were not changed. No fixture data imports or simulation controls were added to customer routes.

AI remains opt-in and targets the latest confirmed server submission regardless of the selected historical version; the UI states that limitation. No live Gemini request or human browser wallet signing is claimed in this presentation check. Technical records are progressively disclosed; matching confirmed settlement history supplies receipts.

Release owner will include the coordinated atomic PATCH fix and desired-behavior tests, preserve GET-after-rejection, push once after final checks, verify exact Git-triggered production SHA, and rerun the controlled journey against that hosted SHA. No schema, policy, authentication, program or taxonomy changes are included.
