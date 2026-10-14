# Expressive Bountini motion / current local contract

Supersedes the restrained motion choices at the human’s direction. The current resting visual design and brand tokens remain unchanged. Primary content, links and focus are usable immediately.

| Component / route | Actual motion | Ownership / purpose |
| --- | --- | --- |
| ProductLanding | 720ms stagger: eyebrow lateral arrival, first headline 42px rise/rotation, serif 48px perspective rise, image sheet 32px lateral/3° entry, body/actions rise, note content entry | ExpressiveMotion WAAPI; product introduction. Text stays opaque and readable. No scroll-dependent hiding. |
| Marketing sections / workflow | Varied 580ms lateral/vertical arrival, 700ms staggered artwork parent entrance; illustrations float 7.2s and note 9s | Separate parent entry and child ambient transform owners. IO pauses offscreen, visibility pauses hidden tabs. |
| QuestCard / categories | Fine-pointer perspective depth ±1.5°, 6px lift, arrow/icon direction reaction; one cached rect and one rAF; 240ms retarget | CSS owns smoothing; presentation-only direct transform. No per-frame React updates, touch hover or message movement. |
| Shared buttons / navigation | Sweep, lift, compress/release; active category line; rotated hamburger; existing active nav indication | CSS exact properties. Keyboard/reduced immediate; input semantics unchanged. |
| MenuDrawer | RIGHT→LEFT 260ms; reverses RIGHT 190ms; separate backdrop200/160ms; links/account content340ms with24ms stagger | Native modal + WAAPI. Links immediately clickable. Modal/scroll lock through exit; cancellation/stale completion guarded. |
| NativeDialog / filters / wallet | Perspective sheet/scale .96 +20px entry280ms; close remains immediate | CSS progressive enhancement. Centered financial dialogs remain distinct from drawer. |
| BriefExample | Illustrative waveform with different phases; 440ms perspective/lateral panel handoff; checklist360ms /40ms offsets | Motion owns panels; CSS owns checklist; WAAPI owns waveform. Example never records, saves or requests generation. |
| Details / account / workroom context | 320ms14px arrival once for context/decision; stable data and primary actions remain present | WAAPI orientation. No API/permission/escrow changes. |
| Workroom navigation | Existing180ms persistent indicator plus240ms heading orientation | Mounted sections/editors, hash/history and message scroll remain unchanged. No animation of message text. |
| Generated proposal | 440ms perspective sheet; requirements320ms /30ms offsets | WAAPI observes the real controller’s proposal mount. Existing reward/draft review and wallet guards unchanged. |
| Upload | Indeterminate transfer cue;260ms small completion response only for actual uploaded attachment | Actual uploader sets data-upload-state; real percentages unchanged. Never invent progress or success. |
| Confirmed outcome | Ten finite rays650ms; result celebrates once per mounted paid/confirmed status | Derived only from existing authoritative domain status. No reward/count/deadline animation; pending/unknown never celebrates. |

## Resource and accessibility behavior

Transform/opacity animation only; no animated blur, shadow, dimensions or layout. No permanent will-change promotion. Finite WAAPI jobs clean up/reject safely; detached/offscreen ambient nodes pause or release. There are no per-frame React state updates or inherited CSS-variable cascades. `prefers-reduced-motion` changes cancel running effects. Keyboard use cancels finite presentation jobs; native focus remains authoritative.

The opt-in development profiler (`?motion-review=1`) measures actual landing/scroll/card/drawer/workroom interactions for700ms, with rAF intervals and supported Long Task observation. Layer diagnostics show finite/ambient/paused jobs. Production does not install the profiler. Metrics are this browser on this machine, not compositor/GPU or physical-phone certification.

## Craft review

| Prior limitation | Current resolution | Validation |
| --- | --- | --- |
| Mostly subtle starting-style feedback | Separate crafted hero/type/image and marketing scene timelines | Actual frame captures and live preview |
| Same transforms owned by entry and floating art | Parent entry / child ambient ownership, caption text entry separate from note motion | Source audit and native layer diagnostics |
| Perpetual visual sampling offscreen | IO/hidden/reduced gating for ambient and real voice visual sampling | Regression for offscreen pause/cleanup and reduced interruption; browser layer counts |
| Potential false visual success | Burst only from confirmed/paid status, once per mounted result | Pending/unknown vs confirmed regression; no domain mutations |
| Risk to messages/drafts | No animation targets in message/editor content, no unmount/remount | Draft node identity regression and existing workroom suite |

Verdict: ready for local review after final regression/type/build and representative browser checks. Physical phone keyboard, GPU, OS reduced-motion and human microphone/wallet rehearsal remain manual.
