# `@Seihouse/Library`

SEIHouse's first-party host application surfaces, built on SEN.

Library is the branded implementation of the SEN engine — not a second copy
of it. Everything portable lives in [`@seihouse/sen`](https://github.com/SENSEIDUKES/development);
this package carries only what is genuinely SEIHouse product: cultivation and
Qi progression, the relic economy, and the Library-specific presentation
layered over portable SEN systems.

**Library may depend on SEN. SEN never depends on Library.** The dependency
runs one way, and `npm run check:package-boundaries` fails the build if it
ever runs the other.

## Entries

| Import | Surface |
| --- | --- |
| `@Seihouse/Library` | Every Library surface, plus `LIBRARY_PACKAGE_VERSION` |
| `@Seihouse/Library/cultivation` | Closed-Door Cultivation: the props-driven idle-Qi reward presentation and its claim ceremony |
| `@Seihouse/Library/relics` | The relic economy: the relic card, its inspection modal, the claim reveal, and the relic model |

## What belongs here, and what does not

Library owns the parts of the product that only make sense inside SEIHouse's
own application:

- cultivation, Qi, and realm progression;
- the relic economy — reward tiers, claims, and artifact language;
- Library hub behavior, branding, services, and infrastructure.

Reusable narrative systems — expanded reading behavior, structured chapter
contracts, scoring, Color Codes, Codex behavior, cards, and the surfaces built
on them — belong to `@seihouse/sen`, because another author or company must be
able to install SEN and supply their own writing, branding, storage,
authentication, and generation method. If a Library surface turns out to carry
reusable behavior, the behavior moves to SEN and the Library skin stays here;
it is never copied into both.

## Peer dependencies

`@seihouse/sen` is a peer dependency, not a bundled one: Library links against
the published engine so a host application runs exactly one copy of SEN. React,
Motion, and Lucide stay host-provided the same way.

Library ships no stylesheet of its own. Its surfaces are Tailwind-only and
inherit the shared treatments from `@seihouse/sen/styles.css`, which a host
loads once.

## Building

```bash
npm run build:package           # SEN then Library, in order
npm run build:package:library   # bundle, emit types, verify
npm run test:package            # boundary check + both packages, packed and smoke-tested
```

Library type-checks against SEN's **published declarations**, not SEN source:
`tsconfig.library.json` maps `@seihouse/sen/*` to SEN's emitted `.d.ts` files.
Without that, `tsc` follows the import into `src/components/` and emits a
second copy of the engine's types inside this package. It makes SEN's build a
prerequisite, so `build:package:library` checks for it first and says so
plainly if SEN has not been built.

`test:package` packs the finished `dist/library/`, installs it into a fresh
consumer **alongside the packed `@seihouse/sen` tarball**, type-checks the
public contracts, and bundles every entry — so the Library → SEN link is
verified through the published packages, not through repo source.

## Using it from DEV

DEV consumes the same entries it publishes. `@Seihouse/Library/*` is aliased
to `src/package/library/*` in `tsconfig.json` and `vite.config.ts`, so a
Workshop preview imports exactly what a consuming application will:

```ts
import { ClosedDoorCultivationModal } from '@Seihouse/Library/cultivation';
import { RelicCard, RelicReveal } from '@Seihouse/Library/relics';
```

## History

- **2026-08-25:** Pointed the package's type build at SEN's published
  declarations, so Library no longer emits a duplicate copy of the engine's
  types (its `dist/types/` now carries only Library's own surfaces), and added
  the build-order guard that enforces it.
- **2026-08-25:** Created the package when SEN and Library split into separate
  lanes. Closed-Door Cultivation and the relic surfaces moved out of
  `@seihouse/sen` (where they were published as `./closed-door-cultivation`
  and `./relics`) into this first-party package; `RelicReveal` now imports the
  shared particle canvas through `@seihouse/sen/ui` instead of reaching into
  SEN source, so the two packages link the way a consumer's would.
