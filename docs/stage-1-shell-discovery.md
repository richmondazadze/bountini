# Stage 1: shared shell and live discovery

Approved scope: responsive header, persistent Requester/Worker preference, role-specific navigation and live discovery. Workroom, claim, delivery and settlement redesigns remain for later stages.

## Implementation

- Header composes the extracted controlled WorkspaceHeader. Signed-in mode comes from `me.profile.activeRole`; the provider persists PATCH `/api/me`, announces failures and keeps the previous mode until success. It serializes switches and ignores results after account changes. Older polling responses cannot overwrite a saved mode. Dashboard consumes the same preference; its duplicate switch was removed.
- Guests can browse discovery and retain a safe destination and Worker intent through sign-in. Menu account links close the dialog on navigation. The native menu supports explicit keyboard wrapping, Escape and focus restoration. Opening the wallet chooser remains an explicit action; linking, connector behavior, signature/session serialization and permission checks are preserved.
- Discovery uses real `/api/bounties` results through a shared query hook. Search, category, state, role, pagination, polling, deduplication and generation guards remain. Failed pagination retains loaded cards; retry and empty-filter reset are available. Counts describe loaded results, not a fabricated marketplace total. No fixture imports or simulation controls appear in customer routes.
- Reused existing typography, tokens, icons and Button/Dialog components. New surfaces use square panels and 2px control corners. Later-stage action/workroom components and local review assets are excluded from this release.

## Verification before release

- Release test selection: 162 tests in 29 files passed (excludes the pre-existing, uncommitted later-stage next-action tests). Full working-directory suite also passed.
- Type checking and optimized production build passed.
- Browser: guest browsing with ten current live records; combined search/category/state filtering returned the correct live result; no-match search, reset and loading states verified.
- Existing controlled QA account: signed in through Better Auth, changed both modes via the real API, reloaded to verify persistence, navigated to the existing dashboard, and verified posted/claimed list selection. Restored Worker mode and signed out after testing.
- Local fault checks used temporary process configuration only: a mismatched allowed origin produced a real 403 role-save failure while retaining the saved selection; an unavailable database produced a real 503 discovery error with all filters retained. These settings were restored and are not committed or applied to production.
- Mobile: 320px and 390px checks showed no document overflow; header measured 68–69px. Menu Tab/Shift+Tab wrapping, Escape return, and wallet-dialog return to the menu trigger passed. Wallet chooser was inspected without connecting or signing.
- Screenshots under `output/stage-1` record local mobile discovery, role failure, discovery failure and empty state. Runtime screenshots/deployment evidence stay outside the Git release.

## Release procedure

One finished commit and push to main triggers the existing Git-connected Vercel production deployment. Verify the exact commit, Ready state, production alias, public discovery and protected endpoints after deployment. No manual production deployment accompanies the push. No backend, escrow program, authentication policy or live quest record is changed by this stage.
