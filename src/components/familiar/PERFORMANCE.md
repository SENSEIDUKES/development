# Familiar mobile performance audit — 2026-09-20

Scope: Library Familiar sprite, floating companion, profile selector and action tray.
This refines the existing Development implementation; no production transfer,
account schema, Energy policy, atlas artwork or frame timing changes.

## Findings and fixes

| Finding | Change | Evidence |
| --- | --- | --- |
| Each atlas frame set React state and changed image left/top, triggering React commits and layout. | Keep the frame cursor local to playback and update only the image transform and diagnostic frame attribute. No forced GPU promotion of the full atlas. | Exact-duration/loop tests pass. In the isolated browser sample below, steady playback fell from 10 commits/10 layouts to 0/0. |
| Offscreen sprites and selection GIFs could keep playing. | Intersection and document-visibility checks suspend sprite timers; offscreen/backgrounded hero GIFs use the existing still image, restoring the supplied GIF on return. | Tests verify no offscreen/background timers, observer cleanup, and hero source release/resume. |
| Every captured scroll measured bounds and allocated new position/bounds objects, even when unchanged; minimized companions retained listeners. | Coalesce geometry updates to one animation frame, retain unchanged state, omit document-scroll listening for viewport-only mounts, detach geometry observers/listeners while minimized. | A burst of 20 scroll events produces one measurement; none while minimized. |
| High-frequency pointer samples changed layout position and React state. | Batch pointer positions per animation frame, move via transform, flush the final sample on release, and cancel queued work on unmount/minimize. | Burst/release/cleanup tests plus existing mouse/touch/cancel/keyboard bounds tests. |
| Live blur sampled content behind the moving tray on touch devices. | Keep the glass gradient, border and shadow but use a more opaque gradient without backdrop filters on touch-only devices. Desktop retains blur. | Computed-style assertions and mobile screenshots in WebKit and Chromium. |

## Size policy

The profile still owns one physical multiplier (0.6–2). Mobile presentation is
capped at 1.5 and labelled 10–100% using `percent = (multiplier - 0.5) * 100`.
Default and Reset are 50% (multiplier 1). Desktop labels remain 60–200%, with a
100% default. Responsive changes never save a new preference. The selection and
companion share the same policy for narrow layouts and touch-only devices,
including landscape phones. Existing 44px action targets remain independent of size.

## Validation

- Focused Familiar, host-asset, product-integration and Profile tests cover sizing,
  desktop preference preservation, animation durations, resource cleanup, dragging,
  modal Energy, header actions, profile saves and unrelated draft preservation.
- TypeScript/app build, package boundaries and both packed-consumer smoke tests pass.
  The repository has no lint script/configuration. The existing StorySeedHelpMenu
  dynamic-import build warning is unrelated.
- Local Playwright WebKit with an iPhone 13 viewport and Chromium with Pixel 5
  touch emulation (6× CPU throttling) verified default, minimum, maximum, Reset,
  waving, minimized Energy, explicit Expand, lighter glass and landscape mobile cap.
  Desktop Chromium verified the original 60–200% range and interactions.
- Delayed atlas response preserves the loading message and starts playback after
  loading; an aborted atlas request produces the existing failure message. Reduced
  motion freezes frames. Automated tests verify hidden-document/offscreen cleanup.

### Isolated playback measurement

Same local Chromium, a single 156px idle sprite in a React Profiler, 6× CPU
throttling, after initial image load, sampled for six seconds via CDP performance
metrics. Baseline: **10 React commits and 10 layouts**. Updated: **0 React commits
and 0 layouts**. Style recalculation still occurs as frames change. This measures
eliminated work, not a claim of a particular frame rate or battery saving.

These are desktop-hosted engine/device emulations, not physical iPhone or low-end
Android benchmarks. OS memory pressure, battery/thermal behavior and mobile Safari
browser chrome still benefit from a physical-device smoke check. The unchanged
2,525,388-byte atlas and requested remote hero GIF retain their original download
costs; this work does not downsample or regenerate the supplied artwork.
