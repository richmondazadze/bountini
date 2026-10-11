# Bountini

Small quests. Real rewards. A text-first bounty marketplace with wallet authentication, Anchor escrow, PostgreSQL persistence and a reconciliation worker. Devnet test SOL has no cash value.

## Run

Node 24 recommended. `npm ci`, copy `.env.example` to `.env.local` and fill `DATABASE_URL`. Run `node --env-file=.env.local --import tsx db/migrate.ts`, then `npm run dev`. The app serves at http://localhost:3000. `/components` is the interaction/state gallery. A Wallet Standard wallet is required to sign in. Set APP_ORIGIN to the exact browser origin.

Secrets stay in server variables. Browser wallets sign; no participant private key is stored by the app. Temporary test/deployment keypairs belong under ignored `tmp/` only.

## Escrow

Anchor 0.32.1, Agave 2.3.0. Run `anchor build` with their binaries on PATH, then `npm test`. The Cargo lockfile pins transitive dependencies compatible with the Solana SBF compiler. The generated IDL is at `src/chain/generated/escrow.json`; codec tests verify instruction discriminators against it. Account codecs are exercised against actual SBF execution in LiteSVM.

`npm test` runs domain, codec and compiled-program tests. The compiled-program suite is skipped when the binary is absent; run `anchor build` first to include it. `npm run typecheck` and `npm run build` validate the web app. CI builds the program before running contract tests.

Program public address: `DYf6RhzG8RLw3zhoa2C9RDXWkBJ2Qgss9Mnmarbk7fce`. This address is reserved; deployment status is recorded in `docs/build-status.md`. Never configure an undeployed address as a live escrow. `docs/domain-rules.md` records the approved rules.

## Operations

Set the same DATABASE_URL, SOLANA_RPC_URL and NEXT_PUBLIC_ESCROW_PROGRAM_ID on the web app and worker. `npm run worker` runs reconciliation. The worker verifies the Devnet genesis hash, finalized transaction, signer, exact instruction data, expected blockhash, account PDA, owner and immutable agreement. It projects chain state using monotonically increasing slots. Signed transaction signatures are persisted before broadcast; expired blockhashes allow safe recovery after the chain proves the transaction absent. Critical financial states are never based on a browser timer or client success flag.

## Hosting

Vercel web/API, Neon PostgreSQL, Render worker, Porkbun domain bountini.us. AI and voice are intentionally disabled until the manual two-wallet Devnet journey passes; Gemini and ElevenLabs integration is a later phase gate.
