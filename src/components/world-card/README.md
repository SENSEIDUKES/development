# World Card

One world, four sizes. Every place a world's card appears in the Library renders
from this folder, so a change to a size shows up everywhere that size is used.

| Size | Component | Where it appears |
| --- | --- | --- |
| Info page | `WorldCardInfo` | The world detail (`light-novels-home` `StoryDetailScreen`) |
| Full card | `WorldCardFull` | Home's discovery grid (`light-novels-home` `LightNovelsHome`) |
| Compact | `WorldCardCompact` | Create's "Your worlds" row (`creator-space` `CreatorSpace`) |
| Mini | `WorldCardMini` | New — a track-sized row, not yet placed on a page |

- **Workshop preview:** `?preview=world-card` (Components → World Card)
- **Package:** `@seihouse/library/world-card` (owner `library`)
- **Created:** 2026-09-27
- **Last Workshop update:** 2026-09-27
- **Last source comparison:** 2026-09-27
- **Status:** active

## Why Library owns it

The cards use Library UI (`LibraryCard`, `SEIBadge`) and show Library-only states
such as Sealed/Unacquired acquisition, Cultivation Rate and Realm. There is no
reusable narrative behavior in them to split out into SEN.

## Source

- The Full card came from the inline card in `src/components/light-novels-home/development/LightNovelsHome.tsx`. Its production original is `SENSEIDUKES/Light-Novels` `src/components/LibraryScreen.tsx`, via the locked `light-novels-home/reference/` replica.
- The Info page came from `src/components/light-novels-home/development/StoryDetailScreen.tsx`. Its production original is `SENSEIDUKES/Light-Novels` `src/components/StoryDetailScreen.tsx` @ 4a3dd02.
- The Compact card came from `WorldsRow` in `src/components/creator-space/development/CreatorSpace.tsx`. It was built in DEV and has no production original.
- The Mini card is new in DEV.

## Folders

- `shared/worldCardContracts.ts` holds the props for each size. They reuse the existing `HomeWorld`, `StoryDetailDisplay` and `CreatorWorld` display data; there is no new world model.
- `development/` is the active Workshop version, which the real pages render.
- `reference/` is locked. It holds:
  - the Full card as the production replica renders it;
  - the Compact tile as it stood before extraction.

  The Info page reference is the existing `light-novels-home/reference/StoryDetailScreen`. Mini has no reference.

## Mock boundaries

The preview uses `featuredNovel` / `featuredExpansions` from `previews/light-novels-home/previewData.ts` and `SAMPLE_CREATOR_WORLDS` from `previews/creator-space/previewData.ts`. Every open, continue or read action only reports what it would do. No story data is read or written.

The "Cultivation Rate: Heaven" chip on the Info page is still hard-coded, exactly as it is in the source.

## Transfer

Copy `development/`, `shared/` and `development/world-card.css`. Then:

- have the host's Home grid, world detail and Create row render `WorldCardFull`, `WorldCardInfo` and `WorldCardCompact`;
- supply world display data and destinations from the host.

Leave behind the Workshop preview, its sample data and the `reference/` folder.

## Workshop history

- **2026-09-27** — Created. The Full, Info and Compact cards were extracted unchanged from Home, the world detail and Create, and those pages now render them. Added the new Mini size, sized like an audio track. Added the Workshop tab with views for All sizes, Info page, Full card, Compact and Mini, plus Library status, long title and missing cover states.
