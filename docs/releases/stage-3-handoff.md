# Stage 3 frontend and backend handoff

ActiveWorkroom integrates QuestContext, NextActionPanel, URL-linked section navigation, DeliveryComposer and PreparedSnapshot compositions around the existing Details transaction controller. `/bounties/[id]/review#overview`, `#messages`, `#deliverables`, `#review` and `#activity` are canonical workroom section links. Reload/hash/popstate synchronize the selected section. Mounted, hidden sections preserve editor state, uploads and message scroll position during navigation. Only participant accounts receive private slot content; workspace mode is never a permission input.

Fonts, global colors and radius definitions are unchanged. Real requester identity, participant names or wallet fallback, reward, status and deadline come from existing records. The next action prioritizes unresolved operations, terminal state, participant access, deadline, verified original wallet, delivery/revision and review. Review/payment controls stay connected to their existing handlers; their full presentation is Stage 4.

Message polling retains deduplication, sequence order and older-history exhaustion. Earlier history preserves the visible scroll anchor. Polling no longer moves readers away from history; a Show new messages control returns to the latest message explicitly. No smooth automatic scrolling is used. Account/quest-scoped message drafts and idempotency IDs survive reload and failed sends. Delivery text, links and completed file references retain the existing storage and retry pipeline. Only measured XHR upload bytes produce percentages; unknown lengths are indeterminate, and completed transfer awaiting server validation is labeled accordingly. Server preparation remains authoritative and opens the existing frozen-manifest confirmation dialog. Signature persistence, identity guards, reconciliation and check-before-retry behavior are unchanged.

## Backend capability boundaries

- Public source-file collection remains unavailable. Existing attachments are private participant deliverables. No public file gallery or fabricated source tiles are introduced.
- Upload transfer progress is available from XHR; server validation/processing progress is not. The frontend displays validating state without invented percentages.
- Unfinished File objects cannot survive a full browser reload. Completed references and draft input are retained; interrupted local files must be selected again. Existing uploadId retry is retained while the editor remains mounted.
- Workroom sections use supported safe `/review` authentication return destinations. Existing safeDestination permits no hash; sign-in returns to Overview. No authentication contract is expanded in this stage. Once signed in, section deep links, reloads and browser history preserve the section.
- Existing activity is the confirmed operation list; no chat audit history, typing indicators, read receipts, virus-scan badges or unsupported progress is advertised.

Frontend owns only React/CSS and UI regression tests. Backend verification belongs to Full Stack Dev and is recorded in `stage-3-backend-verification.md`. No server/API/schema/auth/escrow changes are authorized by this frontend assignment. A reproduced backend integrity defect blocks release until coordinated resolution is approved and verified. Keep Stage 3 local until both checks pass; Frontend Lead performs the single coordinated commit/push and verifies exact Git-triggered Vercel deployment.

Screenshots and validation evidence are retained in `output/stage-3/`. No wallet signing or payment is performed by presentation checks; actual transaction rejection/recovery and private access are covered by regression and backend tests.

## Final verification and release disposition

- Working tree: **221 tests / 34 files pass**, TypeScript and production build pass.
- Isolated release sources: **208 tests / 33 files pass**, TypeScript and production build pass. The difference is the 13 pre-existing local prototype next-action tests, which are outside this release. Local prototype routes are absent from the isolated build.
- Backend signoff: **76 backend tests** plus **48 integrated UI/recovery checks** pass; read-only Neon manifest/legacy hash and immutability checks pass. See `stage-3-backend-verification.md`.
- The reproduced P2 rejection-acknowledgement race is mitigated in the frontend: after declined signing, Details rereads the persisted operation, keeps unknown status locked if verification fails, and ignores old-identity callbacks. A concurrent signature regression proves another claim stays disabled. Full Stack Dev reviewed this mitigation and declared the race **nonblocking for Stage 3**; the separate server atomic-response fix remains documented, with no server edits here.
- Browser: real-record guest and signed-in nonparticipant privacy states checked; safe `/review` sign-in continuation returned correctly; the controlled QA account was signed out afterward. Section deep links, reload, back/forward and Enter navigation passed. Loaded layouts at 320/390/768/1440 px have one h1, no page overflow and immediately visible content. Rendered muted/action contrast samples exceed 5.5:1. Motion is limited to the section indicator and disabled by reduced motion; message scrolling is immediate and preserves reader position.
- Current QA credentials belong to a nonparticipant account. New live participant uploads/signatures were not performed. Private delivery/revision, upload-state, manifest, identity and recovery presentation are verified by UI/backend regression tests; the earlier two-account Devnet journey is historical evidence only.

Frontend Lead will release these coordinated frontend/docs/test changes with one commit and push, then verify Vercel source=git, READY, production alias and exact SHA. Deployment artifacts remain in `output/stage-3/`. Unrelated local design boards, prototypes and ignore changes stay out of the commit.
