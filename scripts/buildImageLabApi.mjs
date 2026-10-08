import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const debugBundle = process.env.IMAGE_LAB_API_DEBUG_BUNDLE === "1";

await build({
  root: repositoryRoot,
  configFile: false,
  resolve: { alias: packageAliases },
  envDir: false,
  publicDir: false,
  logLevel: "warn",
  build: {
    ssr: path.join(
      repositoryRoot,
      "src/server/image-lab/vercelHandler.ts",
    ),
    outDir: path.join(repositoryRoot, "generated/image-lab-api"),
    emptyOutDir: true,
    minify: !debugBundle,
    sourcemap: debugBundle,
    rollupOptions: {
      output: {
        format: "es",
        exports: "named",
        entryFileNames: "image-lab.mjs",
        chunkFileNames: "image-lab-[hash].mjs",
      },
    },
  },
});
import { packageAliases } from './packageAliases.mjs';
