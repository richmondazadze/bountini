# Build status

The app is live at https://bountini.us on Vercel, backed by Neon PostgreSQL in AWS Ohio. The private source repository is https://github.com/richmondazadze/bountini. Porkbun apex DNS routes to Vercel; unrelated records remain intact.

## Implemented and verified

Landing, Discover with server search/filter/pagination, Create, Details, submission/review, My Bountini and component gallery. Wallet Standard connection and signed, origin-bound authentication; private drafts and submissions; exact SOL conversion; immutable agreement hashes; transaction persistence before broadcast, recovery and finalized-chain reconciliation.

Anchor program deployed on Solana Devnet: DYf6RhzG8RLw3zhoa2C9RDXWkBJ2Qgss9Mnmarbk7fce. Against https://bountini.us, two independent signers completed real API-driven funding, claim, submission, requester approval/payout and cancellation/refund. Receipts are in output/devnet-demo.json. Only Devnet test SOL is used.

24 domain, codec and compiled-SBF tests cover wrong recipients, unauthorized actions, repeated settlement, deadline boundaries, rejection followed by approval, withdrawal and both revision outcomes. TypeScript and production build pass. Final GitHub CI passed for commit 593ebeb: application build/type checks and the escrow job, including all 24 compiled-SBF tests. Deadline boundaries were simulated against compiled SBF; a full wall-clock expiry journey was not rehearsed on Devnet.

Gemini 3.6 Flash structured requirements and advisory review pass hosted API checks. The 3.8 Flash service returned temporary high-demand errors during release verification. An authenticated ElevenLabs agent is configured and its signed WebSocket conversation returned audio and a task clarification. Browser microphone/ASR interaction still needs a human walkthrough. Mobile 320px layouts show no horizontal overflow, and Escape restores dialog focus to its trigger. AI never authorizes payout. Server-only keys, per-wallet quotas and manual editing remain in place.

The native design source has corrected component families, semantic modes, responsive specimens and chart layout. Updated PDF and ZIP are in output/.

## Hosted reconciliation and credentials

The approved $7/month Render worker is live in Ohio: https://dashboard.render.com/worker/srv-db5hgo2d0e5s73fgam40. Its npm run worker process verifies Devnet and polls pending operations every 15 seconds. Safe startup diagnostics confirm database access without logging connection strings. The local worker is stopped. A fresh two-wallet journey passed with post-broadcast reconciliation API polling disabled: Render independently finalized funding, claim, submission, approval/payout and cancellation/refund. Exact balance assertions passed; receipts are in output/render-worker-demo.json.

The user rotated the Neon role password after a masked browser form exposed the original credential in tool output. The replacement is saved in ignored .env.local and privately applied to Vercel production/preview and Render. Hosted authentication, draft privacy, Gemini requirements and signed ElevenLabs session checks passed after rotation. Browser secret values are inspected only through redacted comparisons.

## Product review fixes

Both review findings are resolved and deployed to https://bountini.us. The participant-only feedback endpoint returns revision and rejection comments only when their matching requester operation is confirmed. The worker's review screen shows those instructions above the revision editor, with confirmation receipts. Pending, failed and rejected wallet operations do not expose feedback.

Visible, online active bounty pages refresh every five seconds independently of the viewer's pending operation. Refreshes do not overlap, pause while hidden/offline and stop after settlement. New confirmed submission receipts reload submission content and reset advisory results; authentication changes reload private content. Form drafts remain intact.

All 33 tests pass, including nine new route and rendered-component checks for authorization, feedback display, remote submissions, changed submission versions, draft preservation, visibility/settlement, slow requests and session refresh. TypeScript and the production build pass.

A fresh hosted two-wallet Devnet journey verified funding, claim, original submission, revision request, timely revised submission, rejection followed by approval/payout, and cancellation/refund. Both participants retrieved confirmed feedback; pending comments were excluded; anonymous and unrelated wallets were denied. Exact payout/refund balances passed. The local worker remained stopped and post-broadcast reconciliation polling was disabled, so Render confirmed these operations. Receipts: output/revision-feedback-demo.json. A browser watching the public review page changed from In progress to In review and Revision requested without reloading; screenshot: output/revision-live-refresh.png. Participant content refresh is additionally covered by rendered-component tests. The browser microphone walkthrough remains outstanding as described above.

Production deployment: dpl_5JFe8yq7wEjM41utjChoV2wEo1i2.

## Wallet account and Devnet debugging

Fixed the installed Solana client 1.7 account-change behavior: its signing closure changed accounts while its published session and React store retained the original address. The adapter now publishes account changes and explicitly selects solana:devnet for Wallet Standard signing. Authentication synchronizes serially across account changes; late sign-in responses cannot mark another account signed in. Private draft data clears when the new account cannot access it, and a wallet change during transaction preparation/signing prevents broadcast.

Funding now checks confirmed Devnet balance before creating an operation or opening the wallet prompt, including reward, escrow rent and signature fee. Insufficient funds return the full funding address and required test SOL. The wallet dialog identifies the connector and full address.

All 40 tests, TypeScript and production build passed. New tests exercise the actual installed SDK with Wallet Standard account events and a mainnet-first account, late authentication responses, private draft account switching, and insufficient Devnet funds.

Deployed to bountini.us: dpl_FxggS8ta62PpPXDWJsqUTwKzG9ch. Live browser verification showed MetaMask supplies the original draft address even after a page reload. A fresh connection prompt selected Account 4, whereas the wallet home displayed a different account, explaining an additional site-specific account mismatch. The original address previously signed a verified login and had zero Devnet SOL at debugging time. Faucet requests were rate-limited; no new escrow funding transaction was broadcast. Completing the wallet connection and checking Account 4's receiving address remain a browser handoff; existing draft ownership is immutable.

## MetaMask sign-only network scope

A real Account 4 signing prompt still showed Solana Mainnet despite the Wallet Standard Devnet chain argument. MetaMask's published adapter source uses the existing session scope for signTransaction, ignoring that input. Bountini now uses MetaMask Connect's explicit multichain API for MetaMask sign-only requests: configure only Devnet, connect the exact account in the Devnet scope, verify its Devnet permission, and invoke signTransaction with that same scope in both the request and parameters. The injected sign-only method and wallet-side send method are not used for this path; Bountini retains its persisted-signature-before-broadcast recovery flow.

44 tests pass, including explicit scope signing in a mixed session, refusing mainnet-only or another Devnet account, and routing the actual MetaMask connector through the new signer after an account change. TypeScript and production build pass. Account 4 was confirmed by the user as the original requester; its Devnet balance subsequently reached 1 SOL. Real MetaMask prompt verification remains necessary before calling the wallet-specific funding issue resolved.

Browser follow-up: standalone MetaMask Connect initialization stalled without opening a prompt. The signer now preferentially reuses the injected wallet's public multichain provider, requests a Devnet-only session for the exact existing account if needed, rechecks the permission, and invokes the explicitly scoped sign-only method. The standalone SDK remains a fallback for wallets without that provider. Both injected transport outcomes are covered; all 46 tests and the production build pass. No user funding signature has been approved by the agent.

The injected-transport follow-up is live at bountini.us, deployment dpl_3dDrMwGreoEYxi5jXYt4NgaG7f5X (source c254e5d).

Live verification reached a MetaMask queue showing two confirmations, including a Mainnet simulation from the earlier attempts. Canceling through native automation was unreliable, so the user was asked to reject all queued signing requests before a clean Devnet prompt check. Screenshot: output/metamask-queued-request.png. Wallet-specific resolution is still unverified; no signature or funding broadcast was completed.

After Chrome was fully restarted, Account 4 reconnected and authenticated successfully. A clean funding request opened the Devnet-only account connection prompt. Once connected, MetaMask's actual signing screen displayed Solana Devnet, estimated a roughly 0.102 SOL debit, showed the 0.000005 SOL fee, and enabled Confirm without the earlier simulation warning. Screenshot: output/metamask-devnet-ready.png. The final transaction signature was handed to the user; funding settlement is not yet claimed.

User-approved MetaMask funding is verified end to end: transaction 4cHTZ9XPh3ex9zNjsrVT7XS1JrHWg795ckTQtMSyMwphWnzmMWkQ9uG6TSVKoqaWzvYxcx8SYT5VrUQfTMkMwh4b finalized successfully on Devnet. The escrow account EU7Qhh9rSiX4UPgB91HMMqZ1BXRAdKoTB23aY9Yy7eU9 belongs to the expected deployed program and holds exactly 100000000 reward lamports plus 1681480 rent lamports. Its requester, agreement hash, open state, absent worker/deadline and unused revision match Neon. The brief, title, category and requirements match the pre-funding backup. Exactly one funding operation has a signature and is confirmed; the earlier unsigned attempts are rejected or expired. A fresh browser reload preserves Open and the funding receipt. Hosted health returned 200 with database, escrow, AI and voice configured. Evidence: output/metamask-funding-verified.json and output/metamask-funded-bounty.png. The current bounty's later claim/submission/settlement has not been performed; separate prior Devnet journeys cover those paths.

## Email accounts and dual dashboards — 2026-10-11

Implemented verified email/password accounts with Better Auth 1.7.7 and dedicated PostgreSQL auth tables. Passwords use the library’s scrypt hashing, require at least 12 characters, and support single-use 15-minute recovery with session revocation. Production cookies are Secure and HttpOnly; the application uses origin checks, persistent auth rate limits, private/no-store participant responses and server-side membership checks. Linking a wallet requires a fresh verified account session and an account-bound, single-use signed challenge. A wallet can belong to only one account. Existing bounty requesters and escrow addresses are unchanged.

One account has a persistent Requester/Worker dashboard preference, a public profile and multiple signature-proven wallet links. Switching the dashboard does not grant permissions. Email sessions can view the account’s linked-wallet drafts, submissions, confirmed review feedback and private workrooms; escrow mutations additionally require the active verified wallet and its signature. Claiming your own quest through another wallet linked to the same account is refused by the application API.

Workroom messages persist with retry deduplication and bounded history pagination. Database triggers generate participant notifications for messages and confirmed operations, including worker reconciliation. Read state is persistent. Active workrooms and notifications refresh every five seconds, account and board data every ten seconds, and existing active bounty state every five seconds. Account changes clear private views and local draft keys are account-specific. Unsaved quest/submission form text remains on the device until submitted. Reports persist in Neon for operator review and do not pause escrow deadlines; an operator-facing moderation dashboard is not implemented.

With the user’s explicit approval, Resend’s DKIM TXT plus rsend/send CNAME records were added in Porkbun. bountini.us is verified for sending. A sending-only key restricted to that domain was stored privately in .env.local and Vercel production together with EMAIL_FROM="Bountini <accounts@bountini.us>". Resend reported the delivery test to its documented delivered+ test address as delivered. Authentication secrets and email credentials are not committed.

Validation: 58 tests pass across 11 files; TypeScript passes; the hosted production build passes. scripts/verify-accounts.ts exercised actual database-backed registration, required verification, wrong-password rejection, hostile-origin rejection, hashing, single-use password reset and old-session revocation. scripts/verify-workrooms.ts passed against the hosted application with three controlled accounts: account-bound wallet proof, exclusive ownership, private draft access, two-participant messaging, duplicate retry handling, outsider/anonymous denial, notifications/read state, linked-wallet dashboard queries and profile/role persistence. These controlled tests used no chain transactions and removed their test rows afterward. Hosted browser checks verified email/password sign-in, role switching across reload and profile save across reload. All controlled browser QA accounts and their workroom rows were removed after the check.

The existing user-funded bounty 4309d098-a658-4b60-baa8-a508204e5101 was independently rechecked after the account release: Open, 0.1 test SOL reward, 101681480 escrow lamports including rent, unchanged requester and agreement hash, no worker/deadline and one finalized funding signature. The new account owner must create and verify their own email account, then link MetaMask Account 4 by signature to recover that bounty in the Requester dashboard. No user password was chosen or escrow transaction signed by the agent.

Browser microphone interaction remains a human walkthrough from the earlier release. This deployment remains a Devnet beta, with test SOL and the existing requester-approval/refund policies; it does not support real-money payments.

Hosted UI communication check: the controlled Requester sent a message through the workroom form; the controlled Worker retrieved that reply through its own authenticated session and sent a new message. The Requester’s active browser received the Worker’s new message without a manual refresh. The mobile screen was reviewed at 390×844, including an explicit Devnet badge. Test screenshots are under output/ and are not part of the deployment.

Final production deployment: dpl_HevYTYL819XPwG9Kf39N4ofZFNcg, aliased to https://bountini.us. An actual hosted signup queued its verification email, and Resend showed that message as delivered to its documented test recipient. The controlled signup account was removed. Final hosted health returned 200 with accounts, email, database, escrow, AI and voice configured on Devnet.

## Account-first onboarding fixes — 2026-10-11

Resolved the requester/worker flow audit: verified email account required before opening the private quest editor or wallet selector. Active matching wallet verification gates saving, assistance and escrow controls. Signup/login/resend-verification preserve an allowlisted destination and optional dashboard role. Guest review and workroom links preserve the chosen quest. Wallet connection, ownership verification and email sign-in use distinct labels. Assistance reports actual errors and ends voice sessions when wallet access is lost.

66 tests, TypeScript and production build passed. Real Better Auth/Neon verification preserved requester intent and /create through the verification redirect; recovery and session-revocation checks passed. Hosted browser requester login returned to /create with requester preference saved, and saving stayed disabled without wallet proof after accepting agreement. No escrow transaction was performed. Production deployment: dpl_5U48CvEjFvzBy98PmHVBXxLfxaLr. Detailed findings and fixes: docs/audits/account-flow-2026-10-11.md.

Hosted worker continuation passed: signing in from the selected quest returned to that exact quest and persisted Worker preference. Signing out restored the guest account gate and hid wallet controls. Controlled QA account removed. Wallet-access race tests deny stale verification after an account switch and clear access on sign-out.

## Immediate account signup — 2026-10-11

At the user's request, mandatory email confirmation is removed. Signup creates an authenticated account immediately; existing accounts with emailVerified=false may sign in. Account access checks require a valid session rather than emailVerified, and public profiles no longer filter on that flag. Email verification sending and endpoints are disabled, and the resend control/inbox notice are removed. Account-first creation and wallet gates remain, with signature proof still required for wallets. Email password recovery, password policy, secure cookies, origin checks and rate limits remain active. No existing email is marked verified artificially.

67 tests, TypeScript and local production build passed. Real database-backed authentication checks passed immediate signup/login without confirmation, hashing, origin protection, single-use password recovery and session revocation. The unrelated motion project is excluded from the web TypeScript build and Vercel upload; its files are preserved.

Immediate-signup production deployment: dpl_38tK93wjP87JU9HZe393gjYx5FKW. Hosted registration returned a session and /api/me granted access while emailVerified remained false; subsequent password sign-in succeeded. Verification sending returned 404. Controlled test account removed. Hosted signup UI has no confirmation/resend flow.

## Dashboard updates, quest pagination and profile corrections — 2026-10-11

Notification reads now accept explicit IDs scoped to the signed-in account. The dashboard sends only its eight displayed IDs and retains the server's remaining unread count; polling cannot overwrite a completed read with an older response. Quest refreshes consistently reset the entire loaded list and pagination to page zero, and discard stale load-more responses. Profiles show the private account email without falsely claiming verification.

78 tests, TypeScript and the production build passed. Regression coverage includes unseen notification counts, ID validation and account boundaries, multi-page refresh resets, delayed pagination responses, and unconfirmed profile rendering. The hosted workroom verification now additionally checks twelve unread updates and another account's notification ID.

## Fresh-load wallet and end-to-end review — 2026-10-11

Disabled SolanaProvider wallet persistence so saved connectors cannot request MetaMask connection on page load, including before email authentication. Explicit authenticated connection remains available. Fixed workroom history pagination and stale responses on account changes, guarded device-storage writes during drafting/signature recovery, and cleared password fields when account identity changes. A targeted UUID override removes all six inherited moderate MetaMask dependency findings; runtime npm audit reports zero known vulnerabilities.

83 tests, TypeScript and production build passed. Hosted guest/private endpoint checks and real authentication/recovery checks passed. Browser requester return, worker role switching, profile sync and mobile layout were reviewed. A fresh two-account Devnet journey passed funding, claim, revision/rejection feedback, payout and refund through hosted worker reconciliation; Gemini advisory review passed. Detailed scope, evidence and remaining human/operational checks: docs/audits/release-flow-2026-10-11.md.

Hosted voice follow-up: production configuration matches local configuration. Signed-session creation and Gemini draft generation passed a repeated hosted test; the initial voice 503 led to a bounded provider retry and typed timeout fallback. Final 87 tests across 19 files, TypeScript and production build passed. Controlled QA accounts and quest rows removed after recording escrow receipts.
