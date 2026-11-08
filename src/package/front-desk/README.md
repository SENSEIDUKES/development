# `@seihouse/front-desk`

SEIHouse Front Desk: an app's front desk in one character. It is shared SEIHouse
infrastructure beneath SEN and the Library, and will be open source under MPL-2.0.
Novel Expanded calls its character the Familiar; SEA will have its own.

It imports nothing from `@seihouse/sen`, `@seihouse/library` or any app. SEN and
the Library may use it, only through its package names. `npm run check:package-boundaries`
fails on `FRONT_DESK_BOUNDARY` if any Front Desk file reaches past that line.

**0.1.0 (2026-11-08):** First version, separated from the Library's Familiar
inside the development repository (step 1). It moves to its own repository in step 2.

## Entries

| Entry | What it holds |
| --- | --- |
| `@seihouse/front-desk` | `FrontDeskController` (modes, proposals it confirms before acting, "Take me back", look-ups that hold spoilers back, typed and spoken commands, live talk calls), `composeFrontDeskContext` and `FrontDeskActionPolicy`, `FrontDeskSetup` and `FrontDeskWording`, spoken codes (`parseSpokenCode`, `SpokenCodeWords`), and the card: `FrontDeskProvider`, `FrontDeskTalkButton`, `useFrontDeskContext`, `useFrontDeskInUse`, `useFrontDeskReadAloud`, `useFrontDeskAvailable`, `FrontDeskGuideView`, `FrontDeskClip`, `FrontDeskGreeting` |
| `@seihouse/front-desk/docs-knowledge` | The docs catalog shape and its look-up: `DocsCatalog`, `DocsCategory`, `DocsTopic`, `lookUpDocs`, `docsIndex`, `searchDocs`. A host fills it with its own docs; SEN's story knowledge produces a catalog of this shape. |
| `@seihouse/front-desk/engines` | The free browser voice (`createBrowserVoice`), the wake word (`createWakeWord`), and live talk engines for Gemini (`createGeminiLive`), OpenAI (`createOpenAiLive`) and the OpenAI Realtime protocol on ElevenLabs (`createRealtimeLive`), on one `createLiveEngine` |
| `./styles.css` | The card, its media spot, guides, clips and greeting |

## What a host supplies

- **The character:** its name and description (`familiar`), and on the greeting its
  `face` and where it stands (`perch`).
- **Each page's place:** `useFrontDeskContext` with its title, topics, actions, hint,
  and optionally `page`, `place` and `knowledge` (a catalog it can look up).
- **`setup`:** the app's docs, its action policy (which actions each page may offer,
  in what order, and which only go somewhere), its code letters and its wording.
- **Engines:** a `FrontDeskVoice` (the browser voice, or its own), optionally live talk
  and a wake word with its `wakeWord`. Live talk calls the host's server route
  (`/api/familiar-live` unless named) with the host's `accessToken`.
- **Code badges:** `renderCode`, or a plain badge.

## Peers

React and React DOM 19, `lucide-react`, `react-focus-lock` and `@seihouse/ui` (the card's
scrollbar). Whether the open-source package keeps `@seihouse/ui` is decided in step 2.
