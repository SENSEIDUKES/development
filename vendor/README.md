# Private UI artifacts

These committed tarballs are built from the merged UI PR [#60](https://github.com/SENSEIDUKES/UI/pull/60), commit `42961e48e78ee816f9c2801a37a7f66af8aa2ae2`:

- `@seihouse/ui@0.4.0`: universal SEIHouse primitives and experience tokens, including the `SEIAppHeader` application chrome and the `SEIAppShell` scaffold.
- `@seihouse/library-ui@0.4.0`: the Celestial Library component system, including the compact `LibraryHeaderBadge` `mode="app-header"` presentation.

`ui-artifacts.json` records source provenance and SHA-512 integrity. The root manifest pins these files, and `package-lock.json` records their integrity. Run `npm ci` followed by `npm run check:ui-artifacts` to verify the installed dependency inputs.

**Install with `npm ci`, never `npm install`, after refreshing these tarballs.** The file names and the `0.4.0` version stay the same across UI commits, so `npm install` over an existing `node_modules` reports "up to date" and leaves the previous build in place — which is why `vercel.json` pins the deploy install command to `npm ci`. `check:ui-artifacts` now compares each tarball against the installed copy in both directions — a changed or missing file, and a file left behind by an older build — and fails with that instruction if they diverge.

No registry publication or repository visibility change is required.

To reproduce, check out the recorded UI commit, install with its frozen pnpm lockfile, and run these commands sequentially from UI:

```sh
pnpm build:package
npm pack ./packages/seihouse-ui --pack-destination /path/to/development/vendor
npm pack ./packages/seihouse-library-ui --pack-destination /path/to/development/vendor
```

UI's `pnpm test:package` checks repeated-pack integrity and fresh ESM, TypeScript, and Tailwind CSS consumption. Development's `npm run test:package` installs SEN and Library into consumers outside the repository; the SEN consumer must have no Library UI installed.
