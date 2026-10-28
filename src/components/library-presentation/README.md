# Library presentation and material foundation

Library owns the branded appearance; SEN owns reusable narrative behavior. Installed
UI and brand components retain their own implementation. Do not copy their gradients
or animations into another component. `LibraryPresentationProvider` supplies the
presentation and saved accent; material recipes are exported through Library styles.

## Active materials — 2026-10-28

`LIBRARY_MATERIALS` and `LibraryMaterialSurface` are exported from
`@seihouse/library/presentation`. The authoritative app-owned recipes live in
`materials.css`, with semantic `--library-material-*` properties:

| Material | Surface role | Existing source |
| --- | --- | --- |
| Midnight violet | Header, navigation frame, plain footer | Shared violet recipe, also consumed by Story Seed at its existing opacity |
| Tidal glass | Outer panels | Owner's applied V1 blue glass |
| Smoked glass | Nested panels | Owner's applied V1 smoked glass |
| Obsidian | Control faces and companion sheets | Owner's applied black material |
| Spectrum action | Primary action | Black face with installed ManifestButton ring and halo |
| Reader blue | Reading panels | Existing `src/library/stories/reader-glass.css` |

Home's stylesheet maps existing components to these role properties and owns its
layout, clear-media exceptions and navigation states. It no longer owns copies of
the material values. The Workshop renders the same recipes through the public
surface; `verifyMaterialFoundation.browser.mjs` compares their computed layers with
actual Home. Reader rim and spectrum effects keep their existing owners.

The change establishes reusable materials, not a global page migration. Other
pages keep their current recipes until explicitly adopted. Future background hue
and strength preferences belong with the existing Library presentation/profile
flow, separate from material geometry, media and narrative Color Codes; no new
per-page preference store. User tint controls are not added in this foundation pass.

## Archive and saved work

The Palette & Materials workspace lists six active materials and seven archived
originals. Archive means excluded from the active foundation, not deleted or disabled
on pages still using them. Archived IDs and original rendering stay available to old
saved looks. New exports are version 2; version 1 imports remain readable. No stored
looks are replaced or reinterpreted as a newly named material.

The Effects section uses the live installed components/classes for action spectrum,
brand emblem glow, Reader rim, Codex halo, navigation and button highlights. It is an
inspection gallery; component-owned animation is not flattened into editable CSS
shadow snapshots. Home remains the first adoption; Reader blue remains active.
