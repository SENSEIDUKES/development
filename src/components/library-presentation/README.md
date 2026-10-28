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
| Violet glass | Outer panels | Shared violet fill with panel blur and shadow |
| Violet inset | Nested panels | Shared violet fill with inset blur and shadow |
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
per-page preference store. Background tint controls were added in the follow-up below.

## Archive and saved work

The Palette & Materials workspace lists six active materials and nine archived
originals. Archive means excluded from the active foundation, not deleted or disabled
on pages still using them. Archived IDs and original rendering stay available to old
saved looks. New exports are version 3; version 1 and 2 imports remain readable. No stored
looks are replaced or reinterpreted as a newly named material.

The Effects section uses the live installed components/classes for action spectrum,
brand emblem glow, Reader rim, Codex halo, navigation and button highlights. It is an
inspection gallery; component-owned animation is not flattened into editable CSS
shadow snapshots. Home remains the first adoption; Reader blue remains active.


## 2026-10-28 — Background color and strength

`BackgroundTint` is the shared Library appearance preference: a validated six-digit
hex `color` and finite `strength` from 0 to 100. The existing device profile owns
saving and reload; no page or material owns another preference store. Missing
preferences preserve the original violet gradients. Zero strength is black;
reset removes the preference and restores those exact gradients.

`LibraryAppearanceScope` replaces the internal accent-only wrapper and keeps one
stable DOM element through edits and resets. It supplies optional background
inputs alongside the independent accent. `LibraryPresentationProvider` accepts
`backgroundTint`; `LibraryMaterialSurface` and Home's role adapter resolve it at
their own scope. Body-level material defaults remain for the existing portaled
companion surfaces, without inheriting the background preference.

`BackgroundTintControls` uses a native color picker and keyboard-operable strength
slider, a live canonical material preview and reset. Brightness is bounded at a
maximum RGB channel of 50 to retain readable light text. Color details show the
chosen hue and resulting dark tone. Strength does not change material opacity,
blur, borders or glows. Reduced-transparency fills retain the hue with an opaque
surface; forced colors use the system palette.

Home remains the adopter: header, navigation frame and plain footer. Artwork,
black control faces, other glass roles, Reader blue and Story Seed retain their
appearance. The Profile Workshop uses the same controls with its existing isolated
mock state. This does not synchronize preferences to a backend or migrate other
pages into the appearance system.


## 2026-10-28 — Unified purple and default preset

Shell, panel and card fills now resolve the same shared color. The default is
Midnight violet; choosing a background color/strength updates all three together.
Blur, borders, depth and black action/control faces retain their role-specific
recipes. Home's artwork and media-bearing cards keep their clear existing backing;
Reader blue and Story Seed remain independent.

`violet-panel` and `violet-card` replace the active `blue-glass`/`smoked-glass`
choices. `ARCHIVED_LIBRARY_MATERIALS` preserves the two former recipes under their
existing IDs so version 2 saved looks retain their meaning. They remain renderable
through the same canonical material surface, and the Workshop marks them archived.

The Profile **App colors · Default** preset restores default background and accents
without touching identity drafts. Background-only reset remains independent. The
Workshop exposes the same app foundation as a built-in preset, starts new browsers
on it, and retains all saved looks. Applying that preset changes only the current
experiment until saved. Version 3 exports include the new IDs; versions 1 and 2
continue to import.
