# Bountini — Brand & Product System 2.0

Open **Bountini-Brand-System.fig** in OpenPencil. This is the editable canvas master: 34 system boards across eight pages, 60 reusable component masters, three linked instances, nine full-size slide templates and 80 native variables. Vector logos and icons remain editable; board text is split into positioned lines for faithful migration. Boards use fixed compositions; the component behaviour contracts specify implementation and responsive rules.

## Deliverables

- `Bountini-Brand-System.fig` — local, editable OpenPencil master.
- `Bountini-Brand-System-v2.pdf` — 34 searchable, font-embedded vector pages with bookmarks.
- `system.html` — browsable design reference.
- `tokens.json`, `tokens.css`, `motion.css` — design tokens, Tailwind theme values and reduced-motion rules.
- `assets/logos` — outlined SVG masters and transparent PNG variants.
- `assets/icons` — 20 original SVG interface symbols.
- `assets/web` — favicon SVG/ICO/PNG, Apple touch icon, 192/512 icons, manifest and head snippet. Copy this folder to your application's `/public/brand` directory.
- `assets/graphics`, `assets/templates` — graphic devices, social, open-graph and slide compositions.
- `specs/brand-guidelines.md`, `specs/component-contracts.md` — identity use, product behaviour, accessibility and governance.
- `source/boards` — editable HTML sources for each system board.

## Fonts

Switzer is the interface family; Instrument Serif is the editorial family. Switzer is installed on the authoring Mac. Obtain it from https://www.fontshare.com/fonts/switzer for another workstation; its binaries are not redistributed in this kit. Instrument Serif is included under the accompanying SIL Open Font License. Logo and template SVG lettering is outlined and requires no installed font.

## Tooling

Installed: OpenPencil desktop 0.15.1 and `@open-pencil/cli` 0.15.1. This workflow uses the local CLI, with no hosted design MCP quota. Normal Codex/model limits still apply. Use `openpencil info Bountini-Brand-System.fig --json` to inspect it. Always save a copy before regenerating from source; the migration script replaces the master, then the enrichment script adds the component and presentation pages.

The source scripts record the exact environment used for generation (macOS/Homebrew and the Codex bundled renderer). Update runtime paths before using them on another computer. The design files, HTML, tokens, SVGs and PDF are independent of those scripts.

## Quality and scope

The master was reopened in the installed desktop application; representative native renders, all 34 HTML boards and the PDF cover/product composition were visually checked. Logo masters were audited for clean vector construction. This is a design foundation, not a functioning web application. Accessibility requirements and transaction states require verification during implementation. Brand artwork is custom; trademark clearance is outside this deliverable.

Panels have zero corner radius. Controls use 2px; radio indicators remain circular for recognisable selection semantics. Avoid pill buttons and cards. Example product counts and financial amounts are illustrative and must be replaced by real application state.
