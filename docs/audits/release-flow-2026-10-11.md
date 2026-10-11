# End-to-end Devnet release review — 2026-10-11

## Outcome and scope

Review covers guest entry, email accounts, requester/worker dashboards, wallet linking, escrow authorization and recovery, private communication, notification reads, profile privacy, assistance, responsive layout, and the Git production release path. Solana remains on Devnet. Passing these checks is evidence for a Devnet beta; it is not a guarantee that every possible failure or production load has been exercised.

## Fixed findings

1. **P1 — Wallet reconnection on fresh load.** SolanaProvider enabled WalletPersistence by default. It reads solana:last-connector and attempts connection on mount, independently of email authentication. In the installed SDK, a saved autoconnect=true preference overrides autoConnect=false through an OR condition. Disabled wallet persistence entirely. Existing saved preferences are ignored. Wallet connection and signing now require explicit actions; authenticated email sessions still persist normally. Regression tests seed both legacy and current saved MetaMask preferences, verify zero connect calls on mount, and verify an intentional click connects. The initial Chrome reload did not reproduce a popup in its current state; the SDK's automatic connection path was confirmed from installed source and tests.
2. **P2 — Message-history pagination reset by polling.** Latest-message polling could reset hasMore after the entire history had been retrieved. Preserve the history boundary, deduplicate earlier responses, and disable overlapping history requests.
3. **P2 — Stale history after an account switch.** Guard earlier-message responses with the workroom generation and clear pending/composer/report state when identity or participation changes. Tests verify the old account's response is discarded.
4. **P2 — Browser storage could interrupt work.** Draft autosave and transaction signature persistence called localStorage without handling storage denial/quota errors. Guard writes and cleanup. Server-side operation/signature recording remains the recovery source when local storage is unavailable. Regression testing verifies the quest editor still works with blocked storage.
5. **P2 — Password fields retained across account changes.** Clear both password fields and account notices when the current account changes.
6. **Dependency findings.** Six moderate npm findings traced to UUID 9 under MetaMask utilities. Pin only the MetaMask utility dependency to UUID 11.1.1, which retains CommonJS support and is a patched version listed in the [maintainer advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Production build and MetaMask utility loading pass. Runtime npm audit now reports zero known vulnerabilities.

## Validation

- 83 tests across 18 files passed; TypeScript and optimized production build passed.
- 23 hosted HTTP checks passed: public entry pages, health, private account/notifications/participant endpoints, authenticated mutations, malformed pagination and missing quests.
- Actual database-backed Better Auth tests passed password policy, immediate signup/login, password hashing, hostile-origin rejection, single-use password recovery and session revocation.
- Browser requester sign-in returned to /create with Requester preference saved; the private editor was available and saving required wallet proof.
- Browser role switch displayed the Worker dashboard. Profile edits survived a fresh reload. Profile and navigation were inspected at 390×844 without horizontal overflow.
- Wallet/escrow tests cover account changes, Devnet signing, transaction state transitions, revision deadlines, withdrawal/refund and authorization. The hosted demo runner was updated to create email accounts before wallet proof, retain both account and wallet cookies, and wait for signup rate limits.
- Earlier notification and list regression fixes remain covered, including unread items outside the displayed eight and delayed load-more responses.
- No existing user's escrow was modified. Devnet checks use generated test identities and the temporary test payer.

## Remaining release work

- Human microphone walkthrough remains required: permission denial, audible conversation, mute/unmute, stopping audio, and returning to typed assistance on interruption. API configuration and signed-session creation alone cannot prove microphone behavior.
- Reports are recorded privately, but there is no staff moderation dashboard or demonstrated support-response process. Assign an operator and establish a report-review procedure before inviting broad public use.
- No sustained load/failover test, external penetration test, or independent smart-contract audit was performed in this review. These are separate validation tasks, particularly before any real-money scope.
- The app deliberately uses unconfirmed email/password accounts. Profile copy does not claim email ownership verification; wallet ownership requires a signature.

## Fresh hosted escrow evidence

The two-account hosted journey passed after updating the demo runner for email-first authentication: funding, claim, submission, confirmed revision feedback, revised submission, rejection with approval still available, payout, and a separate cancellation/refund. Transaction reconciliation was performed by the hosted background worker rather than by foreground operation polling. Exact balance assertions verified a 1,000,000-lamport payout and a 995,000-lamport net refund after the transaction fee. Gemini advisory review succeeded against the revised confirmed submission.

The successful run is recorded in output/revision-feedback-demo.json. The initial run stopped at the expected signup rate limit when combined with browser QA; the runner now waits for the rate-limit window. Its generated test records are isolated from existing users.
