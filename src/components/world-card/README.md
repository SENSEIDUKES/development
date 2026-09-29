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
such as Sealed/Unacquired acquisition and Cultivation Rate. There is no
reusable narrative behavior in them to split out into SEN.

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

The Info page shows Cultivation Rate only when the host supplies a value. The
Workshop fixture supplies "Heaven" for its sample world; other worlds are not
silently assigned that rate.

The Info page preview uses mock values of 12 Branches and "Active this week"
Activity. The States controls also show zero or unavailable branches, the
other Activity states, and hidden Activity. These samples do not come from a
branch database or activity tracking.

## Branches and Activity data contract

`StoryDetailDisplay` is a read-only display projection supplied by the host
when opening a world. The Info page shows Branches and Activity in the metric
grid where Realm and Status used to be. `WorldCardInfo` does not fetch, count,
poll, infer, or authorize these values. The Full card has no activity signal or
related glow. Boosts are outside this iteration.

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
through `StoryDetailDisplay` in the host's world-detail data flow. Database
reads, presence subscriptions, permission decisions, and persistent settings
belong outside this component and the Workshop fixtures. Branch creation must
respect the source creator's permission; each new branch starts private.
These are documented product requirements, not behavior implemented here.

## Transfer

Copy `development/`, `shared/` and `development/world-card.css`. Then:

- have the host's Home grid, world detail and Create row render `WorldCard`, `WorldCardInfo` and `WorldCardCompact`;
- supply world display data and destinations from the host.

Leave behind the Workshop preview, its sample data and the `reference/` folder.

## Workshop history

- **2026-09-29** — Added the existing `story-scroll` Library icon beside NOVEL on the Full card and matched the Compact card's lighter subtext treatment. The icon is decorative because the format remains readable as text, and only the Novel format receives it; other formats can gain their own icon later.
- **2026-09-29** — Brought the Compact card's stronger edge and selected glow to the Full card's hover, press, and focus states. Matched its smooth transition timing and added reduced-motion handling; the Full card remains a navigation action, not a toggle.
- **2026-09-29** — Replaced Realm and Status on the Info page with host-supplied Branches and Activity. Added Workshop states and documented the future branch, activity, freshness, and visibility contract. The Full card remains free of activity indicators and glow.

- **2026-09-29** — Made the full discovery card the canonical `WorldCard`. It is now a single 2:3 image with a chapter badge at the top and the title, creator and format overlaid at the bottom. The preview world supplies SENSEI and Novel; these are host-supplied display fields, not component defaults. Removed the Full card's separate footer, genre, writing style and expansion seals. Moved the preview's view count and all Library states (Draft, Sealed, Unacquired, Recently read) to the Info page. Added shared empty/broken-cover handling for Full and Info, removed the fixed cultivation-rate value, and made the Workshop missing-cover control apply to every size. Compact and Mini remain as separate surfaces for later refinement.
- **2026-09-27** — Created. The Full, Info and Compact cards were extracted unchanged from Home, the world detail and Create, and those pages now render them. Added the new Mini size, sized like an audio track. Added the Workshop tab with views for All sizes, Info page, Full card, Compact and Mini, plus Library status, long title and missing cover states.
