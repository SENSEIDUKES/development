# Library Shell capture validation

Validated on **2026-09-08** against the commits recorded in [capture provenance](../src/components/library-shell/capture-manifest.json). Scope and ownership are documented in the [Library Shell README](../src/components/library-shell/README.md).

## Source fidelity

- Main Library `GlobalHeader` and `DaoInsights` returned JSX compare equal to the current Light-Novels source after localizing the emblem URL and normalizing trailing whitespace. Their presentation and animation markup were not rewritten. Production store/configuration/API access is replaced at explicit adapter boundaries.
- Story Seed `StorySeedHeader`, `StorySeedMobileNavigation`, `StorySeedSettings`, and `StorySeedSelector` compare equal to current source after import relocation and trailing-whitespace normalization. The copied `CreationModal` integration retains its shell classes and composition; editor, Story Bank and Help content are host slots.
- At 1440px, the captured Story Seed header and the active source have matching measured element sizes, relative positions, fonts, sizes, and colors, rounded to 0.01 CSS pixels. The header is 1280px wide and approximately 85.76px high; the emblem is 48px, title 36px, Save Draft 44px high, and desktop utility controls 36px high.
- Source paths and exported symbols were read from the updated repositories. Light-Novels and UI remained clean on their current main branches; no active Story Seed or published-package source was modified.

## Browser matrix

Checks used the Codex browser against the local Workshop server on port 5186. Port 5173 was already serving a separate Light-Novels preview. Browser emulation is not a physical-device test.

| Area | Evidence |
| --- | --- |
| All fixtures | All 10 Main Library states and all 7 Story Seed states render at 390 × 844 and 1440 × 900 with no document horizontal overflow. The Saved phone label is checked inside Settings, its actual source location. |
| Breakpoints | Both shells additionally checked at 320, 430, 768, and 1024px. Story Seed switches sidebar/desktop actions and mobile bottom controls at 1024px. No document horizontal overflow. |
| Main Library | Global menu labels, profile/guest entry, local screen navigation, home keyboard activation, syncing and pending dots, DAO category and loading behavior, successful local response, failed-response fallback, and Escape dismissal checked. |
| Story Seed navigation | Drawer open/close, all seven section destinations, required-state markers, Story Bank toggle, and selecting a section from the bank returning to the editor checked. |
| Settings | Phone sheet and desktop popover checked; Fate Survival expansion and radio keyboard selection work. Escape closes the phone sheet, restores focus to Settings, and restores body scrolling. Save feedback renders in the sheet and desktop header. |
| Generation | Generic and VERSA loading fixtures render; disabled/required controls are preserved. The local Manifest action completes at the mock Blueprint-review destination. |
| Reduced motion | Drawer open/close checked with reduced-motion emulation. Existing source behavior retained; no claim that every Main Library CSS animation honors reduced motion. |
| Workshop integration | Single homepage/registry entry, phone and desktop frame selection, state selection, direct capture route, and Compare checked. Compare uses independent documents so source viewport rules and body portals remain isolated. |
| Existing preview | Current `?preview=story-seed` opens and retains its original editor and shell. |
| Network | Complete focused recordings for Main Library load plus DAO seek and Story Seed load plus Save/Manifest each captured 49 requests, with no API requests and no event truncation. The capture now self-hosts the source-requested font payloads, so its layout no longer depends on Google Fonts at render time. |
| Console | No browser error logs in the focused capture checks. The deliberately failed DAO fixture retains its source fallback warning. |

## Local checks

- `npm run build` — passed, including both HTML entries, TypeScript, and the repository's existing API build steps.
- `node scripts/checkLibraryShellCapture.mjs` — passed: 14 locked captures, 11 pinned presentation/type/style/asset dependencies, and no production data access or imports of the active Story Seed implementation.
- `npm run check:package-boundaries` — passed; captures, mocks and preview code remain outside both published packages.
- `npm run check:ui-artifacts` — passed; installed UI artifact inputs match the existing provenance and lockfile.
- `git diff --check` — passed.

## Limits of this evidence

This is shell verification with local state. It does not validate account sign-in, Profile screens, cloud persistence, production synchronization, AI providers, full Story Bank/Help/editor/Blueprint content, audio, or live story data. These systems are intentionally absent from the capture. Mock content has a different height from full page content, so content-dependent footer position and full-page pixel parity are not asserted. Source body/viewport theme behavior, shell markup, spacing, fonts, breakpoints, and interactive controls are the comparison target.

The browser's screenshot scaling was inconsistent after switching emulated viewports between tabs; element measurements and DOM/interaction checks were used for the recorded source parity result. No pixel-diff score or screenshot baseline is claimed. Safe-area rules are preserved from source but have not been tested on physical iOS hardware. The review follow-up added capture-only focus, assistive-status, sticky-footer, local-font, and adapter-contract corrections; production source behavior remains unmodified.
