> Superseded motion ambition: the human requested the expressive pass. See [current expressive contract](expressive-motion.md); the component/API preservation mapping below remains applicable.

# Common Table / integrated component and motion contracts

The implementation uses the existing Switzer / Instrument Serif families, existing light/dark palette and existing corner treatments. Source tokens in `src/app/globals.css` and all approved logo assets are unchanged. New surface shadows and selected gradients derive from those colors; `src/app/frontend-polish.css` owns the visual upgrade.

## Component mapping

| Board / composition | Production source | What remains authoritative |
| --- | --- | --- |
| WorkspaceHeader / PublicNav / WorkspaceNav | `experience/workspace-header.tsx`, `header.tsx`, `account-nav.tsx` | Existing account state, persisted mode, safe destinations, explicit wallet UI |
| DiscoverySearch / CategoryNavigation / MobileFilterDisclosure | `discovery/discovery.tsx` | Existing `useQuestFeed` filters, polling, paging, deduplication and response generations |
| QuestCard / RequesterIdentity / MetadataGrid | `discovery/quest-card.tsx`, also used by `market.tsx` | Real identity, reward, category, status and deadline; no reputation or avatar fabrication |
| AccountContext / AccountForm / Profile | `account-context.tsx`, `account-form.tsx`, `profile.tsx`, `people/[id]/page.tsx` | Existing account controllers and public-profile field permissions |
| BriefComposer / editable agreement | `create.tsx` / CreateForm | Account-scoped drafts, validation, explicit signed wallet proof, existing save/fund separation |
| VoiceStage / assistant proposal | `voice-stage.tsx`, `assistance.tsx` | Existing SDK callbacks, completion and stale-generation guards, edit retention and manual fallback |
| ClaimReadiness / AgreementPanel / RewardSummary | `quest-details/quest-details.tsx` | Existing claim/funding/cancel/withdraw/expiry pipeline and actor/status/deadline guards |
| ActiveWorkroom / MessageThread / DeliveryComposer | `active-workroom/active-workroom.tsx`, `workroom.tsx`, `deliverables.tsx` | Sections stay mounted; message scroll, drafts, manifests, upload bytes and recovery remain intact |
| ReviewPanel / Receipt / Activity | `submission-review/review-panel.tsx` | Authoritative confirmed revisions and settlement; Gemini is advisory and latest-confirmed only |
| Button / Banner / NativeDialog / TransactionStatusView | `ui.tsx` | Native semantics, disabled/busy states, focus containment and immediate Escape/close |
| BriefExample | `public-product/brief-example.tsx` | Clearly labeled marketing illustration; no media, drafting, account or payment request |
| MotionShowcase | `/components` only | Isolated reference samples and measured timing; never imported by customer account/quest controllers |

Composition names identify existing DOM sections as well as exported React components; they do not imply new backend capabilities. The native boards document layout and behavior contracts. The actual local routes and CSS are authoritative for exact surface treatment and interactions.

## Shared timing and ownership

CSS and Motion share a 120ms press, 160ms feedback and 220ms panel scale. The 140ms exit and 500ms marketing spring remain reserved vocabulary. The actual MenuDrawer uses 260ms entry and 190ms exit with a separate 200/160ms backdrop fade; the workroom indicator uses 180ms. Wallet and financial dialogs retain their centered treatment and immediate close. Marketing first-paint orientation uses a 260ms transition with 40ms illustration offset, starting from visible opacity .84. No GSAP is installed or required.

- Ease-out: `cubic-bezier(0.23, 1, 0.32, 1)`.
- In-place movement: `cubic-bezier(0.77, 0, 0.175, 1)`.
- Panel/drawer: `cubic-bezier(0.32, 0.72, 0, 1)`.
- MotionConfig uses `reducedMotion="user"`; the CSS reduced-motion branch removes movement and loading animation.
- `data-input` tracks presentation modality only. Keyboard button, nav, switch and modal actions do not wait for movement.
- Hover movement is restricted to fine pointers with actual hover support. Touch press feedback remains subtle.
- Native modal entry is progressive-enhancement CSS `@starting-style`. Browsers without it show the same content immediately.
- No opacity-zero route entrances, scroll-dependent hidden content, cursor tracking or scroll hijacking.
- Data, deadlines and messages stay stable. The persistent workroom indicator retargets its transform for pointer navigation, while sections/editors stay mounted and keyboard movement is immediate. No reward/count tween and no animation-driven financial state.
- Voice samples update only the halo, mic and wave nodes directly from actual input/output amplitude. No inherited CSS-variable cascade or per-frame React state. Sampling stops for muted/inactive states and is suppressed for reduced motion or a hidden document.
- Loading is indeterminate. Upload progress remains the uploader’s actual byte/event state, with validation distinguished from transfer completion.

## Animation opportunity review

| Location | Purpose | Frequency | Implemented treatment |
| --- | --- | --- | --- |
| Button and card affordances | Feedback | Frequent | 120–160ms pointer feedback; keyboard instant; no touch hover movement |
| Native dialogs / filters | Spatial context | Occasional | 220ms scale .98 → 1 / opacity .84 → 1; immediate close and native focus restoration |
| MenuDrawer | Spatial consistency | Occasional | Native modal; right translateX(100%) → 0 in 260ms, reverses in 190ms; modal/scroll lock retained through exit; stale completions guarded |
| Workroom section indicator | Orientation | Frequent | 180ms transform translate/scale of 1px line; no content remount; keyboard/reduced motion immediate |
| Hero / generated proposal | Explanation / state indication | First render / explicit proposal | Visible .84 opacity with 4–6px starting-style transition; no hidden primary content |
| Brief illustration stages | Explanation | Marketing exploration | Motion transform string / opacity, 220ms; keyboard arrows/Home/End are immediate |
| Loading and asynchronous state notices | State indication | Request-driven | Existing status text plus truthful indeterminate feedback; no invented progress |
| Voice visual | State indication | Explicit active session | Real SDK amplitudes, local animated nodes, reduced-motion suppression |
| Prepared/recovery/settlement surfaces | Hierarchy and clarity | Occasional | Stable, legible panels; success tone only from actual confirmed domain state |

Rejected: moving message rows (reading/scroll preservation), animated deadline/reward numbers (functional financial data), new spring/cursor theatrics (no demonstrated need), transforming wallet or financial confirmation dialogs into drawers.

## Review findings

| Before | After | Why |
| --- | --- | --- |
| JS card `whileHover` / y shorthand | CSS fine-pointer hover and reduced-motion branch | Prevent touch hover movement and keep work off the JS animation path |
| Workroom shared-layout tab underline | Persistent transform indicator; immediate selected state | Pointer orientation without unmounting drafts; keyboard/history remains fast |
| Enter began at opacity zero | Content is initially available; small CSS enhancement only | No delayed interaction or blank route content |
| Voice level written to parent CSS variable | Direct transform/opacity updates on animated nodes | Avoid inherited style recalculation through the voice subtree |
| Switch animated `left` | Transform of the knob; keyboard immediate | Avoid per-frame layout |
| Repeated flat rows / undifferentiated panels | Shared quest cards, metadata surfaces, contextual action hierarchy | Readable grouping and consistent application density |
| Minimal account form | AccountContext plus existing form/controllers | Explain onboarding without altering authentication or permissions |

Verdict: ready for local visual review. No known feel-breaking regressions remain in the verified interactions. Physical-device GPU/scroll profiling and the existing human microphone/wallet rehearsal remain manual checks.

## MenuDrawer implementation contract

`experience/menu-drawer.tsx` owns the native modal lifecycle and Web Animations. `WorkspaceHeader` owns open intent; account role persistence and permissions remain in their existing provider/controllers. Opening snapshots prior focus and body overflow. Rapid reversal reads the current computed transform before cancellation; generation guards prevent stale completion from closing a reopened menu. Escape prevents native immediate cancellation and requests controlled closure. Keyboard/reduced motion closes immediately. Native modal semantics make the background inert; Tab/Shift+Tab wrap within actual visible controls. Focus restoration avoids stealing focus from another open wallet dialog. Account-loading renders a disabled checking state and no guest navigation flash.

Opt-in development profiler: append `?motion-review=1` on an actual local route. It observes real menu/section pointer interactions for 700ms, and records frame intervals, drawer positions/modal lifetime and final focus/scroll-lock state in the root `data-motion-measurement` attribute. Production does not install it. This is diagnostic instrumentation, not a customer control or FPS/GPU claim.
