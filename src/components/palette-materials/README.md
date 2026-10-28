# Palette & Materials

Open **Components → Palette & Materials**, `?preview=palette-materials`. This is
Workshop-owned visual tooling; it ships in neither the SEN nor Library package.
One `FeatureWorkspace` hosts the workbench, without historical Compare.

The eight starting materials are current Home panels, Create grouped fields,
sign-in glass, Pathways navigation, Familiar helper panels, Reader blue glass, primary night-glass
actions and secondary actions. Original samples render canonical components or
classes. The sign-in and Create glass recipes live in the shared Story Seed
`materials.css`; only sign-in layout remains in `StoryAuthGate`. No production theme,
package API, account action or authentication behavior is changed.

`samples.tsx` records each material's usage and owning source, distinguishing
package presentation from app overrides. Home and buttons come from
`@seihouse/library-ui`; Create adds the current scoped Story Seed CSS; navigation
uses the package's Pathways variant; Familiar uses `.familiar-helper` with only
position and sample geometry overridden. All samples use the same chosen
background. Artwork comes from the host's existing `authImage`, never its video.

Reader blue glass consumes `.reader-glass.reader-glass-panel` from the existing
Library stylesheet, including its gradient, rounded border, shadows and touch/reduced-
transparency treatment. The two Reader color swatches measure its gradient stops.
On touch devices the original uses the Reader's opaque gradient and no blur;
desktop originals use the shared translucent recipe.

On phones (up to 650px), Materials, Colors, Preview and Saved are separate views
reached through a persistent bottom navigation with safe-area clearance. The
Materials view starts with a picker and compact side-by-side comparison, which
stays visible while adjusting the larger controls. The full gallery is optional;
desktop keeps the full catalog. Sections stay mounted so switching views preserves
experiments and saved-look state. Loading a look returns to Materials. The saved-look format remains version 1.

The editor measures the original samples in the browser, including responsive
blur, gradients, borders and layered shadows. Changes become scoped inline
overrides on the experiment only. Recoloring preserves gradient stops and their
relative opacity; changing blur retains saturation. Shadow strength affects
neutral shadows, glow strength affects colored shadows; surfaces without a
colored shadow can add a halo. The Border glow selector can replace any material's decorative ring with the
Reader's warm rim, inset light and gold-to-blue rim that follows each surface’s corner radius. Apply to all
changes only the current experiment, preserving each material's fill and other
edits. Reset restores the original edge. The shared `.reader-border-glow` recipe
lives beside the original Reader selectors in `src/library/stories/reader-glass.css`;
Reader panels share the same rounded rim; stationary Reader bars retain their straight chapter-edge seam. The border choice is an optional
validated field in existing version-1 looks, so existing exports still load. Layer tiles separate the border, outer neutral
shadow, and colored/inset highlights. They are not complete component replicas.

The composition intentionally puts measured material layers on simple geometry;
the Reader edge is shared with the samples, while other component-specific
pseudo-elements and animation remain in the originals.
Its controls and actions are visual fixtures. Text and accent choices apply only
to this composition. The initial composition represents existing roles, not an
approved palette. Reduced-transparency experiments use an opaque fallback.

The owner's latest `palette-materials.json` is bundled unchanged as `owner-looks.json`.
Its final **V1** combination is the default on a fresh browser and the first visit
for this export revision. Earlier browser inclusion markers also receive this
revision. Conflicting browser looks are retained as separate “(previous)” looks;
other local work and identical imported looks remain available. After inclusion,
browser saves and deletions are respected. Unreadable storage is left untouched;
failed writes keep the combined looks available for export. These are Workshop
starting looks, not a global app palette.

Saved looks contain named combinations, background, selected material, colors,
and per-material overrides. Explicit saves use
`workshop.palette-materials.looks.v1` in browser localStorage. No cloud sync or
app storage is involved. JSON exports use `format: palette-materials`, `version: 1`;
imports validate the entire file and append with fresh IDs. Limits are 100 looks,
80-character names and 1 MB per import. Export includes an unsaved current
experiment. Storage failures keep work in memory and explain that it must be
exported before leaving. Loading a saved look replaces the current unsaved
experiment; deleting a saved look does not erase the current experiment.

Validation: model tests cover gradient edits, independent shadow control,
round trips, invalid imports and storage failure. Browser verification covers
canonical materials, desktop/mobile layout, editing/reset, composition, saved
look lifecycle, reload, import/export, keyboard and reduced transparency.

## History

- **2026-10-27:** Fixed the official Reader border to follow rounded panels and
  pill buttons at every width; updated defaults to the supplied V1 look while
  preserving earlier browser work.

- **2026-10-27:** Included the owner’s four exported looks unchanged, opened the
  latest saved combination on entry, and preserved existing browser work.

- **2026-10-27:** Made the Reader border glow transferable to any or all experiment
  materials and the composition, with saved-look support and an isolated edge sample.

- **2026-10-26:** Added the Reader Chamber's blue panel material and gradient colors;
  made the phone workflow use section navigation, an optional gallery, a pinned
  comparison, and larger touch controls while preserving the desktop workbench.
- **2026-10-26:** Added the painter-style workbench with canonical material samples,
  measured color swatches, isolated experiments, composition and portable saved looks.


## 2026-10-28 — Active foundation, archive and effects

Six active materials now come from Library presentation: Midnight violet, Tidal
glass, Smoked glass, Obsidian, Spectrum action and Reader blue. Home and the active
samples consume the same CSS recipes. Seven previous samples are explicitly archived
in a closed disclosure, with archived selection labels and existing saved-look IDs
preserved. Their source surfaces remain functional. New exports use version 2 while
version 1 files remain importable.

Effects has its own mobile tab and desktop section. It renders live action spectrum,
logo glow, Reader rim, Codex halo, navigation selection and button highlight owners;
hover/focus/press work on real controls. Earlier color inventories are collapsed.
See `../library-presentation/README.md` for ownership and adoption boundaries.


## 2026-10-28 — Actual color inventory

Colors now derives swatches from the rendered active material layers: base fills,
text (including actual white and supporting white), Reader gradient/rim stops,
border and shadow colors, and both the action ring and halo spectrum. Theme
accents come from their live canonical tokens. The handwritten fallback list was
removed; missing measurements are not presented as substitute paints. Base colors
appear first, while subtle gradient layers and the prior inventory are collapsed.

The inventory explicitly shows shared material defaults; the user's personal
background tint and its exact dark tone are visible in Profile settings. Experiments
and saved looks keep their own colors and never redefine this source inventory.


## 2026-10-28 — Unified purple default

Active outer/nested materials are now Violet glass and Violet inset, with the same
purple fill as Midnight violet. Their original blur/shadow roles remain distinct.
The former Tidal and Smoked glass paints are two additional archived materials;
original IDs and settings keep rendering unchanged. Version 3 exports support the
new IDs, while version 1/2 imports preserve earlier work.

**App colors · Default preset** loads the current official purple composition and
white/portal colors without replacing saved looks. New browsers begin on that
composition, with the supplied older looks still available. Returning browsers
continue loading their saved look. Profile's app preset restores background and
accent defaults together; its controls now recolor plain Home cards and chrome
through the same shared fill.


- **2026-10-28, color-only correction:** Purple is applied to RGB channels only.
  Outer panels retain their original 12% opacity and gradient layers; nested cards
  retain 35% opacity and their original gradients. The header retains its own 95%
  recipe. Blur (24px panels, 25px with saturation for cards), borders and shadows
  are unchanged. Custom tint/strength supplies RGB channels to each recipe, rather
  than replacing it with the header fill. Browser verification compares all
  non-color properties and gradient alpha/stops against the archived originals.
