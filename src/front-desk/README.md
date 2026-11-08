# SEIHouse Front Desk

An app's front desk in one character: help for the page you are on, guides that
play while you follow along, actions it always asks before taking, "Take me back",
look-ups that never spoil, and the free browser voice, typing and live talk. It is
built first for the people who cannot, or would rather not, work a screen: the
reader in a hospital bed, the older reader, the factory worker with busy hands.

SENSEI is open-sourcing it as **SEIHouse Front Desk** (`@seihouse/front-desk`).
Novel Expanded calls its character **the Familiar**; SEA will put its own character
(the vocal director) on the same desk. The plan is [`docs/front-desk-plan.md`](../../docs/front-desk-plan.md).

## Where it sits

Front Desk is shared SEIHouse infrastructure, beneath SEN and the Library like the
UI kit. **It imports nothing from SEN, the Library or any app.** SEN and the
Library may use it, only through its package names. `npm run check:package-boundaries`
fails with `FRONT_DESK_BOUNDARY` if a Front Desk file reaches past that line, and
the package smoke test installs it alone and runs it on a host's own docs and actions.

| Folder | What it holds |
| --- | --- |
| `core/` | `controller.ts` (modes, proposals it confirms before acting, "Take me back", look-ups, spoken and typed commands, live talk calls, the context a page hands it), `spokenCodes.ts` (codes on screen, with the host's letters), `docsKnowledge.ts` (the docs catalog shape and its look-up) |
| `card/` | `FrontDesk.tsx` (the provider and the card: modes, the media spot where guides play, the bottom bar of quick actions by the microphone), `GuideView.tsx`, `Clip.tsx`, `Greeting.tsx`, `frontDesk.css` |
| `engines/` | The free browser voice, the wake word, and live talk: one engine with a translator each for Gemini, OpenAI and the OpenAI Realtime protocol (ElevenLabs) |

Published entries are listed in [`src/package/front-desk/README.md`](../package/front-desk/README.md).

## What a host hands it

- **The character:** its name and description; on the greeting, its `face` and
  where it stands on the page (`perch`).
- **Each page's place** (`useFrontDeskContext`): title, topics, actions and hint,
  and optionally `page`, `place` (where the reader is, in words) and `knowledge`
  (a catalog it can look up, such as a story's Codex and recaps).
- **`setup`** (`FrontDeskSetup`): the app's docs, its action policy (which actions
  each page may offer, in what order, how many lead, and which only go somewhere),
  the letters of its on-screen codes, and its wording.
- **Engines:** a `FrontDeskVoice` (the browser voice, or its own, with `play` for
  recorded lines on its own player), live talk and a wake word with its `wakeWord`.
  Live talk calls the host's server route (`/api/familiar-live` unless named) with
  the host's own `accessToken`.
- **`renderCode`:** how a code's badge looks on a tile.

Novel Expanded hands all of this over in one place, `FamiliarFrontDesk`
(`src/library/familiars/FamiliarFrontDesk.tsx`), with its setup in
`src/library/familiars/frontDeskSetup.ts`.

## Not yet separated (step 2)

- The card's CSS classes, `data-familiar-*` attributes and a few labels ("Talk to
  Familiar") still use the first host's word. Tests and browser checks rely on them.
- The live-talk wire protocol still names the character `familiar` (the brief's
  `familiar` and the speaker `'familiar'`), shared with `src/server/familiar-live/`,
  which stays host code until it moves.
- The controller's tests run on Novel Expanded's setup (`familiarFrontDeskSetup`).
- `@seihouse/ui` (the card's scrollbar) is a peer; step 2 decides whether the open
  package keeps it.

## The docs look-up

A structured topic catalog a host writes, and the look-up a grounded companion
reads it with. Front Desk owns the shape and the reading; it never owns the words.

The NovelExpanded Docs began as a page people read. They are now also the
Familiar's whole permitted knowledge: it is told these are its only facts, that it
may never invent beyond them, and that it must say plainly when it does not know.

**The reading is separate from the words.** A host supplies the catalog;
Front Desk defines `DocsTopic`, `DocsCategory` and `DocsCatalog` and reads any
catalog shaped that way. NovelExpanded's own words live in
`src/library/docs/catalog.ts`, behind `@seihouse/library/docs`.

**The companion is given an index, not the catalog.** A live instruction is fixed
when the connection opens, so a companion that carries its whole knowledge pays for
all of it on every exchange. `docsIndex` gives it the names; `lookUpDocs` fetches
the words when it asks. Cost moves from per-utterance to per-question.

| Export | What it does |
| --- | --- |
| `DocsTopic`, `DocsCategory`, `DocsCatalog` | The shape a host writes its docs in. `definition`/`howItFits` are absent until a term's meaning is confirmed. |
| `docsIndex` | The names of explained topics, with their categories: what a companion is told exists. Never an `unlisted` category's. |
| `lookUpDocs` | What the catalog says about a question, named matches first, at most `DOCS_LOOKUP_LIMIT`. Empty when nothing was written about it. |
| `docsTopicText` | One entry as a companion reads it back. |
| `searchDocs`, `findDocsTopic`, `docsTopicsOf`, `docsTopicExplained` | The reading a docs page does. |

An empty `lookUpDocs` result is the honest answer that the docs do not cover the
question. No catalog content, no React, no storage, no network. Consumers: the
NovelExpanded Docs page (`src/workshop/docs/`, `?preview=novel-expanded-docs`), the
controller (device voice and live talk), `src/server/familiar-live/`, and SEN's
`storyKnowledgeOf`, which writes a story's own knowledge in this shape.

## History

- **2026-11-08** SEIHouse Front Desk separated inside the development repository
  (step 1 of [the plan](../../docs/front-desk-plan.md), SENSEI: it is going to be
  open-sourced as its own package). The Familiar's controller
  (`src/library/familiars/helper.ts`), spoken codes, card, guide view, clip and
  greeting (`src/components/familiar/development/`), and the voice, wake word and
  live engines (`src/host/familiar/`) moved here with the docs look-up
  (`src/components/docs-knowledge/`, formerly SEN's `@seihouse/sen/docs-knowledge`).
  What reached into the app became inputs: Novel Expanded's docs, its master action
  list, its code letters N, C and F, its wording, its wake word, recorded lines on
  SEN's player, SEN's code badges, the Familiar's face and where it floats, and the
  owner's saved access token. The package speaks Front Desk (`FrontDeskController`,
  `FrontDeskProvider`, `FrontDeskTalkButton`…); `FamiliarFrontDesk` in the Library
  hands it Novel Expanded's setup, so the app behaves exactly as before. New
  boundary rule `FRONT_DESK_BOUNDARY`, a standalone package smoke test, and
  regression checks for the Model Router, tokens, usage, the voice and live
  engines, the microphone and one voice at a time
  (`src/novel-expanded/frontDeskRegression.test.tsx`).
- **2026-11-06** (docs look-up) A category can be `unlisted`: looked up when asked
  for, never named in the index. The first is a story's spoilers, when the Familiar
  looks the story up (SENSEI: never reveal spoilers unless explicitly asked).
- **2026-11-05** (docs look-up) Created. The docs catalog had become the Familiar's
  knowledge base while still living in `src/workshop/docs/catalog.ts`, which the
  Workshop owns as a workbench. The shape and the reading moved to
  `src/components/docs-knowledge/` under SEN, NovelExpanded's words moved to
  `src/library/docs/catalog.ts` under Library, and the Workshop file kept only its
  preview route. The Familiar stopped carrying the whole catalog in every live
  instruction and began looking entries up.
