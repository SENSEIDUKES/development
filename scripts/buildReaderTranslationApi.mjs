import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const debugBundle = process.env.READER_TRANSLATION_API_DEBUG_BUNDLE === '1';

await build({
  root: repositoryRoot,
  configFile: false,
  resolve: { alias: packageAliases },
  envDir: false,
  publicDir: false,
  logLevel: 'warn',
  build: {
    ssr: path.join(repositoryRoot, 'src/server/reader-translation/vercelHandler.ts'),
    outDir: path.join(repositoryRoot, 'generated/reader-translation-api'),
    emptyOutDir: true,
    minify: !debugBundle,
    sourcemap: debugBundle,
    rollupOptions: {
      output: {
        format: 'es',
        exports: 'named',
        entryFileNames: 'reader-translation.mjs',
        chunkFileNames: 'reader-translation-[hash].mjs',
      },
    },
  },
});
import { packageAliases } from './packageAliases.mjs';
