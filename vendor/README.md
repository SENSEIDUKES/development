# Private UI artifacts

These committed tarballs are built from the merged UI PR [#53](https://github.com/SENSEIDUKES/UI/pull/53), commit `e272b18d7960ed7d1fa32b0d5d111c7da55e170b`:

- `@seihouse/ui@0.4.0`: universal SEIHouse primitives and experience tokens.
- `@seihouse/library-ui@0.4.0`: the Celestial Library component system.

`ui-artifacts.json` records source provenance and SHA-512 integrity. The root manifest pins these files, and `package-lock.json` records their integrity. Run `npm ci` followed by `npm run check:ui-artifacts` to verify the installed dependency inputs. No registry publication or repository visibility change is required.

To reproduce, check out the recorded UI commit, install with its frozen pnpm lockfile, and run these commands sequentially from UI:

```sh
pnpm build:package
npm pack ./packages/seihouse-ui --pack-destination /path/to/development/vendor
npm pack ./packages/seihouse-library-ui --pack-destination /path/to/development/vendor
```

UI's `pnpm test:package` checks repeated-pack integrity and fresh ESM, TypeScript, and Tailwind CSS consumption. Development's `npm run test:package` installs SEN and Library into consumers outside the repository; the SEN consumer must have no Library UI installed.
