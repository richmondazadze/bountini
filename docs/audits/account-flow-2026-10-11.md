# Requester and executor account-flow audit

Date: 2026-10-11. Release source: ef5f0ce. Scope: current hosted guest UI, anonymous hosted API authorization, and source review of authenticated requester/worker paths. No application code changed and no escrow transactions performed. Prior authenticated integration/browser checks are cited as existing evidence, not repeated in this audit.

## Assessment

The server requires a verified email session for private account access and an account-bound proven wallet session for escrow operations. Anonymous visitors cannot persist a bounty, obtain wallet challenges, claim, submit, review, message, or use paid assistance through the application APIs. The guest interface nevertheless exposes several controls before their prerequisites are met. The product journey needs tightening before calling onboarding complete.

## Findings

1. P2 — Wallet connection is offered before authentication. Header renders Connect wallet and connector selection for guests; only linking is gated. This is not an observed authorization bypass, but invites the obsolete wallet-login journey. Gate the entire connection entry behind a verified account, including direct modal opening; retain account sign-in as the guest primary action. Source: src/components/header.tsx:136.
2. P2 — Guests enter the full quest editor and an enabled save control. Create renders CreateForm for guest and allows review; save only checks agreement acceptance in UI. Server rejects persistence with 401. Replace the guest editor with an account gate for the requested account-first workflow. Authenticated users without a linked active wallet should get a clear setup step before saving. Source: src/components/create.tsx:45,191.
3. P2 — Preparing a guest draft then signing in breaks continuity. Local draft keys use guest versus user ID, and sign-in always redirects to /my. The prepared text remains in the guest key but is not loaded in the signed-in editor. Gate before editing; do not silently import a shared-device guest draft. Source: src/components/create.tsx:53, src/components/account-form.tsx:34,64.
4. P2 — Worker acquisition loses the chosen quest across authentication. Public quest CTA points to /account without a safe return destination; sign-in/verification callbacks go to /my. No worker intent is carried into registration, so a first-time executor must find the quest again and switch dashboard manually. Preserve a validated same-origin relative return URL plus optional role intent; after verification return to that quest and present wallet linking. Claim still requires explicit wallet authorization. Source: src/components/details.tsx:421, src/components/account-form.tsx:34,64.
5. P2 — Assistance exposes unavailable controls and misleading errors. Guest Start voice is enabled when globally configured; typed text enables Suggest requirements independently of account/wallet state. APIs deny unauthenticated requests. Voice catches all failures as microphone/connection failures, hiding a login failure. Copy still says Sign in with your wallet first. Gate assistance by actual prerequisites and show account/wallet setup errors accurately. Source: src/components/assistance.tsx:85,119,146,175.
6. P3 — Wallet proof and email sign-in terminology remains mixed. Wallet modal calls successful linking Signed in; auth/session and transaction errors say sign in with wallet. Use distinct labels: account signed in, wallet connected, wallet verified. Source: src/components/header.tsx:179, src/server/auth.ts:11, src/components/details.tsx:244.
7. P3 — Guest submit/review navigation appears actionable. Open submit & review is public even though private content/actions remain gated. Public review shell is not a data leak, but action wording should prompt login before entering a participant workflow. Source: src/components/details.tsx:610.

## Desired requester journey

Land on public homepage → choose Post a quest → create account/sign in → verify email → return to requester setup → complete optional profile → connect wallet and sign ownership proof → create persisted private draft → review immutable agreement → separately sign Devnet funding → public Open quest → assigned worker/workroom → confirmed submission → approve, request revision, or reject under existing deadlines → confirmed payout/refund and notification.

Verified account without a connected wallet can use dashboard, profile, notifications and existing participant workrooms. Creating a persisted draft currently requires a proven wallet because its immutable requester is a chain address. Funding and review decisions require the correct active participant wallet, not merely a dashboard role.

## Desired executor journey

Land on public homepage or shared quest → browse public open quests → choose Sign in to claim → account signup/sign-in and email verification → return to the selected quest with worker intent → connect and prove a wallet → explicitly sign Claim → only after confirmation show assigned workroom and delivery deadline → private messaging → submit text with transaction confirmation → receive confirmed revision feedback if requested → timely revision → payout to assigned wallet after requester approval, or applicable withdrawal/refund outcome.

Choosing Worker/Requester changes dashboard preference; it must not grant participant permissions. One account may do both. The same account cannot claim its own quest through another linked wallet in the application API.

## Access matrix

| Capability | Guest/unverified | Verified account | Correct proven active wallet |
|---|---|---|---|
| Homepage, discovery, published brief/profile/chain receipt | Public | Public | Public |
| Dashboard, settings, notifications | Denied | Own account | Not needed |
| Link a new wallet | Denied | Fresh account session required | Ownership signature required |
| Persist quest draft | Denied | Insufficient alone | Required |
| Private draft, submissions, review feedback, messages | Denied | Linked-wallet participant only | Not needed for reading/messages |
| Fund/claim/submit/review/refund/withdraw | Denied | Insufficient alone | Wallet/state/deadline checks plus transaction signature |
| AI drafting/voice | Denied | Insufficient under current policy | Proven session required |

## Fresh validation

Hosted signed-out browser: /create shows full editor and Connect wallet; /my shows only a sign-in gate; published quest shows public brief/receipt, sign-in prompts, no claim/fund controls, and workroom sign-in gate.

Anonymous hosted GET: /api/me, /api/notifications, /api/bounties?mine=true, and the existing bounty's messages/submissions/feedback all returned 401. Published bounty returned 200 as intended.

Anonymous same-origin POST with empty JSON: /api/bounties, existing bounty operations/messages, /api/auth/challenge, /api/voice/session and /api/ai/draft all returned 401 before payload processing. No mutations or external assistance sessions created.

Source review: verified-email accountSession, fresh session for linking, walletSession joins account ID and wallet ownership, participant-only private reads, requester/worker state checks, same-account self-claim refusal, and distinct public versus private routes.

Existing release evidence: 58 tests; database-backed auth verification/reset/session revocation; hosted three-account outsider denial and wallet ownership checks; requester/worker browser messaging updates and persistent role/profile. See docs/build-status.md. These were not re-run as part of this read-only audit. This audit is not a comprehensive penetration test or a new chain lifecycle run.

## Acceptance criteria for fixes

Guest Create/claim/assistance/wallet entry consistently routes to account setup. No private editor or connector selector before verification. Safe return destination and role intent survive sign-in and verification. Account loading and expired sessions show explicit gates. Verified users without wallets get one clear setup instruction. Participant-only private content remains protected on direct requests; hidden buttons never substitute for authorization. Existing Devnet funding and settlement policies stay unchanged.

## Fix implementation

All seven findings are addressed: guest wallet controls/modal are hidden and gated; guest creation renders only an account gate; no new guest draft is created; whitelisted return destinations and role intent survive signup, login and verification; private actions and assistance require a matching verified wallet session; wallet-proof language is distinct from account sign-in; guest review/workroom links preserve the chosen quest through authentication. Existing server authorization remains authoritative. The return allowlist rejects external URLs, protocol-relative URLs, encoded paths and arbitrary query strings.

Validation: 66 automated tests, TypeScript and production build passed. The real Better Auth/Neon integration verified that the email-verification redirect preserves /create and requester intent, alongside existing verification, recovery and session-revocation checks. Hosted requester sign-in returned to /create and persisted requester preference. Configured voice/AI and saving stayed disabled without a proven wallet, even after agreement acceptance. Production deployment: dpl_5U48CvEjFvzBy98PmHVBXxLfxaLr.

Hosted worker continuation passed: signing in from the selected quest returned to that exact quest and persisted Worker preference. Signing out restored the guest account gate and hid wallet controls. Controlled QA account removed. Wallet-access race tests deny stale verification after an account switch and clear access on sign-out.
