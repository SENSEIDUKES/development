# World Card

Where `reference/` exists, it holds the old production version, kept as reference
material for the remake; it is not edited or refreshed. New features do not get a
reference folder. Old systems stay until each is remade on the new path; never
reconnect them as they are or re-sync with the old production app. The destination
is SEN, Library and NovelExpanded built here, guided by `NOVEL_EXPANDED.md`.

The Full, Compact, and Info cover cards are faces of one Library world card
renderer. Home and Create render it through host-specific adapters in this
folder; the Info page composes its cover face.

| Size | Component | Where it appears |
| --- | --- | --- |
| Info page | `WorldCardInfo` with `WorldCard face="info"` | The world detail (`light-novels-home` `StoryDetailScreen`) |
| Full card | `WorldCard` | Home's discovery grid (`light-novels-home` `LightNovelsHome`) |
| Compact | `WorldCard face="compact"` | Create's "Your worlds" row (`creator-space` `CreatorSpace`) |

- **Workshop preview:** `?preview=world-card` (Components → World Card)
- **Package:** `@seihouse/library/world-card` (owner `library`)
- **Created:** 2026-09-27
- **Last recorded Workshop update:** 2026-10-01
- **Historical source inspection:** 2026-09-27
- **Status:** active

The Workshop Pages controls include a viewport switcher: current browser,
320px small phone, 390px phone, 768px tablet and 1280px desktop. Fixed sizes
render the same preview stage in an iframe so its media queries see the chosen
width. `canvas=1` is an internal frame mode of the existing preview route, not
a second Workshop entry or a production surface.
Connected media is not part of the Info page. The Workshop Info stage and the
Library shell's world detail no longer render Home's `WorldExpressions`
section beneath it; that component, its package export and its concept
fixtures stay in `light-novels-home` for future use.

Clicking Full or Compact opens that world's existing Info page through a host-supplied
action. In the World Card Workshop, the same Info stage is shown for the
selected card, with Back to cards. Home already routes its Full card to the
detail screen. Create now routes Compact cards there as well; Continue and
Studio remain separate actions below the selected world. Create's local story
projection carries only title, chapter count, status, art, and known creator
lettering. The Info page keeps its standard layout and omits an unavailable
arc and tags instead of inventing them. The Workshop route retains the selected world's
preview data in browser history for Back, Forward, and refresh.

## Why Library owns it

The cards use Library UI (`LibraryCard`, `LibraryPanel`, `LibraryButton`) and
Library presentation. The Full and Info
cover faces compose the portable `@seihouse/sen/motion-picture` behavior; SEN does not
depend on the Library card.

## Source

- The Full card came from the inline card in `src/components/light-novels-home/development/LightNovelsHome.tsx`. Its production original is `SENSEIDUKES/Light-Novels` `src/components/LibraryScreen.tsx`, via the locked `light-novels-home/reference/` replica.
- The Info page came from `src/components/light-novels-home/development/StoryDetailScreen.tsx`. Its production original is `SENSEIDUKES/Light-Novels` `src/components/StoryDetailScreen.tsx` @ 4a3dd02.
- The Compact card came from `WorldsRow` in `src/components/creator-space/development/CreatorSpace.tsx`. It was built in DEV and has no production original.

## Folders

- `shared/worldCardContracts.ts` holds the props for each surface. They reuse the existing `HomeWorld`, `StoryDetailDisplay` and `CreatorWorld` display data; there is no new world model.
- `development/WorldCard.tsx` owns the Full, Compact, and Info cover faces. Create supplies its world, cover, and selection through `face="compact"`; there is no separate Compact component.
- `development/WorldCardCover.tsx` handles static art for every face; Compact keeps its celestial wash when art is missing.
- `development/` is the active Workshop version, which the real pages render.
- `reference/` is historical and not edited. It holds:
  - the Full card as the production replica renders it;
  - the Compact tile as it stood before extraction.

  The Info page reference is the existing `light-novels-home/reference/StoryDetailScreen`.

## Mock boundaries

The preview uses `featuredNovel` from `previews/light-novels-home/previewData.ts` and `SAMPLE_CREATOR_WORLDS` from `previews/creator-space/previewData.ts`. Every open or read action only reports what it would do. No story data is read or written.

The featured world's optional `videoUrl` points to the supplied Ye Chen MP4
at `media.seihouse.org`. The Full and Info cover faces play it only after the
separate motion
control is activated, once, muted and inline, then returns to its still cover.
Worlds without a clip keep the static card. The host supplies each world's own
clip; the card never reuses this sample URL for other worlds. Motion playback
is local to the card, with no stored preference or upload path. The Full and
Info cover faces sample each cover's color for the edge glow instead of adding Motion Picture's
separate aura. While its clip plays, that edge glow breathes slowly; reduced
motion keeps it steady. If the artwork cannot be sampled, the existing cyan
fallback is used. Dark sampled colors are lifted for visible hover and click
glows without changing which cover supplies the tint.

The Info page renders `WorldCard face="info"` as artwork only. It shares the
Full card's raised border, cover-sampled hover and focus glow, and optional
Motion Picture control and breathing glow. It has no format mark, title,
creator, chapter/status badge, format dialog trigger, or whole-card navigation
action: the world's format lives in the page's **Information** row instead. The
Info page owns its title, elemental creator byline, chapter count, and public
status alongside the viewer's Recently read state, tags, and synopsis.

## Info page layout

`WorldCardInfo` is one Celestial glass page, composed from the existing Library
pieces rather than page-local cards or buttons:

| Part | Component |
| --- | --- |
| Glass surface | `LibraryPanel` (`as="article"`) |
| Cover | `WorldCard face="info"` (unchanged) |
| Creator name | `ElementalTitle` when the host supplies `creatorTitle`, otherwise plain text |
| Publication status, Recently read, story tags | `SEIBadge` |
| Story tag colors | Story Seed tag catalog (`getTagMetadata`, `STORY_TAG_COLOR_ACCENTS` from `@seihouse/sen/story-seed`) |
| Reading pill | `ManifestButton` (`lg`) in Home's night-glass colors |
| Open Codex | `LibraryCard` (`interactive` when a destination exists) |
| Backdrop clip | `WorldCardBackdropVideo` (shared with the Feature card) |
| Format mark on the cover, Information row | `WorldCardStoryPanel` (the Full card's format dialog): the cover's corner mark and the row each open it |
| Synopsis More / Less | `LibraryButton` (`ghost`) |

- **Backdrop.** Behind the hero sits this world's own cover, blurred and
  washed in its own sampled color (`useDominantColor`). When the world has a
  motion picture, `WorldCardBackdropVideo` loops it silently over that, the
  same piece the Feature card uses. The clip shows only once it truly plays and
  stays still under reduced motion. The backdrop fades into the glass below,
  is hidden from assistive technology, and is not drawn without a cover. It
  never uses another world's art.
- **Presented the way Audible presents a title.** On a phone everything is one
  centered column, in this order:
  1. the big cover, square like the Compact card (about 72% of the width, up
     to 17rem);
  2. the page's one reading action, a night-glass pill (Home's Carve New
     Destiny `ManifestButton` look, never gold). It only ever says **Continue**,
     or **Begin Story** while a story the host can start has no chapters; the
     chapter it continues at is in its accessible name, not on the pill
     (without a working destination it says "Reading isn’t available here
     yet"). Recently read sits beside it when it applies;
  3. the title (cream shading to cyan) and `by` + creator;
  4. one meta line: genre | chapters | publication status (for example
     "Xianxia | 24 Chapters | On Going"). The current arc is shown beside the
     cover only, from 768px, where the status is a badge above the title;
  5. the story tags.
  The synopsis, Open Codex and Information follow. From 768px the cover stands
  on the left as the tall cover and the rest sits beside it, left aligned:
  states, title, byline, meta with the current arc, tags, then the pill. The Chapters card is gone; its count, current arc and
  reading action now live in the meta line and the pill.
- **Story tags in their catalog colors.** Each tag resolves against the Story
  Seed tag catalog. It shows its catalog label with its category's color dot
  and a matching tinted border (for example Politics & War in purple, Destiny &
  Karma in gold, Meta & Continuity in black with a light ring). Hovering shows
  the category. A tag outside the catalog stays a neutral chip. Tags are shown
  once each, compared the catalog's way (trimmed, case-insensitive), with no
  `#`. The color values now live beside the catalog as `STORY_TAG_COLOR_ACCENTS`,
  which Story Seed's tag editor also reads.
  - Phones use compact serif pills.
  - The creation date is not shown on this page.
- **Header row.** `StoryDetailScreen` uses the Library's standard back
  control: a ghost `LibraryButton` icon with ←, as in the workspace header and
  Profile. Its optional `backLabel` (default `Back to novels`) is the button's
  accessible name. A gold `WORLD INFO` eyebrow sits opposite. The Workshop's
  Info stage renders this same detail screen, labelled **Back to cards** when
  a card opened it.
- **Motion on the Info cover.** While the cover's Motion Picture clip plays,
  its control fades out so the small frame stays clear. It returns when the
  clip ends, and it stays visible if a keyboard user focuses it. The Full
  card's control is unchanged.
- **Public view only.** This Info page is what a reader sees when they open
  someone's world. It shows no owner or library states: the old Sealed /
  Unacquired acquisition labels and Draft are gone. Only the viewer's own
  **Recently read** remains. The owner's view of a world they are still
  building is a separate, future surface: NovelExpanded's **Story View**. It
  will sit inside Studio, with the Text Highlight Engine and custom soundscape
  and Sound Cue packs close at hand, and it is not a variant of this page.
- **No placeholder metrics.** Views, Branches, and Activity are not shown on
  the Info page. They have no real source yet, so the page isn't built around
  them. The Full card's format dialog still shows its views and Activity for
  now.
- **Synopsis.** It is clamped to three lines on phones and four from 640px.
  **More** sits beside the last line and appears only when the text actually
  overflows, with `aria-expanded` and `aria-controls`. A missing synopsis says
  so.
- **Chapters card: the only reading action.**
  - The card sits on a faint second card edge, like a stack of chapters. It
    shows a crop of the same cover on the left (from 340px), then the chapter
    count, a divider and the cue on one row, with the current arc underneath.
  - When the card is too narrow for one row (below 340px, or with a long
    Continue label), the cue moves beneath the text.
  - With the host's `onRead` and at least one chapter, the whole card is one
    `LibraryCard` button (Enter and Space work) with a **Start Reading →** cue.
  - The cue reads **Continue · Ch. N →** only when the host supplies
    `readingPosition`.
  - With zero chapters and the host's `onStart`, the same card is a
    **Start Story →** button: the host starts the story (the Library's HARNESS
    host opens the Reader and writes Chapter 1).
  - Without the matching action (`onRead` with chapters, `onStart` without),
    the card is static text. It is not focusable and shows no arrow.
  - There is no hero read button and no fixed bottom bar.
- **Secondary tools.** Open Codex is a quieter `LibraryCard` row led by the
  Library's own book artwork, shown only when the host supplies its handler.
  The **Information** row replaces the former mock Fate Timeline. It shows
  the world's format mark and format name (for example the Novel scroll and
  "Novel") under the title Information. It opens the same story information
  dialog as the Full card's format mark: synopsis, World standing with views,
  Activity, branching, and tags. This row is where the world's real provenance
  records will live later. It appears for a Library world with story details;
  a Create world without them has no Information row. Fate Timeline is no longer part of the Info page, and `onOpenTimeline`
  is gone from `WorldCardInfoProps`. There are no disabled placeholders. There is no Characters section (characters belong in
  the Codex) and no bookmark.
- The page never uses fixed positioning, so the host's mobile bottom navigation
  keeps its space. The Info page looks the same whichever card opened it.
- `readingPosition` is a new optional, host-supplied field on
  `WorldCardInfoProps`, passed through by `StoryDetailScreen`. No DEV host
  supplies a real position or Codex destination yet. The Library shell's detail
  screen therefore shows a static Chapters card and only the Information row until
  a host wires those actions.

The Workshop's States section adds **Info destinations** (reading and Codex /
reading only / none) and **Reading position** (not started / Chapter 7 / a new
story with no chapters, which shows Start Story). These preview-only mocks
report through the Workshop status line.

## Full card creator lettering and bottom badge

The Full card takes an optional `displayStatus` with an explicit viewing
context. A public surface supplies `ongoing` or `completed`, shown as **On Going**
or **Completed**. A personal-library surface can supply the existing creator
status (`draft`, `shared`, `public`, `complete`), shown with its existing label.
The format sits in the card's top-left corner. Novel is shown by its
`story-scroll` icon alone, with the format name retained for screen readers;
formats without a dedicated icon continue to show text. The title sits above
the information badge, with a crisp dark text outline for contrast. The Full
card has no image dimming layer or title scrim. The host may supply `creatorTitle` (element,
intensity, and color) to render that name with UI's `ElementalTitle`. Without
it, the name remains plain; the card never assigns an element from the name
or world. The Workshop's SENSEI sample uses lightning for visual review.
At the bottom, a translucent `SEIBadge` pill groups chapter count and
contextual status on the left. The creator name sits to its right without a
badge. Very narrow cards may wrap the name beneath the pill while keeping it
right-aligned. A book icon marks the chapter count until the custom chapter icon is ready. The
status uses the same document icon as Compact. Both values remain readable
text inside the badge; the badge is not an action.

Home passes the host-reported `HomeWorld.publicationStatus`. The Workshop
fixture supplies `ongoing` and its States control previews both public values
and the personal-library values. Missing status stays hidden; the card does not
infer completion from chapter count, Draft from acquisition, or status from the
Info page's unrelated `status` text. Compact already displays its creator
status. Of the Library states, only the viewer's Recently read appears, on the
Info page.

The Info page does not show Cultivation Rate; its tag slot holds story tags
only. The contract field remains for a later Library surface.

Compact keeps its shorter 11:12 crop and dark lower gradient. Its title,
cover-sampled edge glow, press treatment, and translucent `SEIBadge` chapter/status
pill come from the same rules as Full. Selection holds that same glow.
The Compact face shows only its title and chapter/status badge. Creator data
remains available to the Info page, but does not appear on the Compact card.
Its status comes from
`CreatorWorld.status`; it does not gain Full's format trigger or Motion Picture control.
Its card action opens Info; the selected glow remains visual state, while the
card is exposed to assistive technology as an opening action rather than a toggle.

The Workshop's Activity control previews the Full card's format dialog only;
the Info page shows no Activity or Branches. Its sample values do not come from
activity tracking.

## Format information panel

The top-left format control opens `WorldCardStoryPanel`, using UI's existing
`SEIDialog` for centered viewport placement, a dim backdrop, focus, Escape,
and outside-tap dismissal. It includes Synopsis, authorized Activity, branching
permission, and Story tags. A close control stays visible. Long content scrolls
inside a compact viewport-bounded panel. Missing format uses an information icon.
An official `SEN Verified` badge appears in World standing only when the host
supplies `senVerified: true`. The Workshop's featured world sets this sample
flag so the badge can be reviewed. The card never derives verification from
creator identity, publication status, or a world title. A future trusted SEN
verification authority must define the criteria, grant/revoke the claim, and
provide a viewer-safe read projection; creator-editable story data must not set it.
The dialog's upper-right **World standing** section groups verification and
views. The synopsis begins alongside it instead of waiting below it, then uses
the full width once the box ends. The world title remains on the card; the
dialog retains a screen-reader-only title for accessible naming. World standing
leaves room for a later host-supplied leaderboard rank without showing a
placeholder rank or suggesting a ranking system already exists. The close
control keeps its 44px touch target with a smaller visible X; outside tap and
Escape dismissal still work.
The format and MP controls have matching 28px visual bounds and 17px icons;
invisible 8px extensions retain 44px touch targets without large visible rings.
MP playback and opening the story remain independent actions. The MP control
keeps a light translucent resting appearance. While motion is requested, the
Full card fades its title and chapter/status pill out and leaves the creator
name visible; both pieces return when playback stops or the clip ends. Reduced
motion applies the visibility change immediately.

`HomeWorld` now accepts optional `synopsis`, `tags`, `activityStatus`, and
`branchingEnabled` so Home and discovery hosts can supply the same authorized
projection as the detail page. `StoryDetailDisplay` still requires synopsis and
tags. An omitted Activity or branching permission is hidden, never inferred.
Empty synopsis/tags receive an unavailable/empty message. `branchingEnabled`
is a boolean creator permission, independent of `branchCount`; zero descendants
does not mean disabled, and existing descendants do not mean enabled. Hosts must
filter these fields for the viewer before passing them to the client. The panel
is read-only and is not an authorization check or a branch-creation action.
Any future branch endpoint must recheck the creator permission and viewer access
on the server. The preview supplies a sample enabled permission; no backend or
presence polling was added.

## Branches and Activity data contract

`StoryDetailDisplay` is a read-only display projection supplied by the host
when opening a world. The Info page currently shows neither Branches nor
Activity (see Info page layout); the contract below is kept for when a real
source exists. `WorldCardInfo` does not fetch, count,
poll, infer, or authorize these values. The Full card shows authorized Activity
only inside its format-triggered panel; Activity does not control its glow. Boosts are outside this iteration.

- `branchCount?: number` is the aggregate number of distinct descendant worlds
  grown from this world's seed, excluding the seed itself. A known zero renders
  as `0`; an omitted value hides Branches. It is a count, never a list of
  branch IDs, owners, titles, or private content. The later backend must own
  the authoritative seed relationship, exclude deleted/invalid branches, and
  apply visibility policy before supplying the count. A public seed may show
  an aggregate that includes private descendants without exposing their
  content; a private source world remains inside its access circle.
- `activityStatus?: 'active-now' | 'active-this-week' | 'quiet'` is a
  host-computed, viewer-authorized signal. `active-now` means someone is using
  the world now. `active-this-week` means an interaction in the past seven days
  without current use. `quiet` means no interaction for over seven days. The
  later backend must define qualifying use and interactions, session expiry,
  clock boundaries, and refresh cadence before claiming a live status. A
  stale, unavailable, unauthorized, or creator-hidden signal is omitted rather
  than shown as Quiet. No identities, active-user counts, or event logs reach
  this display. Private-world Activity stays within its access circle.

Future integration needs an authoritative branch relationship and count
projection, an activity projection with freshness rules, creator visibility
settings, and server-side viewer authorization. Supply the authorized results
through `StoryDetailDisplay` in the host's world-detail data flow and authorized
`HomeWorld` fields for the card panel. Database
reads, presence subscriptions, permission decisions, and persistent settings
belong outside this component and the Workshop fixtures. Branch creation must
respect the source creator's permission; each new branch starts private.
These are documented product requirements, not behavior implemented here.

## Implementation inventory

The packages and NovelExpanded app built here are the destination. Keep Workshop
controls, fixtures and adapters outside reusable package entries; another repository
changes only when the owner asks. Historical references stay untouched.

The existing local files named by this inventory are:

- `development/`
- `shared/`
- `development/world-card.css`
- `reference/`

## Host boundary

Home and Create render `WorldCard` with the appropriate face; `WorldCardInfo` composes
the Info cover face. The host supplies `onRead`, a known `readingPosition`, and
`onOpenCodex` only where that destination works. It also supplies world display data,
optional `videoUrl`, creator lettering, publication/personal-library status, authorized
synopsis/tags/activity/branching permission, and working destinations.

The display uses `@seihouse/sen/motion-picture`, compatible `@seihouse/ui@0.10.1`
components and `@seihouse/library-ui@0.9.0` (`LibraryPanel`, `LibraryCard`, `LibraryButton`).
Workshop sample data and reference material remain outside the host adapter.

## Workshop history

- **2026-10-09** — **One caption for Full and Compact.** The creator's name left
  the art and sits in the caption under the title (in their elemental lettering
  when the host supplies it). Compact now carries the same caption as Full
  (title, creator, genre | chapters | status, and the Branching badge) and the
  same format mark on its art, opening the story information dialog. Compact
  opens through the same open button as Full, so the format mark is its own
  control. `CreatorWorld` gained optional `genre`, `branchingEnabled`,
  `synopsis` and `tags`; the story dialog shows views only when the host
  supplies them.
- **2026-10-09** — **World Info, Audible style.** A big centered cover over a
  backdrop made from the cover's own art and color, with the world's motion
  picture looping behind it when it has one. Under the cover, the reading pill,
  then status, title, byline, a genre | chapters line with the current arc, and
  the tags, all centered; from 768px the cover stands beside them. Nothing was
  removed: the Chapters card's count, arc and action moved into the meta line
  and the pill. The backdrop clip is the shared `WorldCardBackdropVideo`, which
  now also counts a successful `play()` as playing, so a clip that starts
  before React listens no longer stays invisible (this fixes the Feature card
  too). After SENSEI's phone review: the pill is Home's dark night-glass
  button instead of gold, the phone cover is the Compact card's square, the
  status sits beside a shorter pill, and the current arc shows beside the cover
  only. The laptop layout is unchanged.
- **2026-10-09** — **Continue or Begin Story.** The reading pill says only
  Continue (or Begin Story for a story with no chapters); the chapter number
  left the pill and lives in its accessible name. On phones the publication
  status moved into the meta line ("Xianxia | 24 Chapters | On Going"); the
  laptop keeps its badge.
- **2026-10-09** — **Info cover controls and legible lettering.** The Info cover
  is a still; its MP button (top-right) now plays or stops the clip looping
  behind the page, so a reader whose phone refused to start it (Low Power Mode,
  reduced motion) can start it with a tap. Whenever the clip is not playing,
  the backdrop is the cover itself, only lightly softened. The format mark is back on the cover's
  top-left corner, opening the story information dialog (where views and more
  will live); the Information row below stays, to become the Blueprint
  entrance later. A soft dark shade and a text shadow sit behind the title,
  byline and meta so they read over any clip, and on phones the meta line stays
  on one line (a long genre shortens) so no separator is left alone.
- **2026-10-09** — **Cover slot.** `WorldCardInfo` takes `coverAction`: the host's
  own controls laid over the Info cover in its frame (the app's World Info makes
  covers there: Manifest on an empty cover, a small Manifest and download on a kept one).

- **2026-10-09** — **Clean cards, the SEN sash, the Feature card.** Full keeps
  its 2:3 cover at its original Home size; Compact (Create's "Your worlds") is
  square. Both keep the art clean: on Full only the format mark and motion
  picture control (both in ghost glass), the creator's name and the sash. The
  title, then genre | chapters | status, sit in a caption beneath, with one
  feature row: a **Branching** badge when the host says the creator enabled
  branching. The caption keeps one height so a grid lines up. The **SEN sash**
  crosses every cover's lower-right corner like a bound book's ribbon, in
  celestial night glass trimmed with gold hairlines and the gold star either
  side of SEN. The sash is kept for a distinction the host awards (`senSash`;
  for example, a completed novel) and is off by default; the Workshop's *SEN
  sash* control shows it. New **Feature card**
  (`WorldCardFeature`): a wide banner the size of Home's Featured hero (15rem,
  20rem from 640px), the world's cover on the right, that cover blurred in its
  own color behind a gold eyebrow, title, byline, details, synopsis and
  Branching; when the world has a motion picture, it loops muted behind the
  band (still when the reader prefers reduced motion). Home's Featured hero
  cycles through Feature cards. The Workshop adds Feature card and Home grid
  views.

- **2026-10-01** — **Start Story.** `WorldCardInfoProps` (and
  `StoryDetailScreen`) take `onStart`. A story with no chapters whose host can
  start it shows its Chapters card as **Start Story →**; with chapters, the card
  reads them as before. The Library's HARNESS host is the first to use it: a
  story just started from its Story Seed and Blueprint opens on this page, and
  Start Story takes the reader into the Reader while Chapter 1 is written.
  The Workshop's Reading position control gains **New story, no chapters
  (Start Story)**.

- **2026-09-30** — Info page rebuilt to show everything at a glance on a
  phone.
  - **One screen.** The page now fits between the Library shell's header and
    bottom navigation.
  - **Hero.** Cover and title stay side by side at every width; tags run full
    width beneath the hero on narrow phones.
  - **Removed.** The placeholder Views / Branches / Activity strip (and its
    "not shared yet" line) is gone, and so is the Workshop Branches control.
  - **Synopsis.** Three lines, with More beside the last line.
  - **Sizing.** The Chapters card and tools are compact; on phones under 380px,
    Codex and Timeline sit side by side.
  - **Header row.** The back row no longer wraps.
  - **Information row.** An Information row (format mark and format name)
    replaces the mock Fate Timeline and opens the Full card's story information
    dialog, the future home of provenance records. The format mark is gone from
    the Info cover.
  - **Public view.** Sealed, Unacquired and Draft are removed; only Recently
    read remains. The Workshop's Library status control became **Reader
    history**.
  - **Continue.** The reading cue reads **Continue · Ch. N →** when the host
    knows the reader's position. The Workshop sample now starts at a known
    Chapter 7.
  - **Back and motion.** The back control is now the standard Library ghost
    icon button, and the Info cover's motion control hides while its clip
    plays.
  - **Tags.** Tags use the Story Seed catalog colors, with no `#`, and
    Cultivation Rate is removed from the tag slot. The Workshop sample world
    now carries real catalog tags (inheritance trials, sect politics, found
    family, lost history).

- **2026-09-30** — Kept the Full card's chapter/status badge and creator name on one bottom row at narrow Home widths; removed the creator name from Compact cards while retaining their title and chapter/status badge.

- **2026-09-30** — Second pass, laid out phone-first to follow the approved
  reference closely.
  - **Hero.** The cover now sits beside one column holding the title, byline,
    pills and tags. The cover keeps the World Card's own edge and glow, and
    the title shades from cream to cyan.
  - **Pills.** They use compact serif styling. On Going is green, Sealed is
    indigo with a gold lock, and the genre has a gold mark.
  - **Metrics.** The strip has inset dividers, and the Activity glyph is tinted
    by state.
  - **Details.** The divider has a star ornament, and More is set in cyan
    serif.
  - **Chapters card.** It is stacked: cover crop, then count | Start Reading →
    on one row, then the arc beneath.
  - **Tools.** Codex and Timeline cards lead with Library artwork.
  - **Header.** The detail screen has a gold back arrow and a `WORLD INFO`
    eyebrow, with an optional `backLabel`.
  - **Workshop.** The Info stage now renders the real `StoryDetailScreen`.
  - **Date.** The creation date is no longer shown on the Info page.

- **2026-09-30** — Redesigned the Info page as one Celestial glass page.
  - **Surface.** A `LibraryPanel` carries a faint, blurred reflection of the
    world's own cover.
  - **Unchanged.** The real `WorldCard` Info face and the `ElementalTitle`
    byline stay as they were.
  - **Badges.** Publication, Library state, genre, tags and Cultivation Rate
    use `SEIBadge`.
  - **Metrics.** A glass strip shows only the metrics that are supplied.
  - **Synopsis.** It has a four-line clamp with an accessible More control.
  - **Reading.** A single `LibraryCard` Chapters card is the only reading
    action. It says Start Reading, or Continue Reading when the host supplies a
    position, and is static when the host supplies no reading action.
  - **Tools.** Quieter Open Codex and Fate Timeline cards appear only when the
    host supplies those destinations.
  - **Removed.** The equal-weight pill buttons, disabled placeholders and
    "tags unavailable" chip are gone.
  - **Connected media.** It is no longer shown beneath the Info page in the
    Workshop or the Library shell. `WorldExpressions` is preserved.
  - **Workshop.** Added Info destinations and Reading position states.

- **2026-09-29** — Brought Home's existing connected-media section into the World Card Workshop Info stage. The featured world's Novel, Manga, and Game previews appear below the overview; other Compact worlds do not inherit those sample adaptations.

- **2026-09-29** — Added the Full card's format symbol to the Info cover's top-left corner. It identifies the host-supplied format without opening another dialog from the Info page; missing format shows no mark.

- **2026-09-29** — Removed the duplicate visible title from the Full card's information dialog and let Synopsis flow alongside World standing. Kept the dialog title available to screen readers and cleared the following sections below the box.

- **2026-09-29** — Removed the unused mock Mini row, including its component, contract, styles, package export, test, and Workshop view. Full, Compact, and Info remain; a future Mini can be designed as a real face when needed.

- **2026-09-29** — Turned the dialog's upper-right corner into a World standing section for SEN verification and views, with space for a later real leaderboard rank. Widened the compact dialog for phone layouts and reduced the visible X while retaining its touch target and dismissal behavior.

- **2026-09-29** — Added a compact `SEN Verified` mark beneath the title in the Full card's story information dialog. It renders only from an explicit host-supplied verification flag; the Workshop featured world previews the visual without claiming a live verification system.

- **2026-09-29** — Replaced the Info page's plain cover wrapper with the shared `WorldCard` Info face. The artwork now has the Full card's border, sampled glow, hover response, and optional Motion Picture; title, elemental creator, chapters, and publication status remain in the surrounding Info page.

- **2026-09-29** — Added true-width phone, tablet and desktop frames to the World Card Workshop controls for judging both card faces and the Info page at device sizes.

- **2026-09-29** — Added host-supplied creator lettering to the compact face using the shared bottom-row slot. Workshop Create samples use SENSEI's lightning style to preview the layout; missing creator data stays hidden.

- **2026-09-29** — Replaced Compact's separate component with `WorldCard face="compact"`. It now inherits the full card's title treatment, cover-sampled glow, press feedback and chapter/status badge while retaining its crop, lower gradient and selection behavior.

- **2026-09-29** — Kept the Full card's chapter and status metadata anchored during press while the cover art and glow provide the press feedback.

- **2026-09-29** — Optimized the Full card across grid widths: the 2:3 frame now stays contained, title sizing follows the card's container, and lower metadata can wrap cleanly on narrow tracks.

- **2026-09-29** — Sharpened the Full card's resting edge with a thin neutral border and restrained depth shadow, preserving its colored hover, active, and Motion Picture glows.

- **2026-09-29** — Added a compact SEIBadge view count to the story information dialog header.

- **2026-09-29** — Refined the Full card's title outline, restored a translucent MP control, centered the story information in a dimmed dialog, and faded the title and chapter/status pill during Motion Picture playback while retaining the creator name.

- **2026-09-29** — Matched MP and format control sizing, made the format control open a compact story information popover, and replaced all Full-card cover dimming with a crisp title outline. Shared Activity labels with the Info page and documented host-authorized panel fields and independent branching permission.

- **2026-09-29** — Placed chapter count and status in a small left-side badge and the unbadged elemental creator name on the right. Very narrow cards wrap the name beneath the badge. Added a soft dark scrim behind the title to keep it legible across cover art.
- **2026-09-29** — Updated the vendored universal UI package to 0.10.1. Previewed a host-supplied lightning `ElementalTitle` on SENSEI and grouped the Full card's chapter and status in one translucent `SEIBadge` pill; worlds without creator styling keep plain text.
- **2026-09-29** — Centered the creator name above the Full card's bottom metadata row for visual review.
- **2026-09-29** — Moved the Full card's format icon to the top-left corner and left chapter count and contextual status in the centered bottom row.
- **2026-09-29** — Added a temporary chapter icon and kept the Full card's format in the middle of its centered bottom row. Novel now uses only its story-scroll icon visually, with an accessible text label.
- **2026-09-29** — Centered the Full card's three-part bottom row as one unit, including at the narrower Home grid width. Removed separators from that row to keep all three values readable on one line.
- **2026-09-29** — Moved the Full card's chapter count from the top-left badge into a bottom row with format and contextual status. Kept the creator name between title and that row.
- **2026-09-29** — Added a document-icon status directly after the Full card's format. Public Home uses host-supplied On Going/Completed; a personal-library use can show the existing Draft/Shared/Public/Complete values. Added Workshop states for both contexts without deriving story progress from acquisition or chapter count.
- **2026-09-29** — Restored a brighter hover and clicked/focused edge glow after the sampled cover color made it too dim. Motion playback now breathes from that strong glow instead of replacing it with a weaker one.
- **2026-09-29** — Matched the Full card's edge glow to its cover artwork using SEN's existing color sampler. The glow breathes gently only while Motion Picture is active, stops with the clip, and stays still under reduced-motion settings.
- **2026-09-29** — Composed the existing SEN Motion Picture in the Full card only. The featured Workshop world supplies the Ye Chen clip. Opening a world and playing its motion are separate controls, so keyboard and touch users can choose either action. Missing clips retain the static card; failed clips return to the still, and failed stills show the existing cover fallback.
- **2026-09-29** — Added the existing `story-scroll` Library icon beside NOVEL on the Full card and matched the Compact card's lighter subtext treatment. The icon is decorative because the format remains readable as text, and only the Novel format receives it; other formats can gain their own icon later.
- **2026-09-29** — Brought the Compact card's stronger edge and selected glow to the Full card's hover, press, and focus states. Matched its smooth transition timing and added reduced-motion handling; the Full card remains a navigation action, not a toggle.
- **2026-09-29** — Replaced Realm and Status on the Info page with host-supplied Branches and Activity. Added Workshop states and documented the future branch, activity, freshness, and visibility contract. The Full card remains free of activity indicators and glow.

- **2026-09-29** — Made the full discovery card the canonical `WorldCard`. It is now a single 2:3 image with a chapter badge at the top and the title, creator and format overlaid at the bottom. The preview world supplies SENSEI and Novel; these are host-supplied display fields, not component defaults. Removed the Full card's separate footer, genre, writing style and expansion seals. Moved the preview's view count and all Library states (Draft, Sealed, Unacquired, Recently read) to the Info page. Added shared empty/broken-cover handling for Full and Info, removed the fixed cultivation-rate value, and made the Workshop missing-cover control apply to every size. Compact and Mini remain as separate surfaces for later refinement.
- **2026-09-27** — Created. The Full, Info and Compact cards were extracted unchanged from Home, the world detail and Create, and those pages now render them. Added the new Mini size, sized like an audio track. Added the Workshop tab with views for All sizes, Info page, Full card, Compact and Mini, plus Library status, long title and missing cover states.
