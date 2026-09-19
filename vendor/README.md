# Private UI artifacts

The universal UI tarball is built from the merged UI PR [#60](https://github.com/SENSEIDUKES/UI/pull/60), commit `42961e48e78ee816f9c2801a37a7f66af8aa2ae2`:

- `@seihouse/ui@0.4.0`: universal SEIHouse primitives and experience tokens, including the `SEIAppHeader` application chrome and the `SEIAppShell` scaffold.
- `@seihouse/library-ui@0.5.0`: stateless Celestial Library presentation, including the transferred icon family, manifestation chamber/scenes/vessel, journey scrubber, Cave backdrop and particles. Built from coordinated [UI PR #68](https://github.com/SENSEIDUKES/UI/pull/68), source commit `04b8949bb11e956ce698277cf84bc94e2d904bf6`. Domain behavior remains in `@seihouse/library`.

`ui-artifacts.json` records source provenance and SHA-512 integrity. The root manifest pins these files, and `package-lock.json` records their integrity. Run `npm ci` followed by `npm run check:ui-artifacts` to verify the installed dependency inputs.

Use `npm ci` after refreshing these tarballs. `check:ui-artifacts` compares each tarball against the installed copy in both directions and also checks lockfile integrity and recorded source provenance.

No registry publication or repository visibility change is required.

## SPP intake adapter

`seihouse-productions-package-0.1.0.tgz` is built from the official standalone
`SENSEIDUKES/seihouse-productions-package` source at
`350e3c0aa55bd853767e685a45551b9f8b20fc24` using `npm exec -- tsup` and `npm pack`.
The package lock pins the tarball integrity. Its included `SPP_AGENT_SETUP.md`
governs intake: validate first, select manifest files explicitly, then pass decoded
content into the host's existing model context. SPP is a Development host dependency;
the portable SEN Harness only receives ordinary skill manifests and has no SPP dependency.

To reproduce an artifact, check out its recorded UI commit (the per-artifact commit when present, otherwise the shared source commit), install with its frozen pnpm lockfile, and build and pack that package from UI. Run each pack at its own recorded commit:

```sh
pnpm build:package
npm pack ./packages/seihouse-ui --pack-destination /path/to/development/vendor
npm pack ./packages/seihouse-library-ui --pack-destination /path/to/development/vendor
```

UI's `pnpm test:package` checks repeated-pack integrity and fresh ESM, TypeScript, and Tailwind CSS consumption. Development's `npm run test:package` installs SEN and Library into consumers outside the repository; the SEN consumer must have no Library UI installed.
