# Faithful replica procedure

Use this skill whenever the user asks to bring a real page, component, animation, or
flow from another application into the SEN Visual Development Workshop for safe visual
refinement.

## Naming and Source Authority

This procedure applies only to Mode A. For reconstruction, follow the [skill entrypoint](../SKILL.md).

For shared production concepts, the main `Light-Novels` repository is the naming source
of truth. Use the current verified production name when creating or updating Workshop
files, metadata, imports, and transfer instructions.

Current examples include:

- `ReaderCodex`
- `CreationModal`
- `StorySteeringModal`
- `ClosedDoorCultivationModal`
- `ParticleEffect`
- `DestinedEndingCard`
- `ManifestationImage`
- `profilePicture`

Do not reintroduce retired developer-facing synonyms into new Workshop replicas.

A developer-facing rename does not authorize changing persisted values, API route
strings, database fields, storage keys, or historical schema names. Preserve verified
compatibility identifiers from the source application unless the user explicitly asks
for a migration task.

## Required Input

Resolve or ask for only information that cannot be discovered from the repositories:

- **Target:** exact page, screen, component, animation, or flow.
- **Source repository:** repository containing the production implementation.
- **Workshop repository:** destination visual-development repository.

The user may provide the target directly above the request, for example:

```text
Target: Versa writing page
Source: Light-Novels
Use the Workshop Replica skill.
```

Do not require the user to describe implementation details they would not reasonably
know.

## Mission

Create a visually faithful Workshop replica of the target so it can be inspected,
animated, and redesigned without relying on the source application's production
systems.

The replica must preserve the real presentation while replacing production behavior
with lightweight local state.

Do not modify the source application's production page unless the user explicitly
requests a separate integration task.

## Phase 1: Inspect Before Editing

Inspect both repositories before making changes.

Identify:

1. The real source page and its route or entry point.
2. The exact current source file path and exported symbol.
3. Presentation files that directly shape the visible experience.
4. Visual dependencies that can be safely reused or copied.
5. Production dependencies that must not enter the Workshop.
6. Existing Workshop systems that should be reused instead of duplicated.
7. The correct Workshop preview route, registry entry, folder placement, and manifest
   entry.

### Source-path verification is mandatory

Before writing `source.path`, transfer instructions, or import guidance:

1. Verify the file exists in the named source repository.
2. Verify the path against the intended source branch or commit.
3. Verify the current exported component/function name.
4. Verify whether the target was recently renamed or moved.
5. Do not infer a production path from the Workshop path.
6. Do not point at a root-level file when the verified production file is under
   `src/components/`, `src/hooks/`, `src/services/`, or another real directory.

A build passing inside `development` does not prove a cross-repository manifest path is
valid.

Present a brief file plan before implementation. Keep it practical and concise.

## Phase 2: Preserve the Real Presentation

Copy or reconstruct the target as faithfully as practical.

Preserve presentation details that materially affect visual judgment:

- layout and responsive behavior
- mobile and tablet proportions
- typography
- spacing
- colors and borders
- icons and imagery
- visible animation structure
- buttons and interaction hierarchy
- progress indicators
- loading, success, empty, and failure presentation
- surrounding UI that changes how the target feels

Do not simplify or redesign during extraction unless the user specifically asks for
redesign work in the same task.

First create a trustworthy replica. Refinement comes afterward.

## Phase 3: Enforce the Production Boundary

The Workshop replica must not require:

- authentication
- Firebase
- Postgres
- Cloudflare R2
- production APIs
- AI generation calls
- payments
- account data
- real story persistence
- real user records
- secrets or production environment variables
- production routing assumptions

Do not copy large chains of business logic merely to make the replica run.

Replace production behavior with local mock data, timers, and explicit preview state.
Preserve compatibility strings only when they are necessary to faithfully model visible
behavior; do not make real network calls to those routes.

## Phase 4: Build a State Simulator

Create a small state simulator covering every meaningful visual state of the target.

Use names matching the real flow. Examples include:

```ts
type PreviewState =
  | 'idle'
  | 'opening'
  | 'loading'
  | 'generating'
  | 'charging'
  | 'progressing'
  | 'verifying'
  | 'nearly-complete'
  | 'completed'
  | 'revealed'
  | 'insufficient-resources'
  | 'error';
```

Only include states meaningful for the target.

Preview controls must remain clearly separated from reusable UI. They are Workshop
tools, not SEN product UI.

## Phase 5: Keep the Result Portable

Every feature gets exactly one folder with a `reference/` and `development/` split—never
a second component folder, preview folder, or homepage card for a “V2”:

```text
src/
  components/
    <target-name>/
      reference/
        <TargetComponent>.tsx
      development/
        <TargetComponent>.tsx
      shared/
      README.md

  workshop/
    previews/
      <target-name>/
        <TargetName>Workspace.tsx
        previewData.ts
        previewStates.ts
```

Adapt file names to the repository's existing structure rather than forcing unnecessary
reorganization, but do not skip the `reference/` versus `development/` split. The
reference copy is the trustworthy comparison point; the development copy absorbs every
Workshop change.

Separate:

- reusable UI (`reference/` and `development/`)
- preview-only wrapper (`Workspace.tsx`, built on `FeatureWorkspace`)
- mock data
- state simulator
- Workshop navigation and controls

Never embed Workshop-only controls or mock behavior into the reusable production
component. Never create a second manifest entry, preview folder, or component folder
named `V2`, `V3`, `Revised`, or `Experimental` for the same feature. Git history already
preserves prior iterations.

## Phase 6: Reuse Approved Workshop Systems

Reuse existing Workshop systems when they genuinely fit the target:

- Library glyphs and icon assets
- shared typography and visual tokens
- `ParticleEffect` and other verified shared effects
- seals, glows, and animation utilities
- reduced-motion handling
- foreground-safe behavior
- reusable reward and presentation components

Verify every reused component's current file path and export before updating a manifest
or transfer note. Do not force an existing effect onto a target that needs its own visual
identity.

## Phase 7: Register the Replica

Add the replica to the Workshop's existing discovery system.

At minimum:

- add one entry to `src/workshop/manifest.ts` with `source.repository`, verified
  `source.path`, and `source.lastCompared`;
- register the feature's `Workspace.tsx` in the `previewRegistry` in `src/App.tsx`;
- give it a stable preview ID;
- make it reachable by direct URL;
- keep one homepage card per feature;
- do not break existing previews.

One feature gets one manifest entry, not one entry per visual version.

## Production Rename Synchronization

When the source component is renamed or moved after a replica already exists, update the
Workshop in one focused synchronization pass:

1. Verify the new source path and export in `Light-Novels`.
2. Rename matching Workshop component filenames and symbols when they represent the
   same production concept.
3. Update both `reference/` and `development/` imports without altering visuals.
4. Update workspace imports, preview registry references, and manifest metadata.
5. Update the feature README's source location and transfer instructions.
6. Search the Workshop repository for the retired developer-facing name.
7. Keep intentionally persisted/API compatibility strings unchanged and report them.
8. Build the Workshop and open the preview.

Do not rename only the file while leaving stale exported symbols, props, test names,
manifest paths, or transfer notes behind.

## Required Dating and History Metadata

Every replicated component or page must include a local README with metadata near the
top:

```markdown
# <Component or Page Name>

- **Source repository:** <owner/repository>
- **Source location:** <verified route or file path>
- **Workshop preview:** `?preview=<id>`
- **Replica created:** YYYY-MM-DD
- **Last Workshop update:** YYYY-MM-DD
- **Last source comparison:** YYYY-MM-DD
- **Replica status:** faithful replica | under refinement | approved | transferred back
```

Use the real current date. Never invent or reuse an old date.

Whenever an agent materially changes the replica:

1. Update **Last Workshop update**.
2. Add a concise entry under `## Workshop history`.
3. Update **Last source comparison** only when the source implementation was actually
   inspected again.
4. Update status when the lifecycle changes.

Use:

```markdown
## Workshop history

- **YYYY-MM-DD:** Created faithful Workshop replica and local state simulator.
- **YYYY-MM-DD:** Refined portal animation and reduced-motion behavior.
```

Do not create noisy history entries for formatting-only changes.

## Component README Requirements

Document:

- what was copied or faithfully reconstructed
- what was mocked
- available preview states
- reusable Workshop dependencies
- production dependencies intentionally excluded
- known visual differences from the source
- exact verified files needed for later transfer
- transfer notes and cautions

## Accuracy Checks

Test at minimum:

- narrow mobile width
- larger mobile width
- tablet width
- desktop width
- short text
- long text
- empty or missing optional content
- all meaningful preview states
- reduced-motion preference

The replica should be accurate enough that decisions made in the Workshop remain
trustworthy when transferred back.

## Final Verification

Before finishing:

1. Confirm the Workshop builds successfully.
2. Confirm the preview opens directly.
3. Confirm every mock state renders.
4. Confirm no production API calls occur.
5. Confirm no secrets or environment assumptions were copied.
6. Confirm mobile, tablet, and desktop layouts remain trustworthy.
7. Confirm existing Workshop previews still work.
8. Confirm README dates and history are current.
9. Verify every manifest `source.path` exists in the named repository.
10. Search for stale retired developer-facing names in the feature folder, manifest,
    registry, README, and transfer instructions.
11. List every file added or changed.
12. State remaining visual differences or risks honestly.

## Final Response Format

Report:

- what was replicated or synchronized
- direct preview route
- states available
- production systems intentionally excluded
- verified source path and export
- build/test result
- files changed
- current README dates
- intentionally retained compatibility strings
- remaining differences or risks

Do not claim successful compilation, valid source linkage, or visual parity unless each
was actually verified.
