# Model Router

Server-side catalog that routes implemented generation models to their provider,
grouped by capability. Opened from the Model Router gear in the Workshop header
and on every preview (`src/workshop/ModelRouterSettings.tsx`); the old
`?preview=model-router` page is archived but still reachable.

- **Created:** 2026-09-23
- **Last Workshop update:** 2026-10-04
- **Last source comparison:** 2026-09-23 (DEV-native; no production counterpart)
- **Status:** active (gear); Systems card archived; owner `deferred` (server/host infrastructure, in no package)

## Capabilities

| Capability | Providers | Consumers |
| --- | --- | --- |
| Chapters | Gemini, OpenRouter | Harness Generation, Chapter Generation, Story Seed Blueprint, Reader Translation |
| Images | Gemini, OpenRouter | none yet (catalog only) |
| TTS | ElevenLabs | Codex Voice Quote |
| Audio | Gemini | none yet (catalog only) |
| Video | Gemini | none yet (catalog only) |
| 3D | Tripo AI | none yet (catalog only) |

Model ids carry their route: `google/<model>` → Gemini, `openrouter/<vendor>/<model>`
→ OpenRouter, `eleven_*` → ElevenLabs, and `tripo-*` → Tripo AI.

The audio catalog lists Lyria 3.5 and Lyria 3 Clip Preview. The video catalog lists
Veo 3.1, Veo 3.1 Fast, and Veo 3.1 Lite Preview. The 3D catalog lists Tripo V3.1
and Tripo P1. These entries only describe available provider models; no audio,
video, or 3D generation consumer is connected yet.

## Adding a generation feature

Register it in `GENERATION_CONSUMERS` (and any new provider file in
`PROVIDER_ADAPTERS`) in `catalog.ts` in the same change. The Router's
"Used by" section reads that list, and `generationConsumers.test.ts` fails on
any model call that is not registered. See AGENTS.md.

## Environment

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Gemini models |
| `OpenRouter-Dev` (or `OPENROUTER_API_KEY`) | OpenRouter chapter models appear once set |
| `OPENROUTER_MODELS` | Extra OpenRouter models, comma-separated (`openai/gpt-5.6-luna`) |
| `OPENROUTER_REASONING_EFFORT` | Optional server fallback reasoning effort for OpenRouter models (the Router's Advanced setting wins; models that send their own default, below, never use it) |
| `HARNESS_GENERATION_MODELS`, `CHAPTER_GENERATION_MODELS` | Models pinned ahead of the catalog |
| `*_DEFAULT_MODEL` | Default model per surface (otherwise Gemini 3.1 Flash Lite) |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_MODEL_ID` | TTS |
| `TRIPO_API_KEY` | Tripo 3D model provider status |

`GET /api/model-router` returns the read-only status (never key values).

## Files

- `catalog.ts` — models, providers, routing and key resolution
- `openRouter.ts` — OpenRouter chat-completions call
- `geminiThinking.ts` — maps Router reasoning levels to Gemini `thinkingLevel`
- `status.ts` — capability status for the Workshop
- `vercelHandler.ts` → `api/model-router.js` (built by `scripts/buildModelRouterApi.mjs`)
- Workshop gear and panel: `src/workshop/ModelRouterSettings.tsx`
- Saved chapter-model choice (this browser): `src/host/generation/modelPreference.ts`

## Other apps

Install `@seihouse/library` and import its `./model-router-server` entry from
an app-owned server route. See `src/package/library/README.md` for configuration
and a call example. This folder holds Development's registry, environment
aliases, status endpoint and Workshop-specific OpenRouter attribution. Other
apps supply their own configuration and keep their prompts, auth, UI and saved
work in their own code. Status reports key presence and `implemented`
separately; catalog-only media models are not executable.

## Gemini request settings

Gemini requests use provider-default sampling: the Router never sends
`temperature`, `top_p`/`topP`, or `top_k`/`topK` to Google or to a Gemini model
through OpenRouter. The shared request's `temperature` remains available for
other providers. Gemini already uses `thinkingLevel`, never `thinkingBudget`;
the provider boundary checks the chosen level against the model catalog; an
unsupported level falls back to the model's sent default (low), and an unknown
model gets none, so the provider default applies.
OpenRouter receives supported Gemini choices as `reasoning.effort`.

Supported levels follow Google's [thinking documentation](https://ai.google.dev/gemini-api/docs/thinking).
Prompts, response schemas, token limits, timeouts, model choices, and saved work
are unchanged.

## Workshop history

- 2026-10-06 — Low is the default reasoning level. In the owner's tests across five models, low wrote chapters as well as higher levels and far faster, so every model offering it now sends low when the reader chooses no level (`ModelReasoning.sendDefault`): Gemini 3.8, 3.7 and 3.5 Flash, Gemini 3.1 Pro Preview (was its own default, high), GPT-6 Luna and Luna Pro, and Gemini 3.8 Flash through OpenRouter. Models already lower keep their level (the Flash Lite models think at minimal on their own; Qwen and DeepSeek are sent none; GLM was already sent low), and MiniMax and Trinity have no levels to send. A reader's own choice in Advanced settings still wins. The Story Seed Blueprint follows the chapter model, so it is sent low too.
- 2026-10-06 — Removed custom Gemini sampling from the Google and OpenRouter
  routes ahead of Google's parameter deprecation. Thinking levels were already
  in use; both routes now check Gemini levels at the provider boundary. Other
  providers keep their existing sampling and reasoning settings.
- 2026-10-04 — The Story Seed Blueprint follows the Router (`modelChoice:
  'router'`). It always used the server's Blueprint model
  (`STORY_SEED_BLUEPRINT_MODEL`, else the chapter default: Gemini 3.1 Flash
  Lite through Google), so a chapter model chosen in the Router, such as one on
  OpenRouter, never wrote the Blueprint. The request now carries the chosen
  chapter model and its reasoning level; the server accepts any model chapters
  may use and refuses others, and a request without one keeps the server's
  Blueprint model. A Blueprint has a chapter's deadline (170 seconds), says
  so when the model was still writing at it, and logs
  `[story-seed-blueprint] <model> answered in <N>s`.
- 2026-10-04 — Chapter generation restored for the new models. GLM 5.3 Flash,
  Qwen 3.8 Flash and DeepSeek V4.1 Flash, on their own reasoning defaults, were
  still writing at the HARNESS's 170-second deadline; the OpenRouter adapter
  swallowed the cut-off reply and reported "returned an empty response". On a
  preview with the real key, the levels below each finished a full chapter, so
  the catalog now sends them unless the reader chooses another
  (`ModelReasoning.sendDefault`): GLM low (OpenRouter refuses `none`,
  "Reasoning is mandatory"), Qwen none (25–78 s), DeepSeek none (17–46 s).
  At low, GLM still ran past the deadline once in two, because OpenRouter
  favoured its cheapest providers, so GLM also routes to its fastest one
  (`RoutedModel.fastestProvider`, OpenRouter's `provider.sort: throughput`):
  two chapters in 17 s and 25 s, both saved. MiniMax
  M2.7 (74 s), Trinity Large Thinking (9 s) and Gemini 3.8 Flash finish on
  their own defaults and are unchanged; so are every Gemini model, GPT-6 Luna
  and Luna Pro, saved choices and the default. A reply still being written at
  the deadline is now reported as a timeout, and an empty reply names its
  provider, finish reason and token counts.
- 2026-10-04 — Added GLM 5.3 Flash, Qwen 3.8 Flash, MiniMax M2.7, Trinity
  Large Thinking, DeepSeek V4.1 Flash, and Gemini 3.8 Flash to Chapters →
  OpenRouter in the shared `src/library/model-router/catalog.ts` catalog.
  Model IDs were verified against OpenRouter's public `/api/v1/models` catalog.
  GPT-6 Luna and Luna Pro, saved choices, and the default remain unchanged.
  New entries use provider-default reasoning unless tunable levels are already
  established for the model (Gemini 3.8 Flash).
- 2026-09-23 — Added Audio, Video, and 3D catalog tabs for Gemini Lyria, Gemini Veo,
  and Tripo models. These capabilities are informational only; no generation
  consumers or provider calls were added.
- 2026-09-23 — Created: shared chapter catalog with current Gemini models,
  OpenRouter provider (GPT-6 Luna), image and TTS catalogs, status endpoint
  and Workshop page.
- 2026-09-23 — Chapter models are selectable from a Workshop-wide gear. The
  choice is saved in the browser and drives Harness Generation and Chapter
  Generation. The Systems card was archived in favor of the gear.
- 2026-09-23 — Compact, provider-first panel: pick a capability, then a
  provider, then a model. "Used by" now comes from the `GENERATION_CONSUMERS`
  registry, enforced by a repository scan test and an AGENTS.md rule.
- 2026-09-23 — Advanced settings: a sliders button tunes the selected chapter
  model's reasoning level (levels per model live in `CHAPTER_MODELS`). The
  level is saved per model in the browser, sent with Harness and Chapter
  Generation requests, checked by `resolveReasoningLevel`, and passed to Gemini
  as `thinkingLevel` or to OpenRouter as `reasoning.effort`.
