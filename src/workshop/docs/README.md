# NovelExpanded Docs

Workshop-owned reference surface, created 2026-09-25 and last updated
2026-11-05. This is the **NovelExpanded Docs** workspace under Systems, focused on SEN and
NovelExpanded, not a portable SEN/Library feature or an Original /
Development preview. The visual reference is the supplied Google API docs
screenshots: topic navigation, search, and a readable article. SEIHouse's existing
Workshop colors and typography are retained. No production source is imported.

Content stays within SEN and NovelExpanded concepts. The SEIHouse entry alone explains
the broader company context and SEA; other topics do not cover albums or SEA.

Naming rule for all content here: **NovelExpanded** is the product's brand name,
"expanded novels" in lower case is the format, and **Library** names only the code
lane and the `@seihouse/library` package — never the product in reader-facing prose.
The retired name **Celestial Library** appears in exactly one place, the NovelExpanded
entry, which records that it is retired; it also survives as a search alias there so
the old vocabulary lands on the correction. `Celestial Store` is a separate, current
name and is untouched.

- Open `?preview=novel-expanded-docs`; individual entries use
  `?preview=novel-expanded-docs&doc=arc-goal`. Older `?tab=docs` links continue
  to open the same workspace.
- Desktop has a persistent, independently scrolling topic sidebar. Phones and
  tablets use the existing `@seihouse/ui` drawer with focus trapping, Escape,
  outside dismissal, scroll lock, and focus return.
- Each category header folds or opens its child topics in the desktop sidebar,
  mobile drawer, and overview. Groups start collapsed, and disclosure state is
  shared across those views.
- The content lives in `src/library/docs/catalog.ts`, published as
  `@seihouse/library/docs`, and its shape and reading in SEIHouse Front Desk's
  `@seihouse/front-desk/docs-knowledge`. This folder's `catalog.ts` holds only the
  Workshop's own part: the preview URL a topic is reached at, and the lookup
  bound to NovelExpanded's catalog. The topic index comes from the Development
  product-term audit. Aliases are search keywords, **not declarations that two
  concepts are equivalent**.
- **The page is no longer the only reader.** The Familiar is grounded in the same
  catalog and may say nothing it does not contain, so an entry written here is
  spoken to readers. It is given the topic names and looks an entry up when it
  needs one, rather than carrying the catalog in every exchange
  ([SEIHouse Front Desk](../../front-desk/README.md#the-docs-look-up)).
- Add `definition`, `howItFits`, and optional `related` topic IDs to an existing
  entry when its meaning is confirmed; unfilled topics show placeholders.
  Search includes explanation text automatically. Do not add a second entry,
  revision selector, historical definition, or dated model roster.
- Product & people, Story, and Packages have current explanations; Media Loadout
  explains Media Packs in its own category. Other terms remain unfilled until
  reviewed. SPP Manifest belongs within SPP, and the code/content package split
  belongs in the Packages overview rather than separate topic pages.
- No database, authentication, generated content, external requests, local
  storage, package exports, or production transfer is introduced. URL state is
  owned by `NovelExpandedDocsWorkspace`; browser Back/Forward restores topics.
- The existing preview Archive remains on other Workshop tabs, never in NovelExpanded Docs.

History:

- 2026-09-25 created; 2026-09-27 content pass.
- 2026-11-05 the catalog left the Workshop. Its words moved to
  `src/library/docs/catalog.ts` (Library) and its shape and lookup to
  `src/components/docs-knowledge/` (SEN), because the Familiar depends on it at
  runtime and the Workshop is a workbench. The page reads the same source it
  always did and is unchanged for a reader.
- 2026-11-08 the shape and lookup moved again, into SEIHouse Front Desk
  (`src/front-desk/core/docsKnowledge.ts`, `@seihouse/front-desk/docs-knowledge`),
  with the rest of the Familiar's system. Unchanged for a reader.
- 2026-11-05 retired the Celestial Library name. The single Library entry split into
  **NovelExpanded** (the product, new id `novel-expanded`) and **Library** (the code
  lane, keeping id `library`, so existing `&doc=library` links still resolve). Product
  & people and Packages prose reworded to match. No package name, export, or
  Celestial Store naming changed.

Validation: `npm run test:workshop`, `npm run typecheck`, `npm run build`, and
`npm run check:package-boundaries`. Browser checks should cover direct URLs,
search/clear/no results, topic links and Back/Forward, keyboard tab navigation,
the mobile drawer and its focus behavior, and mobile/tablet/desktop overflow.
