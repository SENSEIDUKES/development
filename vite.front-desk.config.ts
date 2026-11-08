import { createPackageBuildConfig } from './vite.package.shared';

/**
 * Build configuration for the `@seihouse/front-desk` npm package: SEIHouse
 * Front Desk, shared infrastructure beneath SEN and the Library.
 *
 * Only the entries in `src/package/front-desk/` are built. Nothing reachable
 * from them may import SEN, the Library, an app, the Workshop or `src/server/`.
 */
export default createPackageBuildConfig({
  target: 'front-desk',
});
