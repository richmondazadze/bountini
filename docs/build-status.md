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
