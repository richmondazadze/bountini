# Stage 1b — shared navigation and discovery polish

The approved marketplace composition is integrated into the existing application. Discovery defaults to **Open quests** through the existing server status filter. It has compact search, supported-category buttons, bounded QuestCard compositions, a desktop status rail and a mobile filter dialog. RequesterIdentity uses returned names with initials, or the actual shortened wallet address; no avatar upload, rating or verification signal is implied. MetadataGrid labels real reward, category and chain deadline data; the delivery window comes from the existing domain policy.

PublicNav uses Find a quest, How it works, Post a quest and safe sign-in continuation. How it works points to an anchor added to the existing homepage section; the landing composition/content was not replaced. WorkspaceNav remains controlled by the existing account provider, with persistent Requester/Worker mode, distinct destinations and account/wallet controls. Mode affects navigation only. Authentication, explicit wallet connection, signed proof and quest permissions are unchanged.

Fonts, global brand/semantic color definitions and existing corner radii are unchanged. New presentation uses those variables, square cards/initials and existing controls. Discovery is immediately visible without an entrance fade; the existing Motion library supplies a small hover affordance that is disabled for reduced motion. No prototype module, fixture data, simulated identity, review control or missing-content placeholder is imported by a production route.

## Query and recovery behavior

Search/category/status parameters, debouncing, visible/online polling, page reset on refresh, overlap deduplication and generation guards are retained. Filter/account changes clear the previous result set while loading, preventing it from appearing under a new query after a failure. Retrying an initial load preserves current filters. A failed pagination request retains loaded cards and retries that same page instead of restarting at page zero. Empty results distinguish no open work from an unsuccessful request; other states remain explicitly available. Reset restores Open quests.

## Validation

- Guest live discovery, sign-in continuation, real QA-account role switch and persistence after reload checked in the browser. The configured local auth origin is port 3000; the production build was used there without expanding trusted origins.
- Mobile filter/public menu focus containment, Escape and trigger focus restoration checked. Real combined search/category and alternate-state results checked.
- Real open records and all-state records inspected, including full long titles, sparse category results, names, rewards, categories, statuses and deadlines.
- Loaded layouts checked at 320, 390, 768 and 1440 px without horizontal page overflow. Content remains immediately visible. Rendered light-theme text contrast samples pass; palette definitions are untouched.
- Regression tests cover account persistence/failure/concurrency, guest/auth return behavior, old filter/account/page responses, polling, pagination retries/deduplication, empty/loading/failure states, full titles, supported metadata and reduced-motion/no-entrance behavior. Wallet regressions verify no connect or signature request on page load/mode changes.
- Tests, TypeScript and production build pass. An isolated release-source copy is checked before commit so unrelated local prototype files do not enter the release.

Screenshots and detailed checks are recorded in `output/stage-1b/`. Deployment verification is recorded there after the single commit/push; Vercel must deploy the exact pushed SHA. A recovery from that SHA is allowed only if the Git deployment is unavailable or fails, following AGENTS.md.

## Deferred data and product work

There is **no keyword-based exclusion, deletion or recategorization**. Persisted QA/demo records remain visible when their current status matches. Exclusion requires an explicit server-owned classification field, reviewed/reversible backfill and filtering before pagination/counts; coordinate schema, API validation, create/admin tools and discovery together.

The current four categories remain Translation, Writing, Community and Development. Adding **Design** requires coordinated stable category values, server validation, creation/drafting/AI taxonomy, filters/counts, reviewed record migration and tests. Existing design tasks stored under Writing/Development are not silently relabeled.

Landing replacement, quest details/claim, workroom, delivery, review and settlement presentation remain for later stages. No new organization features, payment guarantees or endorsements are advertised. Live wallet signing was not performed during this presentation release; existing permission, wallet and escrow regression checks remain in place.
