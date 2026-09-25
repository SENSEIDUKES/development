# Workshop Docs

Workshop-owned reference surface, created and updated 2026-09-25. This is a
top-level **Docs** tab, not a portable SEN/Library feature or an Original /
Development preview. The visual reference is the supplied Google API docs
screenshots: topic navigation, search, and a readable article. SEIHouse's existing
Workshop colors and typography are retained. No production source is imported.

- Open `?tab=docs`; individual entries use `?tab=docs&doc=arc-goal`.
- Desktop has a persistent, independently scrolling topic sidebar. Phones and
  tablets use the existing `@seihouse/ui` drawer with focus trapping, Escape,
  outside dismissal, scroll lock, and focus return.
- Each category header folds or opens its child topics in the desktop sidebar,
  mobile drawer, and overview. Groups start collapsed, and disclosure state is
  shared across those views.
- `catalog.ts` is the single content source for navigation, search, and articles.
  The topic index comes from the Development product-term audit. Aliases are
  search keywords, **not declarations that two concepts are equivalent**.
- Definitions are intentionally unfilled pending the product owner's wording.
  Add `definition`, `howItFits`, and `related` topic IDs to the existing entry;
  search includes explanation text automatically. Do not add a second entry,
  revision selector, historical definition, or dated model roster.
- No database, authentication, generated content, external requests, local
  storage, package exports, or production transfer is introduced. URL state is
  owned by `WorkshopHome`; browser Back/Forward restores tabs and topics.
- The existing preview Archive remains on other Workshop tabs, never in Docs.

Validation: `npm run test:workshop`, `npm run typecheck`, `npm run build`, and
`npm run check:package-boundaries`. Browser checks should cover direct URLs,
search/clear/no results, topic links and Back/Forward, keyboard tab navigation,
the mobile drawer and its focus behavior, and mobile/tablet/desktop overflow.
