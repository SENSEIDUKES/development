import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Build configuration for the future `@seihouse/sen` npm package.
 *
 * Only the package entries in `src/package/` are built. The Workshop shell,
 * its previews and mocks, and every `src/server/` module stay out of the
 * bundle: nothing reachable from these entries may import them.
 */
const entries = {
  index: fileURLToPath(new URL('./src/package/index.ts', import.meta.url)),
  library: fileURLToPath(new URL('./src/package/library.ts', import.meta.url)),
  'reader-chamber': fileURLToPath(new URL('./src/package/reader-chamber.ts', import.meta.url)),
  'reader-codex': fileURLToPath(new URL('./src/package/reader-codex.ts', import.meta.url)),
  'codex-cards': fileURLToPath(new URL('./src/package/codex-cards.ts', import.meta.url)),
  manifestations: fileURLToPath(new URL('./src/package/manifestations.ts', import.meta.url)),
  relics: fileURLToPath(new URL('./src/package/relics.ts', import.meta.url)),
  audio: fileURLToPath(new URL('./src/package/audio.ts', import.meta.url)),
  'closed-door-cultivation': fileURLToPath(new URL('./src/package/closed-door-cultivation.ts', import.meta.url)),
  'story-seed': fileURLToPath(new URL('./src/package/story-seed.ts', import.meta.url)),
  'chapter-generation': fileURLToPath(new URL('./src/package/chapter-generation.ts', import.meta.url)),
};

/** Everything the consuming application provides, not the package. */
const external = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  'react-focus-lock',
  'lucide-react',
  /^motion(\/.*)?$/,
  /^@seihouse\/audio-player(\/.*)?$/,
];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The application public directory also contains Workshop-only screenshot
  // fixtures. Package runtime assets are copied from an explicit allow-list by
  // `finalizeSenPackage.mjs` instead of publishing that entire directory.
  publicDir: false,
  build: {
    outDir: 'dist/sen/dist',
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: entries,
      formats: ['es'],
    },
    rollupOptions: {
      external,
      output: {
        // Vite extracts library CSS but does not automatically reconnect it to
        // JavaScript entries. Keep every public entry self-styling while the
        // explicit `./styles.css` export remains available to hosts.
        banner: chunk => chunk.isEntry && chunk.name !== 'audio'
          ? "import './sen.css';"
          : '',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: assetInfo =>
          assetInfo.names?.some(name => name.endsWith('.css')) ? 'sen.css' : '[name][extname]',
      },
    },
  },
});
