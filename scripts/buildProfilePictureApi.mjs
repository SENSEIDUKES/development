import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const debugBundle = process.env.PROFILE_PICTURE_API_DEBUG_BUNDLE === "1";

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
      "src/server/profile-picture/vercelHandler.ts",
    ),
    outDir: path.join(repositoryRoot, "generated/profile-picture-api"),
    emptyOutDir: true,
    minify: !debugBundle,
    sourcemap: debugBundle,
    rollupOptions: {
      output: {
        format: "es",
        exports: "named",
        entryFileNames: "profile-picture.mjs",
        chunkFileNames: "profile-picture-[hash].mjs",
      },
    },
  },
});
import { packageAliases } from './packageAliases.mjs';
