# Bountini design system review

Reviewed the local OpenPencil master and its generation sources, component contracts, tokens and rendered boards. This is a read-only review of the delivered design; no corrective edits were made. The visible identity is cohesive: custom stepped mark, outlined wordmark, Switzer/Instrument Serif hierarchy, cobalt/neutral palette and restrained geometry. Product examples appropriately distinguish advisory AI, human review and confirmed payment.

Verdict: approve the visual direction; request changes before approving the component library as the implementation foundation.

## P1 — Components do not adapt to content

All 60 component masters have layoutMode NONE, and there are no component sets. Buttons use fixed 200px widths and fields fixed 360px widths. Product boards contain positioned text lines rather than responsive text blocks or linked component instances. The three linked instances are isolated demonstration buttons. Longer labels, translations and narrower containers require manual repositioning. Add auto layout, content sizing, constrained text wrapping and component families; rebuild representative product screens with instances. See source/enrich-openpencil.mjs:13-22 and source/migrate-openpencil.mjs:49.

## P1 — Tokens do not provide the promised native control

The native document stores spacing, breakpoints and dimensions as STRING values such as 24px; these cannot serve directly as numeric layout bindings. Semantic colours are bound by matching RGB values and selecting the first matching variable, so white surfaces map to the primitive paper token and cobalt actions to the primitive cobalt token. Equal-colour roles lose their semantic distinction. The sole foundation collection has one mode; the dark-theme page is an illustration rather than a switched component theme. Store numeric measurements as FLOAT, preserve semantic aliases and bind by role, with explicit light/dark modes. See source/migrate-openpencil.mjs:64 and source/enrich-openpencil.mjs:28.

## P2 — Selection controls communicate the wrong interaction

Radio / Selected is a circular checkmark and Switch / On is a small checked square. Neither has the expected dot or track/thumb construction, and radio-unselected and switch-off masters are absent. This makes the switch look like a checkbox and prevents a complete state comparison. Use distinct indicator construction and provide selected/unselected, on/off, focus and disabled states. Keep the 48px target wrapper. See source/enrich-openpencil.mjs:24.

## P2 — Library and specification disagree

The contract specifies medium 16/24 control labels and size-dependent button padding of 16/20/24. The native text helper supplies regular weight 400 with a 20px line height, and all button sizes use 20px horizontal padding. TextField's Empty state differs in copy from Filled, but both show text rather than an actually empty specimen. Secondary, quiet and danger buttons lack full state coverage. Align native masters with specs/component-contracts.md:9-21, and explicitly distinguish placeholder, value and empty states. See source/enrich-openpencil.mjs:14,20-22.

## P2 — Data slide labels intersect chart bars

The Data template starts all bars at x80, with widths 600, 900 and 1200. Labels start at x1000 and share the bar y-position. The third bar ends at x1280, covering the third label's beginning; the second leaves only 20px before its label. Put labels in a separate lane with a stable gap, place categories before bars, and reserve a value column. See source/enrich-openpencil.mjs:36.

## Approval checks

Verify long translated labels and 320px/768px/wide containers; switch themes through native variables; compare all selection and button states; update a master and verify representative screen instances follow it; inspect every slide after replacing placeholder content. Re-export the PDF and ZIP after corrections. No implementation accessibility certification is implied by the current boards.
