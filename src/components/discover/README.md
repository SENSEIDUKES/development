# Discover

The Library's Discover page, Expanded Novels' front door. Direction:
[`docs/discover-page.md`](../../../docs/discover-page.md).

`Discover` (`@seihouse/library/discover`) draws the page over host-supplied data:
worlds (`HomeWorld`, shown on the shared `WorldCard`), creator and Codex directory
projections, releases, section-specific follows, Fate Survival worlds,
Heavenly Rankings boards and Events. It never ranks or
recommends: New Chapters orders by release time alone, and Rankings keep the host's order. Every world opens
through the host's `onOpenWorld`.

The page reads like a store front (the owner's direction, 2026-10-20: Apple's
approach): a large title, then full-width shelves, each under one hairline and
one heading, whose content pages sideways instead of stacking into a long column.

| Shelf | What it shows |
| --- | --- |
| Header and navigation | Discover, then Stories / Creators / Codex / Lore as native links with host navigation |
| Events | Compact horizontal strip below navigation, across all destinations |
| Section controls | All / My updates, with search and Genre outside Lore; filters reset on destination changes |
| Stories | Featured, complete catalogue, New Chapters ordered by time, Fate Survival; tracked stories in My updates |
| Creators | Host-supplied creators expanding to their story cards; followed creators in My updates |
| Codex | Characters and Items only; expandable entries with descriptions and source-story cards; tracked entries in My updates |
| Heavenly Rankings | Stories, creators, characters or items, in the host's order; search and genres preserve original ranks; global even in My updates |
| Lore | Directly opens the existing encyclopedia, with alias search, categories and localized articles; no genres or rankings |

NovelExpanded (`src/novel-expanded/DiscoverPage.tsx`) shows it with sample worlds
while its look and feel is refined. The Workshop previews that page at
`?preview=discover`. New feature: no `reference/` folder.

`DiscoverEncyclopedia` uses that same package entry; the old doorway has been
replaced by the Lore navigation link. The host supplies URLs, navigation and existing profile language/Reading
Mode defaults; the encyclopedia owns its 36-term catalogue and localized copy.
`shared/loreCatalogue.ts` holds stable IDs, aliases and original scripts;
`shared/loreEnglish.ts` is the English editorial reference; `shared/lore-locales/`
holds definitions loaded on demand for the existing supported languages.
`shared/loreInterfaceCopy.ts` holds their interface and category copy.

The directory and articles live under Discover's `lore` query parameter, with
`q` and `category` retained on article navigation. Local language/mode overrides
last for the visit. No story Codex, generation, account or persistence system
is added. The Workshop iframe shares the app's real browser profile settings,
while its story, creator and Codex directories and follows still show samples.
Lore's My updates explicitly says term tracking is not available; it never
fabricates a personal term list. See the direction document for
mode behavior and translation-review limits.

## History

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
