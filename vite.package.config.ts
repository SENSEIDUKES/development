import { createPackageBuildConfig } from './vite.package.shared';

/**
 * Build configuration for the `@seihouse/sen` npm package — the portable
 * expanded-narrative engine.
 *
 * Only the entries in `src/package/sen/` are built. Nothing reachable from
 * them may import the Workshop shell, its previews and mocks, `src/server/`,
 * or `@Seihouse/Library`: SEN never depends on Library.
 */
export default createPackageBuildConfig({
  target: 'sen',
});
