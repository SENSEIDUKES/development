import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const debugBundle = process.env.HARNESS_GENERATION_API_DEBUG_BUNDLE === '1';

await build({
  root: repositoryRoot,
  configFile: false,
  envDir: false,
  publicDir: false,
  logLevel: 'warn',
  build: {
    ssr: path.join(repositoryRoot, 'src/server/harness-generation/vercelHandler.ts'),
    outDir: path.join(repositoryRoot, 'generated/harness-generation-api'),
    emptyOutDir: true,
    minify: !debugBundle,
    sourcemap: debugBundle,
    rollupOptions: {
      output: {
        format: 'es',
        exports: 'named',
        entryFileNames: 'harness-generation.mjs',
        chunkFileNames: 'harness-generation-[hash].mjs',
      },
    },
  },
});
