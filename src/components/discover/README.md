# Discover

The Library's Discover page, Expanded Novels' front door. Direction:
[`docs/plans/discover-page.md`](../../../docs/plans/discover-page.md).

`Discover` (`@seihouse/library/discover`) draws the page over host-supplied data:
worlds (`HomeWorld`, shown on the shared `WorldCard`), creator and Codex directory
projections, releases, section-specific follows, Fate Survival worlds,
Heavenly Rankings boards and event announcements. It never ranks or
recommends: New Chapters orders by release time alone, and Rankings keep the host's order. Every world opens
through the host's `onOpenWorld`.

The page has a compact header, sticky destination links, and a left browsing
rail beside the current results, including on phones. Stories and Creators
offer Browse, Genres and Rankings; Codex offers Characters, Items and Rankings.
Stories / Creators / Codex / Lore are four equal-width destinations, with icons
above labels on phones. Card columns follow their available panel width. The
prototype format selector and catalogue search have been removed; Genre sits
beside All / My updates inside the results panel and stacks on narrow screens.

| Shelf | What it shows |
| --- | --- |
| Header and navigation | Discover, followed by Stories / Creators / Codex / Lore as native links |
| Section controls | All / My updates and Genre together outside Lore; filters reset on destination changes |
| Stories | Catalogue first, then New Chapters ordered by time and Fate Survival; tracked stories in My updates |
| Creators | Host-supplied creators expanding to their story cards; followed creators in My updates |
| Codex | Characters and Items only; expandable entries with descriptions and source-story cards; tracked entries in My updates |
| Genres | Cover-backed tiles for Stories or Creators, counting the current feed; selecting a tile opens that genre's catalogue |
| Heavenly Rankings | A separate overall view for stories, creators, characters or items; genres preserve original ranks; returning to Browse restores its feed |
| Events | Themed announcements with their own Discover tab and address |
| Lore | Directly opens the encyclopedia: 398 terms with alias search, a category rail, localized articles and Write it as with Copy on every term; no genres or rankings |

NovelExpanded (`src/novel-expanded/DiscoverPage.tsx`) shows only the app's published
stories. Empty catalogues have an explicit empty state. Releases, creator/Codex
public projections, follows and ranking boards are not connected in the app.
The existing Workshop at `?preview=discover` runs the full `NovelExpandedApp` host, including the working Familiar, profile
actions, language/music preferences and sound controls, injecting its sample catalogue from `src/workshop/previews/discover/previewData.ts`.
Its iframe uses the same feature route with `canvas=1`; samples and sample-opening
feedback never enter the app's import graph. No `reference/` folder.

`DiscoverEncyclopedia` uses that same package entry; the old doorway has been
replaced by the Lore navigation link. The host supplies URLs, navigation and existing profile language/Reading
Mode defaults; the encyclopedia owns its catalogue and localized copy.
`shared/loreCatalogue.ts` holds the curated core's permanent IDs, aliases and
original scripts, and loads the rest on demand; `shared/loreEnglish.ts` is the
curated core's English editorial reference; `shared/lore-locales/` holds its
definitions loaded on demand for the existing supported languages.
`shared/lore-glossary/` is generated from SENSEI's master glossary
(`docs/lore/master-glossary.json`, `node scripts/buildLoreGlossary.mjs`):
`terms.json` and one `renderings/<language>.json` per language, each loaded
only when Lore needs it. `shared/loreInterfaceCopy.ts` holds interface and
category copy.

The directory and articles live under Discover's `lore` query parameter, with
`q` and `category` retained on article navigation. Local language/mode overrides
last for the visit. No story Codex, generation, account or persistence system
is added. The Workshop iframe shares the app's real browser profile settings,
while its story, creator and Codex directories and follows use isolated Workshop samples.
Lore's My updates explicitly says term tracking is not available; it never
fabricates a personal term list. See the direction document for
mode behavior and translation-review limits.

## History

- **2026-11-17:** Gave Events its own Discover tab with the existing announcements.

- **2026-11-17** — Removed the prototype format selector and catalogue search,
  fitted the four destination tabs to phone widths, and moved Genre beside the
  feed controls. Events moved from Home into Rankings. The app now browses its
  published stories; sample stories, directories, follows, releases, rankings and
  sample-opening notices live only in Workshop, using the same page and shell.

- **2026-10-30 (Lore as a translator's reference)** — Loaded SENSEI's master
  glossary into Lore: 398 terms in eleven categories, with permanent ids that
  future user versions attach to. Every term shows Write it as, in the reading
  language, with a Copy button, and the directory has Copy all; the copied
  lines paste into a translation skill. Removed the per-category genre notes
  and the "In the genre" article section; the scope line covers them.

- **2026-10-26 (hierarchy)** — Put the medium first and section navigation below
  it: choose Novel, Manga, Game or Video, then Stories, Creators, Codex or Lore.

- **2026-10-26 (medium switcher)** — Moved Events into Home's owner and replaced
  its Discover position with the four-medium switcher. Medium URLs preserve
  selection across sections and reload; all source-story projections respect
  the medium, while Lore remains a shared reference.
- **2026-10-26 (browsing rail)** — Kept the four top destinations and moved
  browsing choices into a left rail. Added genre tiles and dedicated rankings,
  put the story catalogue first, condensed the header and Events, and retained
  the existing encyclopedia as Lore. No media-switching control is added.
- **2026-10-26 (navigation)** — Added Stories / Creators / Codex / Lore navigation,
  section-scoped feeds and genre filters, character/item Codex browsing, relevant
  ranking boards, and a compact Events strip near the top. Lore links directly
  to the encyclopedia; the existing Workshop loads the same app routes.
- **2026-10-26** — Added the Eastern Fantasy Encyclopedia inside Discover:
  36 core terms, six categories, original scripts, alias-aware search, linked
  articles, all existing reading languages and Reading Mode defaults.
- **2026-10-20** — Structure first: the page's sections, with sample worlds in the
  app, at phone, tablet and laptop sizes.
- **2026-10-20 (later)** — Store-front hierarchy: Featured at the top, then one
  full-width shelf after another. Fate Survival is introduced by what draws readers
  to it, a chapter-by-chapter narrative whose choices carry consequences.

- **2026-10-25:** Chapter and ranking rows now use WorldCardMenu from the World Card family; featured cards use a full phone shelf slot and the shared responsive cover sizing.
- **2026-10-29** — Discover wears the Library's look (`look.css`): violet glass
  chrome and outer panels, black controls, the shared artwork and the gold rims on
  its medium switcher and Fate section. Cover cards keep the World Card's own edge,
  with no rim: the catalogue is the public shelf.
