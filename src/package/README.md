# Package lanes

DEV publishes two packages, and the split between them is a product boundary,
not a build convenience.

| Directory | Package | What it is |
| --- | --- | --- |
| [`sen/`](./sen/README.md) | `@seihouse/sen` | **The portable engine.** SEIHouse Expanded Novels: an embeddable expanded-narrative engine another author or company installs in their own application, supplying their own writing, branding, storage, authentication, and generation method. |
| [`library/`](./library/README.md) | `@Seihouse/Library` | **The first-party host application.** SEIHouse's own branded implementation of SEN: cultivation and Qi progression, the relic economy, and Library-specific presentation. |

**Library may depend on SEN. SEN must never depend on Library.**

## Which lane does a surface belong to?

Ask what an outside author installing SEN would need:

- **SEN** — reusable narrative systems: expanded reading behavior, structured
  chapter contracts, scoring, Color Codes, Codex behavior, cards, and the
  narrative surfaces built on them. AI chapter generation is one optional
  content source here, never a requirement.
- **Library** — SEIHouse's own product: Library visuals and language,
  cultivation/Qi progression, hub behavior, economy, services, and
  infrastructure.

When a surface mixes the two — reusable behavior wearing a Library skin — the
behavior goes to SEN and the skin stays in Library. It is never copied into
both.

## How the lanes stay separated

Neither directory holds components. Both hold entry barrels that re-export
`development/` and `shared/` code from `src/components/<feature>/`, so the
Workshop and the packages always render the same source.

- `scripts/packageTargets.mjs` — one descriptor per package: entry directory,
  output directory, stylesheet, assets, forbidden bundle contents, and the
  smoke-test contract. The build, boundary check, finalize step, and smoke
  test all read it.
- `scripts/checkPackageBoundaries.mjs` — walks the real import graph from every
  published entry and fails if one reaches the Workshop shell, a preview, a
  mock, a locked `reference/` replica, a test, `src/server/`, or — for SEN —
  anything Library owns.
- `vite.package.shared.ts` — the shared build; each package's entry list comes
  from its own `package.json` `exports`, so the manifest is the single source
  of truth for what ships.
- `scripts/finalizePackage.mjs` / `scripts/smokePackage.mjs` — verify the built
  artifact, then pack it, install it into a fresh consumer (Library alongside
  the packed SEN tarball), type-check the public contracts, and bundle every
  entry.
- `scripts/requirePackageTypes.mjs` — Library type-checks against SEN's
  *published* declarations rather than SEN source, so it never re-emits a copy
  of the engine's types. That makes SEN's build a prerequisite; this guard says
  so plainly instead of letting `tsc` fail on a missing module.

```bash
npm run check:package-boundaries
npm run build:package
npm run test:package
```
