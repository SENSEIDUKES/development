import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { handleChapterGenerationHttp } from './src/server/chapter-generation/http';

const MAX_CHAPTER_REQUEST_BYTES = 2 * 1024 * 1024;

const readJsonBody = async (request: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_CHAPTER_REQUEST_BYTES) {
      throw new Error('The Story Seed upload exceeds the 2 MB Development limit.');
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
};

const writeJson = (
  response: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) => {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
  response.end(JSON.stringify(body));
};

const chapterGenerationApi = (
  environment: Record<string, string | undefined>,
): Plugin => {
  const configure = (server: { middlewares: { use: (handler: (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
  ) => void) => void } }) => {
    server.middlewares.use(async (request, response, next) => {
      const pathname = new URL(request.url ?? '/', 'http://development.local').pathname;
      if (pathname !== '/api/chapter-generation') {
        next();
        return;
      }
      try {
        const body = request.method?.toUpperCase() === 'POST'
          ? await readJsonBody(request)
          : undefined;
        const result = await handleChapterGenerationHttp(
          { method: request.method, body },
          {
            environment,
            onError: error => console.error('[chapter-generation]', error),
          },
        );
        writeJson(response, result.status, result.body, result.headers);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request.';
        writeJson(response, message.includes('2 MB') ? 413 : 400, { error: message });
      }
    });
  };

  return {
    name: 'development-chapter-generation-api',
    configureServer: configure,
    configurePreviewServer: configure,
  };
};

export default defineConfig(({ mode }) => {
  const loadedEnvironment = loadEnv(mode, process.cwd(), '');
  const serverEnvironment = { ...loadedEnvironment, ...process.env };
  return {
    plugins: [
      react(),
      tailwindcss(),
      chapterGenerationApi(serverEnvironment),
    ],
  };
});
