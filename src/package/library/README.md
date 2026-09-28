# `@seihouse/library`

Celestial Library's client-safe product behavior, assembled on the portable
SEN engine and the two UI packages. Library owns SEIHouse users, products,
economy, community and business policy. Authentication enforcement, secrets,
durable ledgers and concrete infrastructure stay in the host/backend.

## Public entries

| Import | Responsibility |
| --- | --- |
| `@seihouse/library` | Common Library exports and version |
| `./presentation` | Library-to-SEN presentation composition and host asset-location provider |
| `./profile` | Cave/Profile behavior, public views, settings, admin host ports |
| `./energy` | Client-safe Energy contracts, read projections and provider |
| `./familiar` | Sprite animation, draggable/resizable companion, minimize/recall, profile selection, and the Familiar account: ownership, Bond Rank cultivated with QI, element mastery, and the Active Elemental Effect (`FamiliarTrainingPanel`, `ElementalEffectPanel`, `FamiliarNameEffect`, `activeNameEffect`) |
| `./celestial-store` | Official Familiar Store page and the reusable `ShopCard`: offer configuration, deterministic daily rotation, and the account port for host-owned ownership and purchases |
| `./cultivation` | Spendable-QI and permanent DAO XP read projections (DAO XP alone sets Cultivator Rank, which only chooses colours), economy standards, and cultivation surfaces |
| `./dao-pillar` | Calendar/reward contracts and server-result-driven UI |
| `./rewards` | Achievements and Mystery Scrolls: reward vocabulary, the achievements client, `AchievementsPanel`, the shared reward reveal (`MysteryScrollReveal`, `RewardRevealCard`), and `useRefreshWhenReplaced` for re-reading balances when a reward lands |
| `./relics` | Fate Survival Relics: contracts, the read client, `FateSurvivalRelicsPanel` and `RelicReveal` |
| `./shell` | Navigation, route models, header/footer and shell orchestration |
| `./home` | Library Home, discovery and story-detail surfaces |
| `./creator-space` | The Create page: Creator Space tiles, the Creator Toolkit preview and the Your worlds row over host-supplied worlds, Energy and destinations |
| `./world-card` | One world in four sizes — Info page, Full discovery card, Compact creator tile and Mini track-sized row — over host-supplied world display data and destinations |
| `./story-seed` | Authenticated Story Bank, Help and branded creation journey; Story Seed Settings own the Story Language and Reading Mode a new story starts with |
| `./generation` | First-party HARNESS workspace composition: the novel page and its Story Settings (Story Language, Reading Mode). HARNESS internals such as CAPA slots show only when a development host sets `showHarnessInternals` |
| `./model-router-server` | Server-only Gemini/OpenRouter text and ElevenLabs speech routing; apps supply credentials, prompts, HTTP policy, and storage |
| `./media` | First-party catalog selection and entitlement contracts |
| `./manifestations` | Celestial manifestation orchestration around Library UI visuals |
| `./styles.css` | Library feature styles |

Profile consumes the Energy, spendable-QI and permanent DAO XP projections; it is not their
authority. DAO Pillar requests today's claim without naming a reward amount. The achievements
client can only open a scroll the cultivator owns, the Relics client only reads, and the Familiar
client asks the server to train, choose a look, or buy at today's price. Every balance,
progression total, reward, role and permission is host-authoritative, and no Familiar effect
grants a boost, multiplier, discount or other advantage.

`LibraryPresentationProvider` composes stateless `@seihouse/library-ui@0.9.0`
visuals over SEN. Concrete CDN and public-directory locations are supplied as
`LibraryAssets`; they are not embedded in the package.

## Server Model Router

Import `@seihouse/library/model-router-server` only in a trusted Node server.
An app owns its API route, authentication, prompt, model allowlist, and saved
work. Pass its server credentials into the router; never serialize them into a
status response or browser code.

```ts
import { createModelRouter } from '@seihouse/library/model-router-server';

const router = createModelRouter({
  credentials: {
    gemini: process.env.GEMINI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    elevenlabs: process.env.ELEVENLABS_API_KEY,
  },
  openRouterAttribution: { referer: 'https://your-app.example', title: 'Your App' },
});

const result = await router.generate({
  capability: 'text', model: 'google/gemini-3.1-flash-lite',
  systemInstruction: appOwnedInstructions, userPrompt: appOwnedPrompt,
  temperature: 0.8, maxOutputTokens: 4096, timeoutMs: 90_000,
  responseFormat: 'json', responseJsonSchema: appOwnedSchema,
});
```

`text` handles Gemini and OpenRouter text and returns text plus optional
provider token usage. `tts` takes a server-chosen voice ID and returns MPEG
bytes from ElevenLabs. Provider errors use the stable `ModelRouterError.code`;
apps should branch on that code rather than parsing message text. Apps decide
their own HTTP message and retry policy. Image, music, video and 3D entries are
catalog information only and have no generation adapter. A configured key
does not prove that a provider call will succeed.

## Dependencies and verification

Library consumes SEN only through `@seihouse/sen/*`. Its type build resolves
SEN's emitted declarations, preventing a second engine copy. The packed smoke
installs both tarballs plus UI peers in a fresh directory, bundles every public
entry and type-checks Profile, Energy, QI, DAO XP, rewards, Relics, Familiar and HARNESS host contracts.

```bash
npm run check:ownership
npm run build:package:library
npm run test:package
```

Workshop simulations, API handlers, identity verification, database adapters,
and production infrastructure are not published. Provider access is published
only through the server-only Model Router entry.
