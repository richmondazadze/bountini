# Bountini component contracts — v2.0

This specification is the contract between design and implementation. OpenPencil shows composition and visual hierarchy; these contracts define behaviours, semantics and difficult states. Component examples are design specimens, not functional application controls.

## Foundations and API conventions

Use semantic token aliases; retain primitive values only in token files. Public components accept `size`, `variant`, `disabled`, `pending`, accessible labels and standard native props. Forward refs to the actual interactive element. Prefer semantic HTML. Do not assign button behaviour to a generic div. Status types must come from a shared domain enum rather than handwritten colour strings.

Default spacing follows 8px, with 4px for icon/label relationships. Product body is 16/24. Control labels are 16/24 medium. Touch height is 48px. Compact controls are 40px visually with an adequate target area. Panel radius is 0; control radius is 2. No pill buttons.

## Button

Variants: primary, secondary, quiet, danger. Sizes: compact 40, default 48, large 56. Padding: 16/20/24 horizontal. Leading/trailing icon: 20px, gap 8px. Focus: 2px contrasting ring, 3px offset. Default, hover, pressed, focused, disabled, pending and success/error outcomes must be specified.

Only one primary action in a decision region. Loading replaces the label with a meaningful operation label, preserves width and blocks duplicate submissions. The button alone cannot communicate the result of a financial operation: keep an adjacent persistent status region. Disabled actions have an explanation nearby. Use a link styled as a button for navigation.

## TextField / Textarea / AmountField

Anatomy: persistent label, optional required indicator, control, helper text/error. Label-to-control gap 8px; control-to-helper 8px. Control height 52px, 16px padding, 1px #7A8494 border. Textarea minimum 128px; grow to content when practical. No placeholder-only instructions.

States: empty, filled, hover, focus, invalid, disabled, readonly, pending validation. Invalid fields use icon/text plus colour and `aria-invalid`; describe errors via `aria-describedby`. On submit, focus linked error summary or first error. Do not validate aggressively during initial typing. Preserve data after network failure.

AmountField: decimal input mode; unit outside editable text; exact parser and integer base-unit conversion. Never rely on floating-point arithmetic for settlement. Product formatting preserves chain precision. Reward and estimated fee are separate. Network always appears in the financial region. Fallback input must support decimal separators consistently and show correction explicitly.

## Select / Combobox / Checkbox / Radio / Switch

Select uses native semantics for short lists. Searchable combobox has keyboard navigation, labelled listbox, selected option announcement, Escape and no-results state. Option row 44px minimum; overlay max 320px high and scrollable.

Checkbox means an independent choice or policy acknowledgement. Radio means one mutually exclusive choice. Switch applies an immediate setting; never use for agreeing to financial terms. Provide label and description. Selected/unselected/indeterminate/focus/disabled states are separate. Visual square may be 20px, but hit area is 44px.

## Navigation / Tabs / Breadcrumbs

Header displays Discover, Create, My Bountini, network and wallet. Active route uses colour plus underline. Breadcrumb links are links; current page is noninteractive. Skip link reaches main content. Mobile menu is a drawer with labelled close button and focus restoration.

Tabs switch in-place content, with roving tab index and arrow keys. Routing uses links, not tab semantics. Default tab height 48px. Scrollable mobile tab list must visibly indicate more content without clipping the focus ring.

## QuestRow / QuestCard

Content hierarchy: task title, category/availability, reward and network, delivery duration, requirements link. Do not imply worker selection is guaranteed. Desktop reward slot is 220px; title region flexes; actions align. Mobile record retains all financial facts and explicit labels.

Title is a real destination link. Avoid nested interactive regions. Pending refresh preserves row dimensions and does not reorder under pointer. Empty list offers discovery/filter recovery. Loading is distinct from empty. Availability comes from server state.

## Badge / Banner / Toast

Badge combines meaningful text and appropriate semantic treatment. Lifecycle states: draft/open/in-progress/in-review/revision-requested/paid/rejected/expired/refunded. Transaction status is a different type. Do not equate “paying” with “paid”.

Banner persists for critical transaction, network or deadline information. Toast is reserved for nonblocking acknowledgement. Toast lasts approximately 5 seconds, supports dismiss, pauses on hover/focus, and is announced politely. Never put the sole error explanation or expiry policy in a toast.

## Dialog / Drawer / Popover / Tooltip

Dialog max width 560px, desktop padding 32px, mobile 24px. Confirmations show title, consequence, amount/network, cancel and specific action. Trap focus, mark background inert, return focus to trigger. Escape cancels before submission. A pending operation must remain accessible when dialog is dismissed; do not pretend dismiss cancels a submitted chain transaction.

Drawer max 720px desktop, full-width mobile, same focus contract. Popover 240px preferred; anchored with 8px gap, flips to fit viewport. Tooltips support hover and focus, dismiss with Escape, contain optional help only. Essential content belongs inline.

## Countdown / Progress / Skeleton

Countdown uses server-provided deadline and synced time. Refresh on refocus. Include absolute deadline/time zone in details. Neutral by default, warning at ≤5 minutes, stronger labelled urgency at ≤1 minute. Announce thresholds once rather than announcing every second. Never allow motion or flashing to carry deadline meaning.

Stepper progress reflects completed stages. Transaction confirmation is indeterminate until known. Skeleton preserves content dimensions and marks region busy; static under reduced motion. A failed load becomes an error/retry view, never an indefinitely running skeleton.

## WalletSummary / TransactionStatus

Wallet states: disconnected, connecting, connected, wrong network, rejected, unavailable. Show abbreviated address only with full-address view/copy. Address label is readable without a monospace third family. Devnet is visible in header and every money region.

Transaction states: waiting-wallet, submitting, confirming, confirmed, rejected, failed, unknown. Store operation ID and transaction signature. Unknown means status check required; do not blindly retry. Confirmed chain state is required before funded/paid/refunded labels. Disconnect does not erase existing submission evidence.

## VoiceComposer / AdvisoryReview

Voice states: idle, permission-request, connecting, listening, processing, draft-ready, muted, interrupted, denied, offline, failed. Microphone starts only after explicit activation. Keep Stop and Mute accessible. Transcription remains editable. “Type instead” is always available. Draft requirements never auto-fund.

Advisory review identifies suggested matches/gaps against each requirement. Show uncertainty and evidence references. Requester retains approve/revise/reject. No model score triggers payment. Review controls stay usable if the AI service fails.

## Submission / ReviewActions

Require accessible link or attachment, delivery note, timestamps and receipt. Validate URL scheme/host. Show external-link destination clearly. One revision with specific feedback and 10-minute window; final review has 10 minutes. Revision controls disappear once used; the history records the original and revision submissions.

Approval confirms reward, unit, network and irreversible consequence. Rejection confirms reason and outcome. Deadline races refetch authoritative state before proceeding. An expired local timer cannot be treated as completed refund.

## Table / Pagination / Chart / EmptyState

Tables keep fixed alignment lanes; amounts right-align with tabular numbers; row labels make sense out of context. Sort uses button with announced direction. Pagination preserves filters and query. On narrow screens records retain role/status/deadline/reward rather than hiding columns.

Charts require units, date, source and accessible table equivalent. Direct labels preferred. Bars start at zero unless another scale is explicitly explained. Cobalt is primary series; secondary series use labels/patterns, not colour alone. No unsupported example metrics in published material.

Empty states explain what happened and offer a useful next action. Distinguish no tasks, no filter matches, no personal history, not connected, failed load and access denied. Each has a different recovery.

## Implementation acceptance

Keyboard and screen-reader flows; 200% zoom; 320px reflow; reduced motion; high-contrast mode; font fallback; long content; failed/unknown transaction; concurrent claim; server clock drift; refresh during pending operation; permission-denied voice; advisory service failure; deadline boundary races. These are implementation checks to run when building the application, not tests claimed by this design deliverable.
