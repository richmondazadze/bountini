# Stage 5 — public product experience handoff

Frontend Lead owns the approved MarketingHero, CategoryCard, role workflow, voice explanation, EvidencePanel, community use cases, FAQ and CompanyFooter integration; public React/CSS/UI tests; and the single coordinated release. Full Stack Dev owns backend/integration verification and live Gemini validation in stage-5-backend-verification.md. No concurrent production builds or separate backend deployment.

## Destinations and truthful scope

Post a quest links to the existing `/create` flow. Guests continue through the existing safe `/account?next=%2Fcreate&role=requester` intent; signed-in users use the existing editor and voice assistant. Find work links to `/discover`, which defaults to open quests. Category links use `/discover?category=<supported-category>`; frontend query initialization must connect to the existing filter without changing API/schema/taxonomy, polling, pagination, retry or stale-response protections.

The landing voice example is clearly illustrative and never captures audio, saves a draft or claims a payment. Starting real assistance goes to `/create`; no disconnected landing form/editor or fake apply-success is shipped. Human microphone consent and wallet signing remain explicit in the existing authenticated flows. Original tagline remains in the footer. Primary conversions disclose Solana Devnet/test SOL and no cash value; FAQ explains approval, 30-minute delivery, 10-minute review, single revision, rejection, expiry and withdrawal.

The generated work scene depicts imagined people, not customers. Existing custom WebP illustrations and brand SVG icons are reused under production asset paths with documented provenance; no review/fixture modules or controls are imported into customer routes. Public repository and a verified controlled Devnet approval receipt provide inspectable evidence, never customer endorsements or payment-protection claims.

## Company/support/legal dependencies

Company navigation links to complete on-page product/about/use-case content and the actual public repository. Help links to working FAQ/rules and the supported account-first flows. No generic contact form or contact/legal page is invented. A monitored contact destination and user-approved privacy/terms remain required supplied content for a broader public launch; they do not block this honest Devnet beta presentation. Organization use cases use individual accounts only; no team portal, shared funding, billing or Mainnet readiness is implied.

## Verification and release

Frontend checks cover guest/auth navigation, creation intent, category query/filter continuity, native FAQ/voice-example accessibility, mobile layout, image/font delivery and reduced motion. Backend supplies live Gemini evidence, existing voice/create boundaries and a human rehearsal checklist. Unperformed microphone and human wallet signing must be explicit; automated checks do not replace that coverage.

Once coordinated checks pass, run working-tree and isolated release-source tests, TypeScript and production build; commit/push once; verify source=git, exact SHA, READY and production alias. Then coordinate hosted smoke checks with Full Stack Dev and report directly to Project Manager. Preserve unrelated boards, prototypes and local artifacts. Landing/taxonomy/demo-record classification expansion is outside backend scope.

Status: local implementation underway; Stage 5 not yet released.

## Asset and evidence provenance

`public/brand/illustrations/work-scene.webp` is the approved generated work scene from the editable marketplace boards/prototype review (original local source: public/marketplace-review/work-scene.webp). Its caption and alt text identify imagined people, never customers. Agreement/deliverable/wallet/voice WebPs copy the existing custom approved assets from public/design-review into production brand paths. Source files remain preserved. The 98 KiB work scene has explicit 1536×1024 dimensions and responsive Next Image sizes/eager hero loading; smaller custom illustrations are lazy by default. No new font family, color or radius value is introduced. Existing Switzer/Instrument Serif provider loading remains unchanged.

Evidence links use the actual public repository and controlled, finalized Stage 4 Devnet approval `4GGJaqmEkzwYftFWZmJLuSLATk8aibYN2qPRoWfKFr8GDRvrLd9GnTE2DPd9QibqkcFeC8Hk62domFo8et4cKF5A`. Full Stack Dev independently verified that receipt. It is project evidence, not an endorsement, customer result or monetary guarantee.

## Final local verification and release disposition

- Working tree: **250 tests / 38 files passed**, TypeScript and production build passed.
- Isolated release: **237 tests / 37 files passed**, TypeScript and production build passed; local prototype routes and the 13 pre-existing prototype next-action tests are excluded.
- Backend/integration signoff: **66 targeted tests** passed, one live Gemini 3.6 Flash advisory baseline on the exact hosted Stage 4 SHA assessed the latest confirmed revision/material inventory, and the existing voice agent configuration was inspected read-only. Stage 5 requires no server/schema/auth/escrow change and does not repeat generation merely to relabel baseline evidence.
- Browser: guest landing, educational audience switching, voice/FAQ native disclosures by keyboard, one working company footer, safe requester sign-in continuation to the existing editor, actual voice/manual entry with blocked wallet preconditions, real Development results, category reset/reload and guest restoration checked. Loaded 320/390/768/1440 px pages have one h1, one footer, opacity 1 and no horizontal overflow. Hero/custom images rendered; existing font definitions/loading are preserved; text contrast samples pass and reduced motion disables new transitions. QA account signed out after checks.
- Keep supplied contact/legal content and the human microphone/wallet rehearsal as explicit follow-ups. No claims of live browser audio or human signing are made. Existing public-source, organization and demo/taxonomy capability limits remain unchanged.

The single coordinated release will include frontend/assets, owned verification tests/scripts/docs and no backend behavior change. Exact Git deployment evidence, screenshots and post-release zero-Gemini hosted checks are recorded separately under output/stage-5 and output/stage-5-backend. Frontend Lead reports the final exact SHA and remaining limitations directly to Project Manager after hosted checks pass.
