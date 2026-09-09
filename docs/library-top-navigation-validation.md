# Library top navigation verification

Verified locally on 2026-09-09. These checks cover the Development header and Workshop adapters. They do not claim a Light-Novels production integration, live account search, or playback of remote help audio.

## Automated checks

- `npx vitest run src/components/library-shell/development src/components/user-profile src/components/story-seed`: **142 tests passed across 8 files**.
- `npm run build`: passed, including TypeScript, Vite and server artifact builds.
- `npm run build:package`: SEN and Library bundles/declarations passed their built-output verification.
- `npm run check:package-boundaries`: passed; SEN has no Library dependency.
- `npm run check:ui-artifacts`: passed; existing vendored UI artifacts are unchanged.
- `node scripts/checkLibraryShellCapture.mjs`: all **14 locked captures, 11 dependencies and 18 fonts** passed. The live-implementation prohibition remains on frozen captures/shared adapters, while active Development can reuse Library Help.

## Browser checks

The in-app browser ran `scripts/verifyLibraryHeader.mjs` against the local Vite preview. The script uses supplied Browser `tab` and `viewport` handles; it does not launch or select another browser.

| Check | Result |
| --- | --- |
| Present, absent, and long context at 320, 390, 768, 1024 and 1440px | All 15 combinations passed |
| Badge, context, Help and Search | Correct order, no overlap or horizontal overflow; controls at least 44px, allowing subpixel rounding |
| Missing/long context | Same row height and trailing Search position at each width |
| Keyboard traversal | Home link → context → Help → Search |
| Search modal | Focus enters labeled search field; Tab remains in the modal, Escape returns focus; disabled results cannot activate |
| Search matching | Case-insensitive label/description search; no-results state; reopening resets query |
| Help | Existing Library Help menu opens; original Relics guidance is shown verbatim; Tab wraps and Escape restores Help focus |
| Landscape safe area | 844 × 390 with simulated 44px side insets and reduced motion; top controls and Search dialog stay in bounds |

Additional checks used the actual Home, Story Seed and Cultivator Cave consumers. Home shows Dao Insights in the optional slot and a compact Search emblem on a phone. Story Seed keeps its page commands and existing Help owner. Cave Search invokes the original View Public Profile action; Public View then appears in the contextual slot and the same public page content/navigation remains available. The shell measures the complete header, including page commands, for the desktop rail's sticky offset.

## Inspect

Open `?preview=library-shell`, choose Development, then **Header slot states** to compare present/absent/long context. Existing page configurations remain in the same preview. Viewport, safe-area and reduced-motion controls are Workshop-only; the Cave configuration also has a Public View toggle. Open Help and Search through their actual header controls.

The user-facing Help dataset, page content, bottom-navigation components/definitions and locked reference files have no changes in this PR. Search covers existing navigation destinations/actions and does not add a story-content search service.
