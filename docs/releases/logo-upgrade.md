# Common Table logo upgrade

Owner approved direction C on 13 October 2026. The three-part Common Table symbol replaces the previous b lettermark. Existing outlined wordmark, fonts, brand colors and UI radii are preserved.

## Rollout
All public symbol, horizontal and stacked SVG/PNG assets are replaced; wordmark-only artwork remains the same. Header and footer reuse their existing asset URLs, with correct intrinsic lockup proportions. Browser favicon, ICO, Apple touch, application icons and maskable icon are updated. Root metadata links the manifest and versioned favicon URLs. The manifest distinguishes standard and maskable artwork. SVG favicon adapts to a dark browser theme.

## Design source
Editable masters, usage guide, presentation and standalone editable before/after identity board live in `design-v2/identity/common-table`. Previous published assets are snapshotted in `design-v2/identity/previous-lettermark-2026-10-13.zip`. The unrelated modified FIG board is preserved; the new SVG identity board can be imported into a design editor.

## Validation
SVG audit and visual size/reversed tests were completed for the selected design; raster dimensions and ICO frames validated. Application regression tests, typecheck, build and browser rendering are checked before release. Exact Git deployment evidence and live screenshots are saved in `output/logo-upgrade`. No authentication, wallet, domain or escrow behavior changes. Browser-installed icons may require a refresh or reinstall to replace OS-cached artwork.
