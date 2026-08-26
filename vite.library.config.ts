import { createPackageBuildConfig } from './vite.package.shared';

/**
 * Build configuration for the `@seihouse/library` npm package — SEIHouse's
 * first-party host surfaces.
 *
 * Only the entries in `src/package/library/` are built. SEN is a peer
 * dependency and stays external, so Library links against the published
 * engine instead of bundling a second copy of it.
 */
export default createPackageBuildConfig({
  target: 'library',
  external: [/^@seihouse\/sen(\/.*)?$/],
});
