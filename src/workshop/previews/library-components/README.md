# Library Components workspace

`?preview=library-components` is the Workshop's live inventory of Celestial Library
presentation. `src/workshop/LibraryComponents.tsx` owns its fixtures and local demo
controls; every component is imported from `@seihouse/library-ui`, owned by the UI
repository. No component implementation is copied into Development.

The catalog follows the 16 Library UI families in UI's
`apps/workbench/registry/component-registry.ts` (`senFamilies`), verified at
`6f95f04` on 2026-10-25. Package versions, full source commit and integrity are
recorded in `vendor/ui-artifacts.json`.

Compound card/drawer parts, scrubber travelers/destinations/trails and manifestation
parts are grouped with their parent family. `LibraryManifestation` is the UI
workbench's family label, not a package export: it previews `CelestialScrollVessel`,
`ManifestationChamber`, `SwordCultivatorClash` and `CelestialChannel`. `LibraryIcon`
shows representative named icons; the existing Icons workspace remains the full
icon inventory. Universal `@seihouse/ui` primitives belong to UI's own workbench.

The scrubber slider demonstrates three travelers and indeterminate progress. The
manifestation button cycles sealed, unsealing and revealed visual states. The Cave
uses an existing host asset. All controls are isolated preview state: no generation,
account actions, storage or backend calls. The existing workspace route and card
remain unchanged; this catalog has no historical Original Reference.

## History

- **2026-10-25:** Completed the catalog from 11 to 16 families with journey scrubber,
  named icons, Cave atmosphere, manifestation visuals and particles. Updated the
  vendored UI packages to UI 0.12.0 and Library UI 0.10.1. Kept package-owned SVG
  dimensions instead of applying the Workshop's placeholder illustration sizing.
