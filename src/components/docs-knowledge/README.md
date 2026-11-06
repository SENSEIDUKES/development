# Docs Knowledge

A structured topic catalog a host writes, and the lookup a grounded companion
reads it with. SEN owns the shape and the reading; it never owns the words.

## Why it exists

The NovelExpanded Docs began as a page people read. They are now also the
Familiar's entire permitted knowledge: the Familiar is told these are its only
facts, that it may never invent beyond them, and that it must say plainly when
it does not know. That makes the catalog a runtime dependency of a product
feature, not only a reference surface.

Two things follow, and this folder is both of them.

**The reading is separate from the words.** A publisher embedding SEN replaces
every term, so the catalog is something a host supplies, never something the
engine contains. SEN defines `DocsTopic`, `DocsCategory` and `DocsCatalog`, and
reads any catalog shaped that way. NovelExpanded's own words live in
`src/library/docs/catalog.ts`, behind `@seihouse/library/docs`.

**The companion is given an index, not the catalog.** A live instruction is
fixed when the connection opens and cannot be rewritten once the reader asks
something, so a companion that carries its whole knowledge pays for all of it on
every exchange, greetings included, and pays more each time an entry is written.
`docsIndex` gives it the names; `lookUpDocs` fetches the words when it asks.
Cost moves from per-utterance to per-question and stops growing with the
catalog.

## What is here

| Export | What it does |
| --- | --- |
| `DocsTopic`, `DocsCategory`, `DocsCatalog` | The shape a host writes its docs in. `definition`/`howItFits` are absent until a term's meaning is confirmed. |
| `docsIndex` | The names of explained topics, with their categories: what a companion is told exists. Never an `unlisted` category's. |
| `lookUpDocs` | What the catalog says about a question, named matches first, at most `DOCS_LOOKUP_LIMIT`. Empty when nothing was written about it. |
| `docsTopicText` | One entry as a companion reads it back. |
| `searchDocs`, `findDocsTopic`, `docsTopicsOf`, `docsTopicExplained` | The reading a docs page does. |

An empty `lookUpDocs` result is a feature: it is the honest answer that the docs
do not cover the question, and it is also the host's record of a question worth
writing an entry for. Nothing here stores that record; the caller decides.

## Boundaries

- No catalog content, no NovelExpanded terms, no branding. Every function takes
  the catalog as an argument.
- No React, no storage, no network. Pure reading over data the host holds.
- Published as `@seihouse/sen/docs-knowledge`. Consumers: the NovelExpanded Docs
  page (`src/workshop/docs/`), and the Familiar's live conversation
  (`src/library/familiars/helper.ts` and `src/server/familiar-live/`), which
  also reads a story's own knowledge in this shape (`storyKnowledgeOf` in
  `src/components/harness-generation/shared/storyKnowledge.ts`).
- No Workshop preview of its own: it has no surface. The docs page it serves is
  at `?preview=novel-expanded-docs`.

## History

- **2026-11-05** Created. The docs catalog had become the Familiar's knowledge
  base while still living in `src/workshop/docs/catalog.ts`, which the Workshop
  owns as a workbench; `check:app` did not catch it because the Familiar's
  prompt is server code and that guard walks the client graph. The shape and the
  reading moved here under SEN, NovelExpanded's words moved to
  `src/library/docs/catalog.ts` under Library, and the Workshop file kept only
  its preview route. In the same change the Familiar stopped carrying the whole
  catalog in every live instruction and began looking entries up.
- **2026-11-06** A category can be `unlisted`: looked up when asked for, never
  named in the index. The first is a story's spoilers, when the Familiar looks
  the story up (SENSEI: never reveal spoilers unless explicitly asked).
