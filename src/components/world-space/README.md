# World Space

Repository lifecycle and reference rules: [AGENTS.md](../../../AGENTS.md#core-rule).

- **What it is (SENSEI's definition, 2026-11-23):** all available information
  pertaining to one of your worlds. The **Creator Space** is where you view and
  edit your worlds; the **World Space** is one world, opened from it.
- **Source repository:** `SENSEIDUKES/development` (born here; no production original)
- **Source location:** `src/components/world-space/development/` (`WorldSpace.tsx`, `world-space.css`)
- **Package:** Library-owned, exported from `@seihouse/library/stories` as `WorldSpace`
- **In-app route:** `/app/?page=create&world=<id>`, inside the Create place of the navigation.
  Opened from the Creator Space by a world's card or its **Edit** button, and by Back from
  the creator's World Info.
- **Workshop preview:** `?preview=world-space` (Pages → Create → World Space). It loads the
  app's own route on one of this browser's real worlds, at Mobile, Tablet and Laptop sizes.
  Everything in the frame is the live app: tagging, voicing, Publish and Export change the
  real story. With no worlds in this browser it says so and links to the Creator Space.
- **Created:** 2026-10-30 (as the unnamed "author's world view" in `src/library/stories/`);
  named and given this folder 2026-11-23

## What it shows

One world at a time, never the list of them.

1. **Back · World Space · the medium.** Back returns to the Creator Space. The medium is
   Novel; Sequential Art is shown but waits until it exists.
2. **The spotlight.** The chosen world's cover fills the card (the Library's own art when
   the world has no cover yet), with its title, where it stands (Draft or Published, Made
   in SEN or Imported, its chapters) and **Read**, which opens its World Info, the
   creator's. On a phone the cover fills the card with the words along the bottom; on a
   wide screen the cover holds the far side and fades into a soft copy of itself behind
   the words.
3. **Other worlds, one step away.** A creator with more than one world gets `◀ 2 / 6 ▶`
   in the spotlight's corner. The arrows, a sideways swipe on the spotlight, or the
   keyboard's left and right arrows move to the previous or next world, in the order the
   Creator Space lists them (most recently changed first), going round from the last to
   the first. The open tab and the page's scroll position are kept, and the browser's Back
   still returns to the Creator Space. A creator with one world sees no arrows.
4. **Tabs for the chosen world:** Blueprint, Chapters (the list where chapters are checked
   and tagged a few at a time, and voiced), Codex (coming), Assets and Info (dates, Publish,
   Export). Tagging lives here and nowhere else: a reader never sees it.

## Ownership and contracts

`WorldSpace` renders the host's stories and reports intent; the host owns the worlds, the
story record and every destination.

| Prop | Host responsibility |
| --- | --- |
| `stories` | The `useLibraryStories` state and controller: chapters, tagging, visibility, export |
| `worlds`, `storyId` | The creator's worlds as the Creator Space shows them, and the chosen one |
| `onChooseWorld` | Another world chosen from the spotlight; the app replaces the address, keeping the scroll position |
| `onOpenChapter` | A chapter opened from Chapters: the creator's Reader in Create mode |
| `onRead`, `onBack` | The world's World Info; the Creator Space |
| `codexPictures`, `chapterVoices` | Optional host services for Blueprint pictures and character voices |

It builds on the Library's existing pieces (`StoryBlueprintPage`, `StorySettings`, the story
view helpers, Energy prices) and adds no store of its own. SEN never imports it.

## Known limits

- The page's own wording (World Space, Your world, the tabs) is not in the interface
  language packs yet, like the Creator Space's.
- Codex is a placeholder until the author's Codex is built
  ([Create plan](../../../docs/plans/create-hub.md), phase E).

## Verification

`development/WorldSpace.test.tsx` (the spotlight, one world at a time, arrows, swipe and
keyboard, tagging, voices), `src/novel-expanded/NovelExpandedApp.test.tsx` (Edit and the
card both open it; Back, Read, Publish, Export), and the browser walk
`scripts/verifyNovelExpandedApp.browser.mjs` at 390 and 1280 wide.

## History

- **2026-11-23** — **Named the World Space, one world at a time** (SENSEI). The page had no
  name ("the author's world view") and lived among the story files. It is now the World
  Space, with its own title on the page, this folder, a Workshop entry and preview. The
  Creator Space's **Edit** opens it instead of World Info. The row of every world is gone:
  the chosen world stands in a spotlight, and arrows, a swipe or the keyboard move to the
  creator's other worlds.
- **2026-11-04** — Info tab (dates, Publish, Export); Read opens World Info first; a chapter
  opens in the creator's Reader in Create mode.
- **2026-10-30** — Built as the author's world view: the Worlds column, the medium switcher,
  Blueprint, Chapters with tagging, Codex (coming) and Assets.
