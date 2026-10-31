# Model Router

Server-side catalog that routes implemented generation models to their provider,
grouped by capability. Opened from the Model Router gear in the Workshop header
and on every preview (`src/workshop/ModelRouterSettings.tsx`); the old
`?preview=model-router` page is archived but still reachable.

- **Created:** 2026-09-23
- **Last Workshop update:** 2026-10-19
- **Last source comparison:** 2026-09-23 (DEV-native; no production counterpart)
- **Status:** active (gear); Systems card archived; owner `deferred` (server/host infrastructure, in no package)

## Capabilities

| Capability | Providers | Consumers |
| --- | --- | --- |
| Chapters | Gemini, OpenRouter, MiniMax, Anthropic, local LM Studio | Harness Generation, Holdings Fixer, Look Describer, Chapter Tagger (its own choice, else the chapter model), Story Seed Blueprint, Story Spark, Reader Translation |
| Images | Gemini, OpenRouter, MiniMax | Story Cover, Image Lab, Profile Picture |
| TTS | ElevenLabs | Codex Voice Quote |
| Live voice | Gemini | Familiar Live Talk |
| Audio | Gemini | none yet (catalog only) |
| Video | Gemini, MiniMax | No feature yet; MiniMax task adapter implemented, Veo catalog only |
| 3D | Tripo AI | none yet (catalog only) |

Model ids carry their route: `google/<model>` → Gemini, `openrouter/<vendor>/<model>`
→ OpenRouter, `minimax/<model>` → MiniMax, `anthropic/<model>` → Anthropic, `eleven_*` → ElevenLabs, and `tripo-*` → Tripo AI.

The audio catalog lists Lyria 3.5 and Lyria 3 Clip Preview. The video catalog lists
Veo 3.1, Veo 3.1 Fast, and Veo 3.1 Lite Preview. The 3D catalog lists Tripo V3.1
and Tripo P1. Lyria, Veo and Tripo are catalog only. MiniMax video has an
executable task adapter, but no audio, video or 3D feature is connected yet.

## Adding a generation feature

Register it in `GENERATION_CONSUMERS` (and any new provider file in
`PROVIDER_ADAPTERS`) in `catalog.ts` in the same change. The Router's
"Used by" section reads that list, and `generationConsumers.test.ts` fails on
any model call that is not registered. See AGENTS.md.

## Environment

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Gemini models |
| `Minimax` (or `MINIMAX_API_KEY`) | Direct MiniMax writing, image and video requests; the existing Vercel key is `Minimax` |
| `claude_sen` (or `ANTHROPIC_API_KEY`) | Direct Claude writer models; they appear once set |
| `OpenRouter-Dev` (or `OPENROUTER_API_KEY`) | OpenRouter chapter models appear once set |
| `OPENROUTER_MODELS` | Extra OpenRouter models, comma-separated (`openai/gpt-5.6-luna`) |
| `OPENROUTER_REASONING_EFFORT` | Optional server fallback reasoning effort for OpenRouter models (the Router's Advanced setting wins; models that send their own default, below, never use it) |
| `HARNESS_GENERATION_MODELS` | Models pinned ahead of the catalog |
| `*_DEFAULT_MODEL` | Default model per surface (otherwise Gemini 3.1 Flash Lite) |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_MODEL_ID` | TTS |
| `FAMILIAR_LIVE_MODEL`, `FAMILIAR_LIVE_VOICE` | Live voice (default Gemini 3.8 Live, voice Puck); uses `GEMINI_API_KEY` |
| `TRIPO_API_KEY` | Tripo 3D model provider status |

`GET /api/model-router` returns the read-only status (never key values).

## Files

- `catalog.ts` — models, providers, routing and key resolution
- `openRouter.ts` — OpenRouter chat-completions call
- `src/library/model-router/anthropic.ts` — Claude through the official Anthropic SDK
- `src/library/model-router/geminiThinking.ts` — maps Router reasoning levels to Gemini `thinkingLevel`
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
separately; catalog-only media models are not executable. MiniMax video models
are executable through the package server contract even though no video
feature currently consumes them.

## Local (LM Studio)

During `npm run dev`, Chapters includes **Local (LM Studio)** → **Currently
loaded model**. The saved `lmstudio/loaded` choice follows whichever text model
is loaded when generation starts; no model name or API key is configured here.
Start LM Studio's server on port 1234 and keep one text model loaded. Chapters,
arc planning, the Holdings fixer and Story Seed Blueprints use the existing
Router and validation paths.

Requests use `http://localhost:1234/v1/chat/completions` without an Authorization
header. Discovery reads `http://localhost:1234/api/v0/models` (LM Studio 0.3.6+)
to distinguish loaded text models from downloaded and embedding models. The
[OpenAI model list](https://lmstudio.ai/docs/developer/openai-compat/models) may
also list downloaded models when just-in-time loading is enabled; the
[native metadata](https://lmstudio.ai/docs/developer/rest/endpoints) explicitly
reports loaded state. No loaded text model, multiple loaded text models,
connection failures, empty replies, output limits and deadlines report errors;
the Router never loads a model itself or falls back to a cloud provider.

Local inference requires an explicit server opt-in (`localDevelopment: true`)
and a `NODE_ENV=development` runtime with neither `VERCEL` nor `VERCEL_ENV` set.
The Vite development middleware enables it; `npm run preview`, builds and
deployments do not. Production also excludes pinned or saved local selections
from its allowed chapter models. The internal `local-dev` credential marker
only carries permission through existing factories and is never sent to LM
Studio. Generation receipts record the model discovered from LM Studio.

The app's Create page and shared Blueprint client do not ask for a Development
access token when the selected model is `lmstudio/loaded` in a development
build. The Blueprint endpoint independently permits that exception only in
local development for a same-origin browser request. Cloud-provider requests
retain their existing token requirement. A checkout may select local inference
by setting `HARNESS_GENERATION_DEFAULT_MODEL=lmstudio/loaded` in its ignored
`.env.local`; deployed model lists still exclude the local route.
Development's local chapter and Blueprint requests wait up to 15 minutes for
local inference; cloud-provider deadlines stay unchanged. The Blueprint client
waits 20 seconds longer so the server can report its own timeout.

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

## The Chapter Tagger's own choice

The Chapters tab carries a **Chapter Tagger** section: the model that reads
each finished chapter for its tags, and how hard it thinks. By default it is
the chapter's own writer, thinking as little as the model allows. The owner's
experiment (2026-10-29): a cheap model with high reasoning may tag better than
an expensive one with none. The choice is saved in this browser
(`modelPreference.ts`, `tagger`), apart from the chapter model's reasoning
level, so one model can write at one level and tag at another. It reaches the
HARNESS as `HarnessTaggerChoice` (`HarnessGenerationController.setTagger`),
travels on the tag request (`model`, `reasoningLevel`), and the server checks
the level against the model's catalog levels, dropping one the model does not
offer back to its lowest. A tagger model the server no longer offers falls back
to the chapter's writer. The chapter's tagging record names the model that
read it.

## Workshop history

- 2026-10-30 — Claude through OpenRouter now uses the same JSON instructions as
  direct Claude, omits custom sampling, and does not submit the host schema as a
  structured-output grammar. Blueprint bounds such as `minLength`, `maximum`
  and `maxItems` are unsupported by [Claude's grammar](https://platform.claude.com/docs/en/build-with-claude/structured-outputs#json-schema-limitations)
  and can reject the request before generation. The full schema remains in the
  instructions and Blueprint validation still rejects incomplete answers. Other
  OpenRouter models retain their existing sampling and structured-output requests.

- 2026-10-29 — The Chapter Tagger gets its own model and reasoning choice in
  the Chapters tab (above). Until now it read every chapter with the model
  that wrote it, at that model's lowest level.
- 2026-10-29 — Live voice: Gemini 3.8 Live for the Familiar's live talk.
- 2026-10-19 — Connected Claude directly through the official Anthropic SDK:
  Claude Opus 5.5, Sonnet 5.5, Haiku 5.5 and Fable 5.1 in Chapters →
  Anthropic, once `claude_sen` (or `ANTHROPIC_API_KEY`) is set. Chapters, arc
  planning, the Holdings fixer, Look Describer and Blueprints follow the
  existing Router choice. Requests stream; low effort is sent by default
  (thinking is always on, effort sets how much), and the Router's
  temperature is never sent: these models take no custom sampling. The JSON
  schema goes in the instructions, as for MiniMax: the chapter schema's exact
  paragraph count is a constraint Claude's strict JSON outputs refuse. Opus,
  Sonnet and Fable opt into Anthropic's server-side fallback, which reruns a
  policy decline on Anthropic's recommended model in the same call; Haiku has
  none, and a remaining decline is reported as an error. Not yet timed against
  the chapter deadline with the real key. Prices per million tokens in/out:
  Haiku $0.10/$0.50, Sonnet $2/$10, Opus $4/$20, Fable $10/$50.
- 2026-10-19 — MiniMax M3.1 Flash is called by MiniMax's own id,
  `MiniMax-M3.1-Flash`. The catalog listed `MiniMax-M3.1-Flash-Preview`, which
  MiniMax's writer API docs do not list, so M3.1 requests named a model MiniMax
  does not serve. A browser that saved the
  old id needs M3.1 Flash chosen again in the Router. A failed MiniMax reply now
  keeps MiniMax's numeric error code in the server log (never its text).

- 2026-10-14 — Connected MiniMax directly: nine documented writer models
  (M3.1 Flash, M3, M2.7/M2.5/M2.1 and their highspeed variants, M2),
  Image 01 and Image 01 Live, and eleven H3/Hailuo/T2V/I2V/S2V video models.
  Chapters, arc planning, the Holdings fixer and Blueprints follow the existing
  Router choice; covers, Image Lab and profile portraits accept MiniMax images.
  Images return base64 through the existing host storage flow. Image prompts
  must fit MiniMax's 1,500-character limit; Live needs a portrait reference.
  Long cover prompts report the limit without cutting the owner's template or
  story details. MiniMax has no documented native JSON-schema parameter: the
  Router includes the schema in the instructions and host validation remains
  authoritative. Reasoning stays separate from the answer; M3.1 sends low by
  default. Video submission returns a task ID; `queryVideoTask` checks that
  same job and returns its state and temporary download URL. No video UI,
  automatic resubmission, provider fallback or durable video store was added.
  Model access and quota depend on the account's plan. Existing Token Plan
  subscribers retain their benefits; H3 requires eligible M Plan access or
  standard API access. See [MiniMax's plan notice](https://platform.minimax.io/docs/m-plan/token-plan-notice),
  [writer API](https://platform.minimax.io/docs/api-reference/text-openai-api),
  [image API](https://platform.minimax.io/docs/api-reference/image-generation-t2i),
  and [video API](https://platform.minimax.io/docs/api-reference/video-generation-v2-create).
- 2026-10-12 — Added Local (LM Studio) for local development text generation,
  following the loaded model through the existing chapter and Blueprint paths.
  Other providers, their settings and the default model are unchanged.
- 2026-10-12 — Removed the cloud Development-token prerequisite from local
  LM Studio Blueprint testing in Create and the shared client, with a
  same-origin, local-development-only exception at the server boundary.

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
- 2026-10-11 — Added Claude Haiku 5.5 (`openrouter/anthropic/claude-haiku-5.5`)
  to Chapters → OpenRouter for chapter-generation testing. It sends low
  reasoning by default like the other models (levels low, medium, high). The
  ID follows OpenRouter's dotted naming and was not checked against their live
  catalog from the build sandbox. Every other model, saved choices and the
  default are unchanged.
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
