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
Library stylesheet, including its gradient, edge seam, shadows and touch/reduced-
transparency treatment. The two Reader color swatches measure its gradient stops.
On touch devices the original uses the Reader's opaque gradient and no blur;
desktop originals use the shared translucent recipe.

On phones (up to 650px), Materials, Colors, Preview and Saved are separate views
reached through a persistent bottom navigation with safe-area clearance. The
Materials view starts with a picker and compact side-by-side comparison, which
stays visible while adjusting the larger controls. The full gallery is optional;
desktop keeps the full catalog. Sections stay mounted so switching views preserves
experiments and saved-look state. Loading a look returns to Materials. No saved
format or existing look IDs change.

The editor measures the original samples in the browser, including responsive
blur, gradients, borders and layered shadows. Changes become scoped inline
overrides on the experiment only. Recoloring preserves gradient stops and their
relative opacity; changing blur retains saturation. Shadow strength affects
neutral shadows, glow strength affects colored shadows; surfaces without a
colored shadow can add a halo. Decorative pseudo-element edge rings stay with
their original components. Layer tiles separate the border, outer neutral
shadow, and colored/inset highlights. They are not complete component replicas.

The composition intentionally puts measured material layers on simple geometry;
component-specific pseudo-elements and animation remain in the original samples.
Its controls and actions are visual fixtures. Text and accent choices apply only
to this composition. The initial composition represents existing roles, not an
approved palette. Reduced-transparency experiments use an opaque fallback.

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

- **2026-10-26:** Added the Reader Chamber's blue panel material and gradient colors;
  made the phone workflow use section navigation, an optional gallery, a pinned
  comparison, and larger touch controls while preserving the desktop workbench.
- **2026-10-26:** Added the painter-style workbench with canonical material samples,
  measured color swatches, isolated experiments, composition and portable saved looks.
