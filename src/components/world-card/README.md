# World Card

The full `WorldCard` is the canonical Library world card. Its related surfaces
live here as well. Home, the world detail and Create render this folder's
components directly.

| Size | Component | Where it appears |
| --- | --- | --- |
| Info page | `WorldCardInfo` | The world detail (`light-novels-home` `StoryDetailScreen`) |
| Full card | `WorldCard` | Home's discovery grid (`light-novels-home` `LightNovelsHome`) |
| Compact | `WorldCardCompact` | Create's "Your worlds" row (`creator-space` `CreatorSpace`) |
| Mini | `WorldCardMini` | New — a track-sized row, not yet placed on a page |

- **Workshop preview:** `?preview=world-card` (Components → World Card)
- **Package:** `@seihouse/library/world-card` (owner `library`)
- **Created:** 2026-09-27
- **Last Workshop update:** 2026-09-29
- **Last source comparison:** 2026-09-27
- **Status:** active

## Why Library owns it

The cards use Library UI (`LibraryCard`) and show Library-only states
such as Sealed/Unacquired acquisition and Cultivation Rate. The Full card
composes the portable `@seihouse/sen/motion-picture` behavior; SEN does not
depend on the Library card.

## Source

- The Full card came from the inline card in `src/components/light-novels-home/development/LightNovelsHome.tsx`. Its production original is `SENSEIDUKES/Light-Novels` `src/components/LibraryScreen.tsx`, via the locked `light-novels-home/reference/` replica.
- The Info page came from `src/components/light-novels-home/development/StoryDetailScreen.tsx`. Its production original is `SENSEIDUKES/Light-Novels` `src/components/StoryDetailScreen.tsx` @ 4a3dd02.
- The Compact card came from `WorldsRow` in `src/components/creator-space/development/CreatorSpace.tsx`. It was built in DEV and has no production original.
- The Mini card is new in DEV.

## Folders

- `shared/worldCardContracts.ts` holds the props for each surface. They reuse the existing `HomeWorld`, `StoryDetailDisplay` and `CreatorWorld` display data; there is no new world model.
- `development/WorldCardCover.tsx` gives the full card and Info page a shared fallback for empty or failed cover URLs.
- `development/` is the active Workshop version, which the real pages render.
- `reference/` is locked. It holds:
  - the Full card as the production replica renders it;
  - the Compact tile as it stood before extraction.

  The Info page reference is the existing `light-novels-home/reference/StoryDetailScreen`. Mini has no reference.

## Mock boundaries

The preview uses `featuredNovel` from `previews/light-novels-home/previewData.ts` and `SAMPLE_CREATOR_WORLDS` from `previews/creator-space/previewData.ts`. Every open, continue or read action only reports what it would do. No story data is read or written.

The featured world's optional `videoUrl` points to the supplied Ye Chen MP4
at `media.seihouse.org`. The Full card plays it only after the separate motion
control is activated, once, muted and inline, then returns to its still cover.
Worlds without a clip keep the static card. The host supplies each world's own
clip; the card never reuses this sample URL for other worlds. Motion playback
is local to the card, with no stored preference or upload path. The Full card
samples its cover color for the edge glow instead of adding Motion Picture's
separate aura. While its clip plays, that edge glow breathes slowly; reduced
motion keeps it steady. If the artwork cannot be sampled, the existing cyan
fallback is used. Dark sampled colors are lifted for visible hover and click
glows without changing which cover supplies the tint.

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
status. Sealed, Unacquired, and Recently read stay on the Info page.

The Info page shows Cultivation Rate only when the host supplies a value. The
Workshop fixture supplies "Heaven" for its sample world; other worlds are not
silently assigned that rate.

The Info page preview uses mock values of 12 Branches and "Active this week"
Activity. The States controls also show zero or unavailable branches, the
other Activity states, and hidden Activity. These samples do not come from a
branch database or activity tracking.

## Format information panel

The top-left format control opens `WorldCardStoryPanel`, using UI's existing
`SEIDialog` for centered viewport placement, a dim backdrop, focus, Escape,
and outside-tap dismissal. It includes Synopsis, authorized Activity, branching
permission, and Story tags. A close control stays visible. Long content scrolls
inside a compact viewport-bounded panel. Missing format uses an information icon.
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
when opening a world. The Info page shows Branches and Activity in the metric
grid where Realm and Status used to be. `WorldCardInfo` does not fetch, count,
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

## Transfer

Copy `development/`, `shared/` and `development/world-card.css`. Then:

- have the host's Home grid, world detail and Create row render `WorldCard`, `WorldCardInfo` and `WorldCardCompact`;
- supply world display data, optional per-world `videoUrl`, optional creator lettering resolved from the creator profile, public publication status or personal-library creator status, authorized panel synopsis/tags/activity/branching permission, and destinations from the host;
- include the `@seihouse/sen/motion-picture` entry and compatible `@seihouse/ui@0.10.1` components alongside the Library card.

Leave behind the Workshop preview, its sample data and the `reference/` folder.

## Workshop history

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
