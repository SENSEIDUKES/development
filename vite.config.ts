import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { developmentApisPlugin } from './scripts/developmentApisPlugin.mjs';
import { packageAliases } from './scripts/packageAliases.mjs';

export default defineConfig(({ mode }) => {
  const loadedEnvironment = loadEnv(mode, process.cwd(), '');
  const serverEnvironment = { ...loadedEnvironment, ...process.env };
  return {
    build: {
      rollupOptions: {
        input: {
          workshop: fileURLToPath(new URL('./index.html', import.meta.url)),
          libraryShell: fileURLToPath(new URL('./library-shell.html', import.meta.url)),
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      developmentApisPlugin(serverEnvironment),
    ],
    resolve: { alias: packageAliases },
  };
});
