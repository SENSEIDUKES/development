import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
// @ts-expect-error — the package descriptors are plain ESM shared with the
// build, boundary, and smoke scripts, which all run under plain node.
import { resolveTarget } from './scripts/packageTargets.mjs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Shared build configuration for the packages DEV publishes:
 * `@seihouse/sen` (the portable engine) and `@Seihouse/Library` (SEIHouse's
 * first-party surfaces built on it).
 *
 * Both builds work the same way, so they share one factory: entries come from
 * the package manifest, the Workshop shell, its previews and mocks, and every
 * `src/server/` module stay out of the bundle, and each JavaScript entry
 * reconnects the extracted stylesheet.
 */

/** Everything a consuming application provides, not the package. */
export const HOST_PROVIDED = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  'react-focus-lock',
  'lucide-react',
  /^motion(\/.*)?$/,
  /^@seihouse\/audio-player(\/.*)?$/,
];

export interface PackageBuildOptions {
  /** Package target id from `scripts/packageTargets.mjs`, e.g. `sen`. */
  target: string;
  /** Additional externals on top of {@link HOST_PROVIDED}. */
  external?: (string | RegExp)[];
}

interface PackageTarget {
  sourceDirectory: string;
  distDirectory: string;
  styleSheet: string;
  unstyledEntries: string[];
}

/**
 * Reads the published entry names straight from the package manifest, so the
 * manifest stays the single source of truth for what the package exports.
 */
const readEntries = (sourceDirectory: string) => {
  const directory = new URL(`./${sourceDirectory}/`, import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('package.json', directory), 'utf8')) as {
    exports: Record<string, string | { import?: string }>;
  };
  const entries: Record<string, string> = {};
  for (const target of Object.values(manifest.exports)) {
    const bundle = typeof target === 'string' ? undefined : target.import;
    if (!bundle) continue;
    const name = bundle.replace(/^\.\/dist\//, '').replace(/\.js$/, '');
    entries[name] = fileURLToPath(new URL(`${name}.ts`, directory));
  }
  return entries;
};

export const createPackageBuildConfig = (options: PackageBuildOptions) => {
  // One descriptor per package, shared with the boundary, finalize, and smoke
  // scripts, so the entry list, output directory, and stylesheet cannot drift
  // between the build and the checks that verify it.
  const target = resolveTarget(options.target) as PackageTarget;
  return defineConfig({
  plugins: [react(), tailwindcss()],
  // The application public directory also contains Workshop-only screenshot
  // fixtures. Package runtime assets are copied from an explicit allow-list by
  // `finalizePackage.mjs` instead of publishing that entire directory.
  publicDir: false,
  build: {
    outDir: `${target.distDirectory}/dist`,
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: readEntries(target.sourceDirectory),
      formats: ['es'],
    },
    rollupOptions: {
      external: [...HOST_PROVIDED, ...(options.external ?? [])],
      output: {
        // Vite extracts library CSS but does not automatically reconnect it to
        // JavaScript entries. Keep every public entry self-styling while the
        // explicit `./styles.css` export remains available to hosts.
        banner: chunk => chunk.isEntry && !target.unstyledEntries.includes(chunk.name)
          ? `import './${target.styleSheet}';`
          : '',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: assetInfo =>
          assetInfo.names?.some(name => name.endsWith('.css'))
            ? target.styleSheet
            : '[name][extname]',
      },
    },
  },
  });
};
