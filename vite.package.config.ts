import { createPackageBuildConfig } from './vite.package.shared';

/**
 * Build configuration for the `@seihouse/sen` npm package — the portable
 * expanded-narrative engine.
 *
 * Only the entries in `src/package/sen/` are built. Nothing reachable from
 * them may import the Workshop shell, its previews and mocks, `src/server/`,
 * or `@seihouse/library`: SEN never depends on Library.
 */
export default createPackageBuildConfig({
  target: 'sen',
  // Front Desk is a peer: SEN links against the published package, never a bundled copy.
  external: [/^@seihouse\/front-desk(\/.*)?$/],
});
