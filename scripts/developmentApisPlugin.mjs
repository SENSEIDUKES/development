import { build } from 'vite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { packageAliases } from './packageAliases.mjs';
/** Build host middleware after Vite has loaded its config, so host consumers can
 * resolve the same public entries as every other DEV consumer. Never published. */
export function developmentApisPlugin(environment) {
  const configure = async server => {
    const outDir = fileURLToPath(new URL('../generated/development-apis', import.meta.url));
    await build({ configFile: false, envDir: false, publicDir: false, logLevel: 'error', resolve: { alias: packageAliases },
      build: { ssr: fileURLToPath(new URL('../src/server/developmentApis.ts', import.meta.url)), outDir, emptyOutDir: true,
        rollupOptions: { output: { format: 'es', entryFileNames: 'development-apis.mjs' } } } });
    const { generationApis } = await import(`${pathToFileURL(`${outDir}/development-apis.mjs`)}?v=${Date.now()}`);
    generationApis(environment).configureServer(server);
  };
  return { name: 'development-host-apis', configureServer: configure, configurePreviewServer: configure };
}
