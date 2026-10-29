import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { packageAliases } from './packageAliases.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const debugBundle = process.env.FAMILIAR_LIVE_API_DEBUG_BUNDLE === '1';

await build({
  root: repositoryRoot,
  configFile: false,
  resolve: { alias: packageAliases },
  envDir: false,
  publicDir: false,
  logLevel: 'warn',
  build: {
    ssr: path.join(repositoryRoot, 'src/server/familiar-live/vercelHandler.ts'),
    outDir: path.join(repositoryRoot, 'generated/familiar-live-api'),
    emptyOutDir: true,
    minify: !debugBundle,
    sourcemap: debugBundle,
    rollupOptions: {
      output: {
        format: 'es',
        exports: 'named',
        entryFileNames: 'familiar-live.mjs',
        chunkFileNames: 'familiar-live-[hash].mjs',
      },
    },
  },
});
