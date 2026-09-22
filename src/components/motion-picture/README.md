# Motion Picture

- Source: `SENSEIDUKES/Light-Novels`, `src/components/StoryDetailScreen.tsx` (the `motionCoverActive` aura layers, the "Canva Video Peak Overlay", and the Canva toggle button), inspected on branch `main` at commit `647165a`.
- Preview: Workshop **Shared → Motion Picture** and `?preview=motion-picture`.
- Replica created: 2026-09-22.
- Last Workshop update: 2026-09-22.
- Last source comparison: 2026-09-22.
- Lifecycle: production behavior captured in `reference/`; a reusable, item-neutral rebuild under development.
- Owner: SEN-shaped presentation. The component reaches no Library surface, no store, and no catalogue, so it can move into `@seihouse/sen` when an entry is wanted.

## What production does today

A story carries two separate fields: `imageUrl` for the still cover and `videoUrl` —
documented in production as "this story's own Cloudflare R2 motion cover video. No
fallback to another story's video when unset." A third field, `motionCoverActive`,
is the persisted on/off choice and is one of the few fields the Reader/Codex patch
boundary may write.

The detail screen renders a "Canva" button (a `Film` icon, labelled `Canva` /
`Disable Canva`) in the action column beneath the cover. Toggling it writes
`motionCoverActive`. While it is on **and** `videoUrl` is set, a muted, inline,
auto-playing clip fades over the still for 800 ms, badged `ⓈSEN`, and the clip's
`onEnded` toggles the same field back off — so a clip plays once and returns. Three
`motion` layers pulse an aura around the cover on 4.5 s, 3 s and 2.2 s loops, tinted by
a colour sampled from the cover: the image is drawn to a 1 × 1 canvas and, when the
artwork is very dark, its channels are scaled up so the glow stays visible.

Nothing in production ever writes `videoUrl`. There is no upload, generation, or admin
path for it anywhere in that repository, so the field is populated by hand when it is
populated at all. The behavior is real and complete; the way to supply it a clip is not.

## Naming

Production labels this ability with a third party's trademark. The rebuilt component,
its entry, and every Workshop surface are called **Motion Picture** instead. The locked
`reference/` replica keeps production's own label because it documents what that screen
renders today; nothing new carries the old name.

## What Development changes

`reference/MotionCoverReference.tsx` is the locked replica of the above, with the store
write replaced by a host callback. It exists so the rebuild can be compared against the
real thing, and is not edited during normal Workshop tweaking.

`development/MotionPicture.tsx` is the rebuild. It is deliberately **not** a cover
component: it takes a still, an optional clip, and an accessible name, so a novel cover,
a Familiar, a relic, or any other item with a picture can use the same ability.

Differences from production, each on purpose:

- **The control lives on the artwork.** One overlay button in the corner of the frame,
  sized to a 44 px touch target, instead of a separate full-width button in a column
  beneath the cover. Cards in a grid have no action column to put a button in.
- **The aura is CSS, not JavaScript.** Production runs three infinite `motion` loops per
  cover, which is fine for one cover on a detail screen and expensive for a grid of
  Familiars. The same three layers, durations, opacities and scales now run as compositor
  keyframes driven by a `data-playing` attribute.
- **Stopping fades.** Production fades in over 800 ms but unmounts instantly on stop.
  The clip element stays mounted after its first play and crossfades both ways.
- **Reduced motion is honoured.** The aura stops pulsing and the crossfades collapse,
  while an explicitly requested clip still plays.
- **A clip that fails withdraws its own control** instead of leaving an empty frame, and
  a newly supplied clip gets a fresh chance.
- **Playback state is the host's to keep or ignore.** Pass `playing` and
  `onPlayingChange` to persist the choice the way production persists `motionCoverActive`;
  omit them and the component owns the state itself. No persistence, profile, or store
  dependency is built in.
- **No branding is baked in.** Production's `ⓈSEN` badge is a host decision here, so it is
  supplied through `children`.

`ManifestationReveal` (`@seihouse/sen/manifestations`) was considered and is a different
mechanic: a one-way sealed → unsealing → revealed progression for content that is being
manifested. A motion picture is reversible, repeatable, and returns to where it started.

## Mock boundaries

`src/workshop/previews/motion-picture/` owns every preview-only concern: the story card
demo, the clip source panel, the sample list, the grid framing, and the hosted clip URLs
used for inspection. Each item points at its own clip, the way production models it — the
story cover plays `video.seihouse.org/LIGHT NOVEL/LIGHT_NOVEL_INTRO.mp4` and the Celestial
Guardian plays `media.seihouse.org/SEN/VIDEO/Familiar/Celestial Guardian Canva.mp4`, both
existing Library assets. Still artwork comes from
`public/card-workshop/test-images/` and `public/familiars/`. The component itself ships
no URLs, no catalogue, and no Workshop state.

Colour sampling reads the still through a canvas, which requires the host to serve
artwork with CORS. When it cannot, the aura falls back to `rgba(4, 172, 255, 0.6)` — the
same fallback production uses — and nothing else changes.

## Workshop surfaces

The Development pane carries three things, in the order they are useful:

- **Clip source** — each item plays its own clip; pasting a direct video URL here tries
  one across all of them, so the component can be judged against real footage without a
  rebuild, and Reset hands every item its own clip back. It accepts `https:`, `blob:`,
  `data:`, and preview-served paths, and rejects anything that is not a direct media link.
  This is a deliberate stand-in for the video import system: uploading a clip, storing it,
  and addressing it per item all attach here later.
- **On a story card** — the first real card carrying the ability, cover and metadata
  together. Further item types (a Familiar card next) join this row in the same shape.
- **Shapes and states** — the bare frames: the Celestial Guardian playing its own
  Familiar clip, host-remembered playback, a differently coloured plate, and an item with
  no clip at all.

## Transfer notes

Production integration is a separate, explicitly authorized task. For it:

- `development/MotionPicture.tsx`, `development/useDominantColor.ts`, and
  `development/motion-picture.css` are the whole component; `lucide-react` is its only
  dependency.
- `StoryDetailScreen.tsx` would supply `stillUrl={story.imageUrl}`,
  `videoUrl={story.videoUrl}`, and bind `playing`/`onPlayingChange` to
  `motionCoverActive` through the existing `updateStory` patch, replacing the inline aura
  block, the video overlay, and both copies of the Canva button.
- Nothing in this folder should travel: `reference/`, the Workshop preview, and the mock
  clip URL are all inspection-only.
- Supplying `videoUrl` is still unsolved in production and is not in this component's
  scope; it renders whatever clip a host hands it.

## Workshop history

- **2026-09-22** — Production's motion cover inspected at commit `647165a` and captured
  in `reference/`. Built `MotionPicture` as the item-neutral rebuild: overlay control on
  the artwork, CSS-driven aura, two-way crossfade, reduced-motion handling, clip-failure
  fallback, and optional host-owned playback state. Published it as
  `@seihouse/sen/motion-picture`. Added the Workshop workspace under Shared, the manifest
  entry, and the `?preview=motion-picture` route, with a story card demo and a clip source
  panel for testing real footage. Renamed away from production's trademarked label.
