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
