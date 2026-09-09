# App-shell header verification — 2026-09-09

The duplicate Public View toolbar belongs to the private Cultivator Cave in the current code. It was removed there; Settings retains Preview Public View. Story Seed retains its non-duplicate Save Draft, Settings, Story Bank and Manifest actions.

## Browser verification

Ran the in-app browser against the local Vite preview at 320, 375, 390, 430, 480, 640, 768 and 1440 CSS pixels. `scripts/verifyAppShellTitles.mjs` covers Main Library, Story Seed, private Cave, public Cave and the long-title/context fixture (40 combinations).

- Current page names fit on one line with no ellipses, clipping, or title/control overlap. Title line height and the existing plaque height remain unchanged for current page names.
- Badge border, radius, background, colors, shadows and glow are untouched. Phone title size changes from 14px to 13px while retaining a 14px line height.
- An unusually long fixture title wraps instead of clipping; this fallback can increase its badge height.
- Header controls retain at least 44px touch targets and remain within the viewport. No horizontal page overflow.
- Help and Search remain direct controls at 480px and above. Below 480px they share Header options; mobile Search and Help open, and Escape returns focus to the overflow trigger.
- Search filtering, no-result feedback, disabled results, keyboard focus and return were exercised. Original Help guidance was checked using keyboard activation (mouse hover already expands Help topics).
- Landscape at 844 x 390 with simulated 44px safe-area insets and reduced motion keeps controls and the Search dialog within bounds.

## Automated checks

- 108 focused header/Cave tests passed.
- Production build passed.
- UI artifact integrity and package boundaries passed.
- Capture guard passed: 14 locked captures, 11 dependencies, 18 fonts.
- The stale global stylesheet hash was reconciled after verifying the recorded baseline matches the parent of merged commit 926d2d6; that commit only changed Workshop navigation selectors. No captured product stylesheet or reference file was edited.

These are local preview and fixture checks; no production application or hosted preview verification is claimed.
