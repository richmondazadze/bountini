# Build status

## Implemented

Next.js/React/Tailwind/Motion app with landing, Discover, Create, Details, Submit & Review, My Bountini and component gallery. Original Bountini artwork. Responsive layouts, accessible native selection/dialog controls, local draft persistence, wallet discovery and message sign-in. Exact SOL conversion and canonical agreement hashing. PostgreSQL migrations, private draft/submission authorization, single-use origin-bound wallet challenges and sessions. Signed transaction persistence before broadcast, operation recovery, finalized-chain reconciliation and background worker.

Anchor program enforces fund, independent single claim, text submission hashes, approval, single revision, explicit rejection preserving review deadline, worker-signed withdrawal and requester refund/cancellation/expiry. Timely revision starts a fresh review window. No mainnet transactions.

## Verified locally

Production web build and TypeScript checks. 24 domain/codec/SBF execution tests covering exact payout, wrong recipients, unauthorized actions, repeated settlement, exact deadlines, rejection-to-approval and both revision outcomes. Program deployed on local validator. Neon project bountini-devnet (holy-sun-76149658), free plan, AWS Ohio; migrations applied.

## Pending release gates

Devnet program deployment and real two-wallet payout/refund receipts. Public RPC faucet is rate-limited; deployment wallet is awaiting test funding. Gemini and ElevenLabs remain disabled until manual Devnet gate passes. Hosting resources, domain and existing accounts were inspected. Vercel/Render deployment and DNS configuration still require completion. Design-canvas corrections and responsive/accessibility checks are in progress.
