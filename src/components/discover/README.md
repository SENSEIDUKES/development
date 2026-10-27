# Discover

The Library's Discover page, Expanded Novels' front door. Direction:
[`docs/discover-page.md`](../../../docs/discover-page.md).

`Discover` (`@seihouse/library/discover`) draws the page over host-supplied data:
worlds (`HomeWorld`, shown on the shared `WorldCard`), releases, tracked series,
Fate Survival worlds, Heavenly Rankings boards and Events. It never ranks or
recommends: New Chapters orders by release time alone, and Rankings keep the host's order. Every world opens
through the host's `onOpenWorld`.

The page reads like a store front (the owner's direction, 2026-10-20: Apple's
approach): a large title, then full-width shelves, each under one hairline and
one heading, whose content pages sideways instead of stacking into a long column.

| Shelf | What it shows |
| --- | --- |
| Header | Large title, a search across the page (title, creator, genre, tags), the host's note |
| Eastern Fantasy Encyclopedia | A doorway to the genre's lore directory, with alias search and localized term articles |
| Featured | The host's featured worlds on Feature cards |
| New Chapters | All, or My updates (tracked series): newest first, in columns of three rows |
| Fate Survival | An editorial feature: chapter-by-chapter narrative with consequences, then its World Cards |
| Heavenly Rankings | One board at a time, numbered in the host's order; a board without worlds opens soon |
| Events | Wide editorial cards |
| Browse by Genre | Picture tiles that filter the World Card grid beneath them |

NovelExpanded (`src/novel-expanded/DiscoverPage.tsx`) shows it with sample worlds
while its look and feel is refined. The Workshop previews that page at
`?preview=discover`. New feature: no `reference/` folder.

`DiscoverEncyclopedia` and `DiscoverEncyclopediaEntry` use that same package
entry. The host supplies URLs, navigation and existing profile language/Reading
Mode defaults; the encyclopedia owns its 36-term catalogue and localized copy.
`shared/loreCatalogue.ts` holds stable IDs, aliases and original scripts;
`shared/loreEnglish.ts` is the English editorial reference; `shared/lore-locales/`
holds definitions loaded on demand for the existing supported languages.
`shared/loreInterfaceCopy.ts` holds their interface and category copy.

The directory and articles live under Discover's `lore` query parameter, with
`q` and `category` retained on article navigation. Local language/mode overrides
last for the visit. No story Codex, generation, account or persistence system
is added. The Workshop iframe shares the app's real browser profile settings,
while its world shelves still show samples. See the direction document for
mode behavior and translation-review limits.

## History

- **2026-10-26** — Added the Eastern Fantasy Encyclopedia inside Discover:
  36 core terms, six categories, original scripts, alias-aware search, linked
  articles, all existing reading languages and Reading Mode defaults.
- **2026-10-20** — Structure first: the page's sections, with sample worlds in the
  app, at phone, tablet and laptop sizes.
- **2026-10-20 (later)** — Store-front hierarchy: Featured at the top, then one
  full-width shelf after another. Fate Survival is introduced by what draws readers
  to it, a chapter-by-chapter narrative whose choices carry consequences.

- **2026-10-25:** Chapter and ranking rows now use WorldCardMenu from the World Card family; featured cards use a full phone shelf slot and the shared responsive cover sizing.
