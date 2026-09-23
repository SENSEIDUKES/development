import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const debugBundle = process.env.MODEL_ROUTER_API_DEBUG_BUNDLE === '1';

await build({
  root: repositoryRoot,
  configFile: false,
  resolve: { alias: packageAliases },
  envDir: false,
  publicDir: false,
  logLevel: 'warn',
  build: {
    ssr: path.join(repositoryRoot, 'src/server/model-router/vercelHandler.ts'),
    outDir: path.join(repositoryRoot, 'generated/model-router-api'),
    emptyOutDir: true,
    minify: !debugBundle,
    sourcemap: debugBundle,
    rollupOptions: {
      output: {
        format: 'es',
        exports: 'named',
        entryFileNames: 'model-router.mjs',
        chunkFileNames: 'model-router-[hash].mjs',
      },
    },
  },
});
import { packageAliases } from './packageAliases.mjs';
