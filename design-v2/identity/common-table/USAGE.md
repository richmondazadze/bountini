# Bountini · Common Table

Selected by the owner on 13 October 2026. Custom geometric symbol: two inward-facing pieces meet over a common working surface. The supporting stem has a 45° cut. This identifies participation and useful work; it makes no payment-protection claim.

## Artwork
- `masters/`: editable SVG masters; symbol, horizontal, stacked, wordmark and small-size cut. All letterforms are existing outlined paths; no live text or new font dependency.
- `logos/`: matching SVG and PNG files in ink, black, white and cobalt. Symbol PNGs are 512px; lockup PNGs are 1200px wide.
- `web/`: SVG favicon, ICO containing 16/32/48px PNG frames, matching PNGs, Apple touch 180px, standard 192/512px and maskable 512px icons, manifest and integration snippet.
- `presentation/`: editable HTML presentation, JSON source and PNG slides. Mockups illustrate identity applications, not new product capabilities.

## Color and backgrounds
Ink #161616; cobalt #2448e8; white #FFFFFF; reproduction black #000000. These match the existing brand and previous black reproduction artwork. Prefer ink on white for the website header, white on ink for reversed applications, cobalt sparingly. Do not introduce new palette or font tokens. App artwork has square corners; operating systems may apply their own mask.

## Geometry and clear space
Symbol grid: 256 × 256. Artwork bounds: x32–224 and y48–208. Major band thickness 32 units; support width 64 units; exact 45° cuts. Leave at least one 32-unit band of clear space on each side of the visible artwork. Keep the lockup proportions and outlined wordmark together. Do not type a replacement wordmark.

## Small sizes
Use the regular symbol at 32px and above. Use `symbol-small` or the supplied favicon at 16–24px. The small cut widens the separation from 16 to 24 units and retains the same silhouette. At 16px, prefer the supplied raster or SVG with integer CSS dimensions; never shrink a full lockup into a favicon. Suggested minimum horizontal lockup width: 140px. Suggested stacked width: 120px. Test legibility in its actual context.

## Reproduction
Black first, flat fill only. White-on-dark artwork was inspected at 16/32/64px; no shadow, outline or gradient is necessary. Do not stretch, round the corners, rotate, redraw, split the parts across colors or overlay photographs through the cutout. The upper inward notch is part of the identity, not an animation cue.

## Implementation handoff
This kit is the approved source for the Common Table production rollout. The prior lettermark is preserved in `../previous-lettermark-2026-10-13.zip`. For a coordinated rollout, snapshot the old `/public/brand/logos`, replace symbol/horizontal/stacked variants including raster counterparts, update favicon/icon assets referenced by app metadata, and update editable brand boards and usage docs. Retain current wordmark-only assets, brand tokens and explicit wallet/account behavior. Verify header, footer, dark mode, account screens, browser tabs and social contexts, then follow AGENTS.md for one Git-triggered release.

## Validation and limits
Rendered and visually inspected symbol/lockup composition, black and white 16/32/64px size ladders, app/icon contexts and presentation. SVG audit has no symbol errors; inherited wordmark transform precision is retained to preserve existing outlined letters. No professional trademark clearance is asserted.
