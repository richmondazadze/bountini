# Bountini frontend visual and motion upgrade / local review

Date: 13 October 2026 (America/Chicago).
Baseline Git SHA: `7cac862013e302a82784bec5b3991eb514e6d880`.
Current direction: **expressive motion**, superseding the earlier restrained pass at the owner’s request.
Status: integrated locally, uncommitted, unpushed and undeployed. The human asked the Frontend Lead alone to finish locally and report to Project Manager; release remains with Project Manager after explicit human review. No Full Stack Dev delegation was used.

Preview: http://localhost:3000/
Interactive component / state / motion reference: http://localhost:3000/components

## Implementation

| Area | Delivered |
| --- | --- |
| Landing / about / evidence / footer | Layered approved work scene, editorial typography, asymmetric category/workflow/use-case composition, restrained palette-derived gradients, revised footer and interactive labeled brief illustration |
| Shared navigation | Sticky responsive shell, persistent existing Requester/Worker control, coherent active/hover/focus treatment, right MenuDrawer with real animated exit, focus/scroll restoration, no loading guest flash; 320px layout verified |
| Discovery / dashboards | Search affordance, compact categories, shared real quest cards, grouped metadata and reward; role-specific dashboard cards, updates and filters retain existing APIs |
| Accounts / profile | AccountContext, stronger form hierarchy, real public-profile initials, settings composition and native validation/focus behavior |
| Creation / voice | Existing typed/voice controllers, clear manual/assistant entry anchors, explicit existing wallet entry beside blocked saving, editable proposal hierarchy, real amplitude rendering optimized |
| Details / readiness | Grouped real quest context, readable agreement, reward/timing/readiness composition and preserved signing/recovery controls |
| Workroom / delivery / review / activity | Compact grouped context, dominant next action, persistent animated pointer section indicator and mounted sections, message/deliverable/review/receipt hierarchy with actual statuses |
| Shared feedback | Press/focus/busy states, truthful skeletons, indeterminate and real upload states, contextual confirmation language, native dialog feedback plus controlled right menu exit and focus restoration |
| Recovery / missing pages | Existing check-before-retry behavior retained; branded not-found page with real supported destinations |

Fonts/font families, source brand/semantic palette, corner treatments, approved Common Table geometry and outlined wordmark are preserved. `globals.css`, package dependencies and public brand assets remain unchanged. No backend API, schema, authentication, escrow program/instruction, agreement hash or manifest serialization changes were made. Workspace mode continues to change navigation, not quest permissions.

The landing illustration remains labeled generated / imagined people, not customers. No invented ratings, logos, customer proof, stats, avatars, organization/team capability or payment protection is added. Discovery defaults, taxonomy and records remain unchanged; no keyword-based demo exclusion is introduced.

## Skills installed and applied

| Installed name | Source path | Pinned source commit |
| --- | --- | --- |
| `redesign-existing-projects` | Leonxlnx/taste-skill `skills/redesign-skill` | `c924fad1a79c7d70a04bcc8c415b593e9928ad8a` |
| `emil-design-eng` | emilkowalski/skills `skills/emil-design-eng` | `2d228630ba1446365f614a108cb8252f1feda202` |
| `find-animation-opportunities` | emilkowalski/skills `skills/find-animation-opportunities` | same Emil commit |
| `animate` | emilkowalski/skills `skills/animate` | same Emil commit |
| `review-animations` | emilkowalski/skills `skills/review-animations` | same Emil commit |
| `animation-performance` | emilkowalski/skills `skills/animation-performance` | same Emil commit |

Sources: [Taste](https://github.com/Leonxlnx/taste-skill/tree/c924fad1a79c7d70a04bcc8c415b593e9928ad8a), [Emil](https://github.com/emilkowalski/skills/tree/2d228630ba1446365f614a108cb8252f1feda202).
The Codex skill-installer helper installed these with its git method after the local Python direct-download certificate check failed. Certificate validation was not disabled. Existing skills were preserved; no opaque repository install script or unrelated skill was run. Installed files were read and applied directly without waiting for catalog refresh. Brand constraints and the human’s complete-local-execution request overrode conflicting skill defaults, including font/palette swaps, fictitious content and checkpoint pauses. Installation evidence is in `output/frontend-motion-upgrade/skills.json`.

Relevant installed Next.js CSS, server/client boundary and not-found guides were read. Motion remains the installed 14.1.0 package; [official accessibility](https://motion.dev/docs/react-accessibility) and [animation](https://motion.dev/docs/react-animation) documentation was checked. No GSAP need was demonstrated and none was added.

## Editable design artifacts

- `design-v2/reviews/frontend-motion-upgrade/Frontend-Polish-Current.fig`: focused current native OpenPencil boards.
- `design-v2/reviews/frontend-motion-upgrade/Bountini-Frontend-Motion-System.fig`: full 16-page review file, preserving the prior 14 pages and adding two current pages.
- Eight new editable boards and fifteen native component masters; seven motion variables added, prior foundation variables preserved.
- `board-manifest.json`, `build-boards.mjs`, `index.html` and `previews/`: IDs, authoring source and readable exports.
- `before/`: prior FIG, system HTML and motion stylesheet snapshots. The unrelated original shared FIG is untouched.
- `docs/design-review/frontend-motion-upgrade/components-and-motion.md`: component mapping, motion ownership, opportunity/review tables and behavior contracts.

The native boards document shared composition and contracts, not replacement fixture workflows. Actual routes and `frontend-polish.css` are authoritative for exact gradients, shadows and interactions. Existing historical prototypes are preserved separately.

## Validation

- Full current workspace regression suite: **269 tests / 41 files pass**.
- TypeScript and production build pass. The build includes existing local historical design-review routes.
- Exact-final isolated production-source projection: **256 tests / 40 files**, TypeScript and production build pass. Its source hashes match all 36 owned frontend/test files. The 13-test difference is the pre-existing untracked prototype test file, intentionally excluded. Production routes build without unrelated prototype source.
- Isolated setup failures were corrected before the final successful run: Turbopack rejects node_modules symlinks outside its root; a complete local hardlinked dependency tree resolved that constraint. A test launch during dependency copying failed on missing modules and was rerun after setup finished. No application code was changed to accommodate these environment failures.
- Meaningful coverage includes role persistence/failure, safe account return destinations, explicit wallet connection, actor/account/wallet changes, stale requests, claim/signature rejection and recovery, message/history deduplication and scroll, immutable manifests, upload retry, revision/settlement guards, and voice draft interruption/edit preservation.
- New tests cover actual right entry/exit and modal lifetime, cancelled/stale completion, keyboard/reduced focus restoration, account-loading menu suppression, controlled role menus without wallet events, input-modality listener cleanup without persistence, keyboard-linked marketing tabs without generation calls, reduced-motion audio sampling suppression, and draft retention across review/remount/account changes with signed saving still blocked.
- Actual browser checks: guest discovery, real long-title open records, a real empty category, filters/reset and focus restoration, account-first continuation, existing controlled Requester dashboard/settings/creation, authorized terminal workroom/messages/delivery/review, back/forward section state, guest private-material guards after sign-out, pending/unknown/dark reference states, and 320/360/390/430/768px plus 844×390 landscape checks without observed page overflow.
- Native dialogs and MenuDrawer: Tab/Shift+Tab containment, Escape returning to the trigger, keyboard transitions immediate, repeated open/close and stale-exit interruption regression verified. Explicit wallet handoff opens only the centered wallet dialog and does not steal focus when menu exit completes.
- Reduced motion is verified in code/CSS and regression tests. No physical OS preference or phone was changed during automation. Native-menu landscape scrolling was checked at 720×390 (390px panel / 431px content); page composition also checked at 844×390. Scroll position 928.5px was retained across menu opening/Escape, with prior body overflow restored.
- Fresh browser load after preview restart showed no error/warning logs. Earlier transient HMR compilation/hydration diagnostics from editing were cleared by the clean reload/restart.
- Contrast checks: primary action **6.63:1**, muted text on subtle surface **5.58:1**, control boundary on subtle **3.37:1**; existing semantic foreground/background pairs all exceeded 5.8:1. This is a scoped token-pair audit, not a claim of automated certification of every pixel.

Browser QA used an existing controlled account and signed it out afterward. No new quest, message, upload, account or payment was created; no provider generation, microphone session or wallet signature was initiated for styling QA. Role/failure/account-transition coverage includes the automated regression suite; Requester → Worker → reload persistence was checked with the controlled account, then restored to Requester. No notification read state was changed.

## Historical measured animation scope / before the expressive pass

The component reference samples requestAnimationFrame intervals for 1.4 seconds around a native panel’s opening/closing, including originating button/pending feedback. Both runs reported Long Task observer support. It does not measure GPU compositor timing, network requests, scrolling or a physical phone, and does not establish universal FPS.

| Browser viewport | Samples | Median | p95 | Maximum | Frames >25ms | Observed long tasks |
| --- | --- | --- | --- | --- | --- | --- |
| 1280 × 720 | 84 | 16.7ms | 17.0ms | 17.6ms | 0 | 0 |
| 390 × 844 | 84 | 16.7ms | 18.1ms | 18.6ms | 0 | 0 |

Raw measurements: `output/frontend-motion-upgrade/performance-desktop.json` and `performance-mobile-viewport.json`. The browser interface exposes still captures, not a video recorder; interactive local motion examples and still evidence are supplied instead of claiming a recorded video.

## Screenshots and comparisons

`output/frontend-motion-upgrade/` contains before/after landing and discovery, desktop/mobile integrated pages, account/settings/creation, participant messages/review/workroom, real empty discovery, filter dialog, and pending/recovery/dark component-reference captures. The final preview uses actual production routes with real existing APIs; reference-only state samples stay on `/components`.

## Remaining limitations / manual checks

- Real iOS/Android touch, GPU/scroll profiling and real OS reduced-motion preferences still need device rehearsal; viewport checks and desktop frame samples are not substitutes.
- Existing human microphone/ElevenLabs and explicit wallet/signature/Devnet rehearsal remains manual. No paid service provisioning or test transaction was performed in this visual assignment.
- Gemini remains optional/advisory and limited to the latest confirmed submission; selecting older UI history does not alter its input.
- Demo exclusion needs explicit server-side record classification. Adding Design needs coordinated validation/taxonomy/filter/record migration work. Neither is silently changed.
- Avatar uploads, organization permissions/shared funding/billing, approved legal pages and a monitored contact channel remain outside the supported backend/product capabilities; none is fabricated here.
- Native board compositions are editable reference layouts; exact responsive behavior and surface effects are implemented in React/CSS.

## Git and ownership handoff

All frontend changes remain uncommitted. HEAD remains the baseline SHA. Original unrelated modifications to `.gitignore`, `design-v2/system/Bountini-Brand-System.fig` and `docs/releases/stage-5-backend-verification.md` are preserved. `next-env.d.ts` is generated dev/build churn and should not be treated as an intentional frontend implementation change.

The exact owned source list and invariant checks are recorded in `output/frontend-motion-upgrade/validation.json`. Do not stage the entire dirty tree: prior untracked prototypes/artifacts are outside this upgrade unless deliberately reviewed. The current source is ready for human local review; Project Manager owns any subsequent authorized coordinated commit/push and exact Git deployment verification.

## Prior mobile and motion continuation / superseded motion ambition

The current visual direction is preserved. The real shared public/Requester/Worker hamburger opens FROM THE RIGHT (`translateX(100%)` to `0`, 260ms) and closes back TO THE RIGHT (190ms). A separate backdrop fades 200/160ms. The native modal stays mounted/open with inert background and body scroll lock until exit completion. Cancellation and a generation token prevent stale close callbacks. Keyboard and reduced-motion transitions are immediate. Scrollable content uses 100dvh and safe-area padding. Wallet/financial confirmation dialogs stay centered.

Purposeful implemented motion includes fine-pointer press/release and hover, active navigation, drawer/modal/filter context, actual pointer workroom indicator movement, immediately visible marketing entrance/brief example/proposal reveal, real voice amplitude/preparing feedback, truthful loading/upload feedback and domain-driven transaction state. No polling-refresh entrance, moving message rows, animated reward/deadline numbers or fabricated upload progress is added.

Real-route profiles (700ms sampling, this desktop browser): landing mobile drawer entry p95 **16.8ms**, exit **16.7ms**, no measured intervals >25ms and zero observed long tasks. Historical left-drawer measurements (before the owner’s direction correction) recorded −343px→0 and 0→−343px while modal; then close/focus restoration. Stable workroom Review pointer navigation p95/max **16.8ms**, 42 intervals and zero long tasks. `drawer-performance.json` and `workroom-performance-stable.json` contain raw data. Earlier workroom samples overlapped responsive resizing (p95 33–34ms); those are retained in `workroom-performance.json` and are not a stable animation benchmark. No physical-phone/GPU/frame-rate guarantee is made.

Final evidence adds public/Requester/Worker drawer, final details/review mobile and separate wallet-dialog screenshots. Local preview stays running. No commit, push or deployment has occurred.

Browser status coverage: current long-title open quests and existing controlled paid/revision-history records were inspected. Creating new pending transactions, voice sessions or uploads was deliberately not part of visual QA; their controllers and recovery paths were covered by regressions and clearly labeled state references. Physical keyboard/pinch/OS behaviors remain device rehearsal.

## Owner direction correction

The menu is anchored on the RIGHT: opens right-to-left (translateX(100%) → 0), exits to the right. Shared public and both account-role menus use the same component. Timings, focus containment, reduced-motion and financial-dialog separation are unchanged. Right-drawer browser trace at 390px records entry x390→47 and exit x47→390, modal retained until completion, then focus returned. Entry p95 17.3ms and exit16.8ms in this local browser. Evidence: `drawer-right-performance.json`, `drawer-right-mobile.png`. Workspace262/40 and isolated249/39 tests, typecheck/build were rerun after this correction. Previous left-drawer screenshots/traces remain historical evidence.

## Superseding expressive pass

The owner asked for unrestrained animation. This pass deliberately raises visible motion ambition while preserving the visual design, fonts, palette, radii, logo artwork, API/domain behavior and accessibility. Previous local source/boards and representative screenshots are preserved in `output/frontend-motion-upgrade/before-expressive-pass.zip`. No GSAP or new dependency was needed; WAAPI owns the orchestrated and ambient layers, Motion owns the existing brief-example panels, CSS owns pointer press/hover and native dialog entry. No two systems drive one node/property.

Implemented: 720ms hero typography/image sequence with 40–240ms offsets; 320–700ms varied section/art arrivals; gated 7.2–9s floating illustration/caption; pointer-depth card reactions (±1.5°) with one cached box and one rAF, arrow/icon reactions and button sweep/press; stronger category selection and menu icon; right drawer’s immediately usable content staggers (340ms, 24ms); layered voice-to-brief story and illustrative waveform; editable proposal arrives with 440ms sheet movement and checklist sequence; actual upload/status feedback; 240ms workroom heading orientation beside the existing 180ms indicator; a finite 650ms confirmation burst only on authoritative paid/confirmed state, once per mounted result. Financial amounts, timers and message text are never tweened.

Ambient targets pause offscreen or in hidden documents. Reduced motion cancels running choreography/ambient loops and removes CSS movement. Keyboard interruption cancels finite presentation jobs; editor sections remain mounted. Voice amplitude sampling skips offscreen visuals as well as hidden/reduced states. Upload cues remain indeterminate until real byte events or actual validated attachment completion. No automatic wallet/microphone/API generation or extra customer control was added. The proposal sample on `/components` is explicitly illustrative and never imported by customer routes.

`docs/design-review/frontend-motion-upgrade/expressive-motion.md` is the current animation map, ownership and review contract. Native boards add **ExpressiveMotion / superseding choreography and alive surfaces**; the focused file has two current pages / eight boards / fifteen component masters. Old motion screenshots and measurements are historical. New evidence uses `expressive-*` names. Physical-device keyboard/OS preference/GPU/microphone/wallet rehearsal remains manual. All source stays local, uncommitted and undeployed.

### Final expressive evidence and measurements

Complete final workspace269 tests/41 files and isolated256 tests/40 files, TypeScript and production builds passed on matching hashes for36 owned files. Brand/font/radius assets and backend paths remain unchanged. Actor/wallet/signature/message/draft/upload/recovery regression coverage remains green.

700ms real-route browser traces: landing p9516.8ms/max17.2ms; actual scroll p9516.7ms/max33.33ms (one interval above25ms); real quest-card pointer reaction p9517ms/max18.5ms; workroom Review navigation p95/max16.8ms. Zero supported-observer long tasks in those samples. Scroll also showed the prior visible ambient layer paused (running0/paused1). These observations are this machine/browser and do not assert phone GPU/compositor/FPS certification. Raw data are the expressive-*-performance.json files.

New responsive checks cover actual loaded discovery/create and landing at320/360/390/430/768px and844×390 landscape without observed page overflow. Controlled Requester drawer, real idle creation with zero automatic wallet dialogs, actual paid workroom and section navigation, illustrative proposal reference, unknown-status decoration safety and voice-to-brief interaction were inspected. The controlled account was signed out afterward. Prior broader route/mobile/role/privacy checks remain preserved; new status/controller regressions also passed.

Expressive screenshots: landing desktop/mobile, requester menu/drawer, story, actual review mobile. `expressive-hero-frame-sequence.png` is a contact sheet of six actual sampled browser stills, **not a video recording**. Local live preview is the motion deliverable. Native current boards remain editable, with the expressive map included. No commit/push/deployment.
