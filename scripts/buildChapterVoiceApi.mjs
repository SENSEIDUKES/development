import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const debugBundle = process.env.CHAPTER_VOICE_API_DEBUG_BUNDLE === "1";

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
      "src/server/audio/chapterVoiceVercelHandler.ts",
    ),
    outDir: path.join(repositoryRoot, "generated/chapter-voice-api"),
    emptyOutDir: true,
    minify: !debugBundle,
    sourcemap: debugBundle,
    rollupOptions: {
      output: {
        format: "es",
        exports: "named",
        entryFileNames: "chapter-voice.mjs",
        chunkFileNames: "chapter-voice-[hash].mjs",
      },
    },
  },
});
import { packageAliases } from './packageAliases.mjs';
