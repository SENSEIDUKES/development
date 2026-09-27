# NovelExpanded Docs

Workshop-owned reference surface, created 2026-09-25 and last updated
2026-09-27. This is the **NovelExpanded Docs** workspace under Systems, focused on SEN and the
Celestial Library, not a portable SEN/Library feature or an Original /
Development preview. The visual reference is the supplied Google API docs
screenshots: topic navigation, search, and a readable article. SEIHouse's existing
Workshop colors and typography are retained. No production source is imported.

Content stays within SEN and Library concepts. The SEIHouse entry alone explains
the broader company context and SEA; other topics do not cover albums or SEA.

- Open `?preview=novel-expanded-docs`; individual entries use
  `?preview=novel-expanded-docs&doc=arc-goal`. Older `?tab=docs` links continue
  to open the same workspace.
- Desktop has a persistent, independently scrolling topic sidebar. Phones and
  tablets use the existing `@seihouse/ui` drawer with focus trapping, Escape,
  outside dismissal, scroll lock, and focus return.
- Each category header folds or opens its child topics in the desktop sidebar,
  mobile drawer, and overview. Groups start collapsed, and disclosure state is
  shared across those views.
- `catalog.ts` is the single content source for navigation, search, and articles.
  The topic index comes from the Development product-term audit. Aliases are
  search keywords, **not declarations that two concepts are equivalent**.
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

Validation: `npm run test:workshop`, `npm run typecheck`, `npm run build`, and
`npm run check:package-boundaries`. Browser checks should cover direct URLs,
search/clear/no results, topic links and Back/Forward, keyboard tab navigation,
the mobile drawer and its focus behavior, and mobile/tablet/desktop overflow.
