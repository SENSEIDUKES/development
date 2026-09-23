# Model Router

Server-side catalog that routes every generation model to its provider,
grouped by capability. Opened from the Model Router gear in the Workshop header
and on every preview (`src/workshop/ModelRouterSettings.tsx`); the old
`?preview=model-router` page is archived but still reachable.

- **Created:** 2026-09-23
- **Last Workshop update:** 2026-09-23
- **Last source comparison:** 2026-09-23 (DEV-native; no production counterpart)
- **Status:** active (gear); Systems card archived; owner `deferred` (server/host infrastructure, in no package)

## Capabilities

| Capability | Providers | Consumers |
| --- | --- | --- |
| Chapters | Gemini, OpenRouter | Harness Generation, Chapter Generation, Story Seed Blueprint, Reader Translation |
| Images | Gemini, OpenRouter | none yet (catalog only) |
| TTS | ElevenLabs | Codex Voice Quote |

Model ids carry their route: `google/gemini-*` → Gemini, `openrouter/<vendor>/<model>`
→ OpenRouter, `eleven_*` → ElevenLabs.

## Environment

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Gemini models |
| `OpenRouter-Dev` (or `OPENROUTER_API_KEY`) | OpenRouter models (GPT-6 Luna, GPT-6 Luna Pro appear once set) |
| `OPENROUTER_MODELS` | Extra OpenRouter models, comma-separated (`openai/gpt-5.6-luna`) |
| `OPENROUTER_REASONING_EFFORT` | Optional reasoning effort for reasoning models |
| `HARNESS_GENERATION_MODELS`, `CHAPTER_GENERATION_MODELS` | Models pinned ahead of the catalog |
| `*_DEFAULT_MODEL` | Default model per surface (otherwise Gemini 3.1 Flash Lite) |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_MODEL_ID` | TTS |

`GET /api/model-router` returns the read-only status (never key values).

## Files

- `catalog.ts` — models, providers, routing and key resolution
- `openRouter.ts` — OpenRouter chat-completions call
- `status.ts` — capability status for the Workshop
- `vercelHandler.ts` → `api/model-router.js` (built by `scripts/buildModelRouterApi.mjs`)
- Workshop gear and panel: `src/workshop/ModelRouterSettings.tsx`
- Saved chapter-model choice (this browser): `src/host/generation/modelPreference.ts`

## Transfer

Copy this folder plus the provider changes in `src/server/harness-generation/`,
`src/server/chapter-generation/`, `src/server/story-seed-blueprint/` and
`src/server/reader-translation/`. Leave the Workshop view behind.

## Workshop history

- 2026-09-23 — Created: shared chapter catalog with current Gemini models,
  OpenRouter provider (GPT-6 Luna), image and TTS catalogs, status endpoint
  and Workshop page.
- 2026-09-23 — Chapter models are selectable from a Workshop-wide gear. The
  choice is saved in the browser and drives Harness Generation and Chapter
  Generation. The Systems card was archived in favor of the gear.
