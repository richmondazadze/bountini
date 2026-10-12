# Stage 2 — quest details and claim readiness

The approved QuestDetails composition now presents actual requester identity, status, category, agreement and acceptance criteria beside a reward/readiness panel. Mobile places reward, approval policy and the contextual action before the long agreement. Fonts, color definitions and radius tokens remain unchanged; existing semantic variables and square panels are reused. Drafts are explicitly unfunded, active stages use actual deadlines, and paid/refunded states offer no claim action.

Guest claim guidance preserves the quest return destination and Worker onboarding intent. Signed-in users explicitly open the existing wallet dialog from the blocked action. Opening the dialog does not connect or sign; closing restores the contextual trigger. Workspace mode continues to affect navigation only. The claim confirmation requires acknowledgement of the requirements, deadlines and approval rules before invoking the existing transaction pipeline.

## Preserved contracts

No API permissions, escrow policy, chain instruction, agreement hash or authentication flow changes. Funding, cancellation, withdrawal and expiry continue through existing handlers. Claim operations still check fresh server permissions and assignment before preparation, save signatures before broadcast, reconcile unknown requests before retry, and show success only on confirmation. Recovery callbacks now also discard responses after account/wallet changes. A failed explicit refresh keeps the public agreement visible while disabling actions until a successful refresh; inaccessible drafts are cleared.

Existing private attachments are worker deliverables, not public source files. There is no public source-file collection in the current API. The source-material region points to actual brief/criteria instructions; participant file access remains on the authorized review route. Private messages are mounted only for participant accounts on details. Workroom, delivery, review and settlement compositions otherwise remain for later stages.

## Validation

Regression coverage includes guest continuation/no private-file calls, self-claim across linked wallets, competing claims before preparation and during confirmation, declined signatures, signature persistence before broadcast, unknown-operation recovery, stale account/wallet callbacks, exact expiry boundaries, draft funding, terminal states, cancellation/withdrawal and retry preserving the agreement. Existing server, wallet, authentication, attachment and LiteSVM escrow tests remain in the suite.

Browser checks used the real open record at `/bounties/416c7575-1325-4fac-ad0c-6fdf79a20027`: guest continuation returned to the quest after QA sign-in; claim remained disabled without a wallet; explicit wallet guidance opened without a wallet prompt; Tab/Escape restored the contextual Connect wallet trigger. Loaded layouts at 320, 390, 768 and 1440 px had no horizontal overflow and reward preceded agreement on mobile. Screenshots and layout measurements are in `output/stage-2/`. No entrance animation hides content; the new scope explicitly disables motion for reduced-motion preferences. Palette definitions are unchanged.

Tests, TypeScript and the production build must pass in both the working tree and isolated release sources before the single commit/push. Git-triggered Vercel deployment evidence is recorded against the exact SHA after release.

## Limits

Live wallet signing was not performed during this release. Rejection, contention and recovery are validated through regression tests and existing escrow tests. Public source-file support would require a separately reviewed server data/access contract; no placeholder files or capabilities are advertised. Demo classification and Design taxonomy changes remain coordinated server work documented in Stage 1b.
