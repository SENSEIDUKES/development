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
| Featured | The host's featured worlds on Feature cards |
| New Chapters | All, or My updates (tracked series): newest first, in columns of three rows |
| Fate Survival | An editorial feature: chapter-by-chapter narrative with consequences, then its World Cards |
| Heavenly Rankings | One board at a time, numbered in the host's order; a board without worlds opens soon |
| Events | Wide editorial cards |
| Browse by Genre | Picture tiles that filter the World Card grid beneath them |

NovelExpanded (`src/novel-expanded/DiscoverPage.tsx`) shows it with sample worlds
while its look and feel is refined. The Workshop previews that page at
`?preview=discover`. New feature: no `reference/` folder.

## History

- **2026-10-20** — Structure first: the page's sections, with sample worlds in the
  app, at phone, tablet and laptop sizes.
- **2026-10-20 (later)** — Store-front hierarchy: Featured at the top, then one
  full-width shelf after another. Fate Survival is introduced by what draws readers
  to it, a chapter-by-chapter narrative whose choices carry consequences.
