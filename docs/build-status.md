# Build status

The app is live at https://bountini.us on Vercel, backed by Neon PostgreSQL in AWS Ohio. The private source repository is https://github.com/richmondazadze/bountini. Porkbun apex DNS routes to Vercel; unrelated records remain intact.

## Implemented and verified

Landing, Discover with server search/filter/pagination, Create, Details, submission/review, My Bountini and component gallery. Wallet Standard connection and signed, origin-bound authentication; private drafts and submissions; exact SOL conversion; immutable agreement hashes; transaction persistence before broadcast, recovery and finalized-chain reconciliation.

Anchor program deployed on Solana Devnet: DYf6RhzG8RLw3zhoa2C9RDXWkBJ2Qgss9Mnmarbk7fce. Against https://bountini.us, two independent signers completed real API-driven funding, claim, submission, requester approval/payout and cancellation/refund. Receipts are in output/devnet-demo.json. Only Devnet test SOL is used.

24 domain, codec and compiled-SBF tests cover wrong recipients, unauthorized actions, repeated settlement, deadline boundaries, rejection followed by approval, withdrawal and both revision outcomes. TypeScript and production build pass. Final GitHub CI passed for commit 1a8594c: application build/type checks and the escrow job, including all 24 compiled-SBF tests. Deadline boundaries were simulated against compiled SBF; a full wall-clock expiry journey was not rehearsed on Devnet.

Gemini 3.6 Flash structured requirements and advisory review pass hosted API checks. The 3.8 Flash service returned temporary high-demand errors during release verification. An authenticated ElevenLabs agent is configured and its signed WebSocket conversation returned audio and a task clarification. Browser microphone/ASR interaction still needs a human walkthrough. Mobile 320px layouts show no horizontal overflow, and Escape restores dialog focus to its trigger. AI never authorizes payout. Server-only keys, per-wallet quotas and manual editing remain in place.

The native design source has corrected component families, semantic modes, responsive specimens and chart layout. Updated PDF and ZIP are in output/.

## Remaining operational setup

The user approved Render's $7/month always-on worker. Render requires payment-card setup before creation; the Add Card dialog is open for the user. A browser state read exposed the Neon connection credential in tool output despite the masked form, so its role password needs user rotation. Update DATABASE_URL in .env.local, then replace the value in Vercel and Render privately before completing the worker deployment. No application API keys were exposed.

A local reconciliation worker is running during this session; API polling also reconciles operations. Continuous unattended reconciliation requires the hosted worker. render.yaml contains the prepared Ohio starter configuration.
