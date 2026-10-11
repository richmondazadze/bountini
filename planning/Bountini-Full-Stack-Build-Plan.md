# Bountini full-stack build plan

## Target and scope

Deliver the agreed Devnet v1: describe a task by voice or text, review fixed requirements, fund escrow, let one worker claim and submit text, get advisory AI feedback, then have the requester approve payment or use the agreed revision/expiry paths. The deployed app must work with two independent wallets and real Devnet transactions. The primary demonstration is a Spanish translation bounty. Devnet test SOL has no monetary value.

The visual direction is ready. Component architecture, token typing/theme bindings, selection controls, spec mismatches and the data-slide layout remain engineering-handoff corrections, completed during Phase 2. No brand redesign is required.

Text submissions are v1. File uploads, public reputation, marketplace messaging, multiple workers and production dispute resolution are later scope. Existing design examples using links/attachments must be reconciled with the text-first implementation.

## Proposed architecture

- Frontend: Next.js App Router, React, TypeScript, Tailwind and Motion, implementing the approved Bountini tokens and original assets.
- Backend: Next.js server route handlers plus a separately scheduled reconciliation worker; shared typed input/output contracts. Split a dedicated API service only if operational needs justify it.
- Persistence: PostgreSQL for content, wallet-linked identities, drafts, submissions, review history and transaction operations.
- Blockchain: Rust/Anchor escrow program, generated client compatible with Solana Kit and React wallet bindings, local validator then Devnet. Pin and verify compatible toolchain/client versions in Phase 1.
- AI: Gemini structured requirement extraction and advisory review; ElevenLabs conversational creation through authenticated short-lived sessions.
- Delivery: managed Next.js hosting, managed PostgreSQL and a supported background-worker scheduler. Select existing accounts and regional settings during environment setup.

The program controls participants, fixed agreement hashes, deadlines and reward movement. The database stores private content and a reconciled projection of chain state. Browser wallet signing approves transactions. Backend credentials and AI keys stay server-side; worker/requester private keys are never stored by the application.

## Phase 0 — Freeze domain rules and acceptance

Write a single transition table, instruction authorization matrix and shared domain types. Confirm 30-minute delivery, 10-minute review, one optional 10-minute revision and 10-minute final review. Define exact boundary behaviour using on-chain time. Fixed agreement includes requester, reward, requirements hash and timings.

Resolve the remaining ambiguity around explicit rejection, missed revision delivery, worker withdrawal and who can invoke each refund. A proposed rejection path must not accidentally introduce a new immediate-refund policy. Define rent/account cleanup, fee payer and persisted terminal receipts. Reconcile text-first scope with link/attachment design specimens.

Exit: every action has an authorized actor, legal source state, resulting state, deadline condition and exact fund destination.

## Phase 1 — Repository, environment and CI

Initialize the application repository while preserving design artifacts. Organize app, shared domain contracts, generated program client, escrow program and tests. Pin dependencies/toolchain, add lint/type/build checks, configure environment validation and an example environment file without secrets. Create local/staging configuration, migrations, structured logging and a health endpoint.

Exit: clean checkout starts locally, migrations run, CI is green, secrets are absent from client bundles.

## Phase 2 — Design system implementation

Correct the five review findings and implement real React primitives: buttons, inputs, selection controls, dialogs/drawers, navigation, status feedback, countdowns, quest rows, wallet/transaction panels and voice controls. Convert numeric design tokens to usable values, bind colours by semantic role and implement light/dark mappings. Use content-aware layout and explicit state variants. Match typography, padding and focus requirements to the written component contracts.

Verify representative components with long labels, keyboard input, 320px reflow, 200% zoom and reduced motion. Update OpenPencil specimens to match shipped components and fix the chart slide.

Exit: a component gallery demonstrates valid/default/loading/error/disabled/focus states and adapts without manual repositioning.

## Phase 3 — Escrow program and generated client

Implement program-derived bounty/escrow accounts and instructions for funding, claim, submit, revision request, revision submission, approval/payment, unclaimed cancellation, withdrawal/expiry and refund as allowed by Phase 0. Store integer lamports; use checked arithmetic. Validate signer, account ownership/seeds, requester/worker identity, immutable hashes and deadlines.

Test locally: unauthorized actions, two simultaneous claimants, requester claiming own work policy, mismatched hashes, duplicate settlement, wrong recipients, deadline boundaries and each legal terminal path. Generate instruction/account codecs from the program interface and verify the web client can call them.

Exit: local happy path pays exactly the agreed reward once; negative tests and refund paths pass. Record Devnet deployment/program ID when deployment is appropriate.

## Phase 4 — Backend, authentication and reconciliation

Implement wallet challenge/signature authentication with origin-bound, expiring, single-use nonces and secure sessions. Enforce authorization server-side on every mutation. Migrate users/wallets, bounty content, immutable requirement versions, submissions, review records and transaction operations.

Canonicalize content before hashing; preserve originals so hashes can be reproduced. Save draft/submission content before requesting the corresponding transaction; publish committed state only after chain verification. Implement idempotent operation IDs, transaction signature tracking, account reads, background retries and a reconciled chain projection. Never trust a client-provided success flag.

Exit: refresh, duplicate requests, RPC delays and worker restarts preserve content and converge to correct chain state.

## Phase 5 — Complete two-wallet product journey

Build and connect Discover, Create, Details, Submit & Review and My Bountini. Start with manual text creation and submission so the complete workflow works before AI integration. Add wallet connection/sign-in, review-before-funding, claim acknowledgement, authoritative deadlines, one revision, approval/payment, cancellation/refund where allowed, timeline and explorer receipts.

Separate wallet approval, submitting, confirming, confirmed, rejected, failed and unknown transaction states. Recheck a previous transaction before resubmitting an uncertain operation. After reconnect/refresh, recover the correct role and outstanding action.

Exit: two separate wallets complete creation → funding → claim → submission → approval → confirmed payout on Devnet. Repeat the cancellation and expiry journeys.

## Phase 6 — Gemini requirements and review

Add schema-validated requirement extraction from typed input or conversation context. Keep draft output editable and require explicit human review before funding. Review submitted text against the immutable checklist, returning criterion, evidence, concern and suggested revision. Treat submission content as untrusted data; avoid tool access or signing authority. Record requirement version, model/prompt version and feedback time.

Use bounded input sizes, timeouts, retry limits and per-user quotas. Preserve manual creation/review when AI fails. No AI response can release funds or mark a bounty paid.

Exit: the translation task yields useful structured requirements and traceable feedback; malformed output and service outage leave the core flow usable.

## Phase 7 — ElevenLabs voice creation

Implement explicit microphone activation, permission handling, short-lived authorized sessions, clarification questions and read-back of the proposed agreement. Make transcript/draft editable. Provide stop, mute, interrupted/reconnect and type-instead states. AI tool calls may update draft fields only; funding still requires review and wallet signing.

Define transcript retention/deletion and redact sensitive content from logs. Terminate recording/session on stop, navigation and cleanup. Prevent duplicate draft creation across reconnects.

Exit: a spoken translation request becomes a reviewed draft, and denied microphone permission/network failure cleanly falls back to typing.

## Phase 8 — Complete website and product polish

Finish branded landing page and how-it-works content, connect CTAs to the working app, and ship logos, favicons, font loading and sharing metadata. Complete filtering/search/pagination, posted/claimed/history views, action-needed states and responsive layouts. Preserve role, reward, network, deadlines and essential actions on mobile. Implement motion and reduced-motion behaviour; confirm theme contrast and exact money formatting.

Exit: every supported route and empty/error/pending state is designed and implemented; representative mobile and desktop journeys match the approved visual direction.

## Phase 9 — Integration, security and accessibility checks

Run meaningful contract, API and browser end-to-end tests. Include concurrent claims, deadline/payment races, duplicate submissions, wallet rejection/switching, expired sessions, RPC timeout, unknown transaction, stale database projection, AI outage and voice denial. Test hash/content agreement, exact balances and terminal receipts.

Check keyboard/screen-reader flows, focus restoration, responsive reflow, reduced motion and readable validation. Review authorization, nonce replay, CSRF protections, injection/XSS, secret exposure, request limits and logging. Test reconciliation after scheduler outage. Deadline passage alone cannot execute a Solana instruction: a user or keeper must submit the permitted expiry/refund transaction, whose recipient is fixed by the program.

Exit: critical journeys pass; no unresolved issue can produce wrong authorization, fund destination or misleading payment status.

## Phase 10 — Deploy, operate and demonstrate

Deploy the web app, database migrations, reconciliation worker and Devnet program. Configure the domain, environment secrets, RPC service, health checks, alerts, backup/restore procedure and rollback plan. Smoke-test the deployed app using two independent wallets. Publish the Devnet program ID and confirm explorer links use the same network.

Prepare demo bounty content and two test-funded wallets. Rehearse the three-minute flow; retain a typed-input fallback and clearly identified pre-recorded backup. Supply setup instructions, architecture explanation, program/client versions and recorded transaction receipts. Demonstrate limitations honestly: requester approval is required; rejected or expired work may remain unpaid.

Exit: a fresh visitor can complete the deployed core flow, the demo repeats reliably and failures provide accurate recovery rather than simulated success.

## Dependencies and scope after delivery

Sequence: rules → foundation → components + escrow → backend → working two-wallet flow → Gemini → voice → polish → hardening → release. Component construction and contract work can proceed independently after shared contracts are fixed; backend reconciliation depends on the program interface. AI integration must not delay proving escrow and the manual journey.

Mainnet release is a separate milestone requiring production dispute policy, contract security review, operational controls and explicit release authorization. The Devnet completion standard is a fully working application with test assets, not a claim of readiness for real-value funds.

## Reference documentation checked

- Next.js: https://nextjs.org/docs/app
- Solana frontend: https://solana.com/docs/frontend
- Anchor: https://www.anchor-lang.com/docs
- Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output
- ElevenLabs agents: https://elevenlabs.io/docs/eleven-agents/overview
- Tailwind/Next.js: https://tailwindcss.com/docs/installation/framework-guides/nextjs
- Motion/React: https://motion.dev/docs/react
