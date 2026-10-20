# Discover

The Library's Discover page, Expanded Novels' front door. Direction:
[`docs/discover-page.md`](../../../docs/discover-page.md).

`Discover` (`@seihouse/library/discover`) draws the page over host-supplied data:
worlds (`HomeWorld`, shown on the shared `WorldCard`), releases, tracked series,
Fate Survival worlds, Heavenly Rankings boards and Events. It never ranks or
recommends: Latest Releases orders by release time alone. Every world opens
through the host's `onOpenWorld`.

| Section | What it shows |
| --- | --- |
| Header | Title and a search across the whole page (title, creator, genre, tags) |
| Latest Releases | All releases, newest first, or My updates (tracked series only); eight at a time |
| Fate Survival | Its own band of World Cards, right after the feed |
| Browse worlds | Genre chips over a World Card grid |
| Heavenly Rankings, Events | Tiles beside the feed on laptops, last on phones and tablets; boards show Soon |

NovelExpanded (`src/novel-expanded/DiscoverPage.tsx`) shows it with sample worlds
while its look and feel is refined. The Workshop previews that page at
`?preview=discover`. New feature: no `reference/` folder.

## History

- **2026-10-20** — Structure first: the page's sections, with sample worlds in the
  app, at phone, tablet and laptop sizes.
