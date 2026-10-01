import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { developmentApisPlugin } from './scripts/developmentApisPlugin.mjs';
import { packageAliases } from './scripts/packageAliases.mjs';

/**
 * `/app` is the NovelExpanded app's address; its pages live under `/app/`.
 * Without the slash the dev and preview servers would fall back to the
 * Workshop, so they send it on (vercel.json does the same when deployed).
 */
const novelExpandedAddress = (): Plugin => {
  const redirect: Connect.NextHandleFunction = (request, response, next) => {
    const [pathname, query] = (request.url ?? '').split(/\?(.*)/s, 2);
    if (pathname !== '/app') return next();
    response.statusCode = 308;
    response.setHeader('Location', `/app/${query ? `?${query}` : ''}`);
    response.end();
  };
  return {
    name: 'novel-expanded-address',
    configureServer: server => { server.middlewares.use(redirect); },
    configurePreviewServer: server => { server.middlewares.use(redirect); },
  };
};

export default defineConfig(({ mode }) => {
  const loadedEnvironment = loadEnv(mode, process.cwd(), '');
  const serverEnvironment = { ...loadedEnvironment, ...process.env };
  return {
    build: {
      rollupOptions: {
        input: {
          workshop: fileURLToPath(new URL('./index.html', import.meta.url)),
          libraryShell: fileURLToPath(new URL('./library-shell.html', import.meta.url)),
          app: fileURLToPath(new URL('./app/index.html', import.meta.url)),
        },
      },
    },
    plugins: [
      novelExpandedAddress(),
      react(),
      tailwindcss(),
      developmentApisPlugin(serverEnvironment),
    ],
    resolve: { alias: packageAliases },
  };
});
