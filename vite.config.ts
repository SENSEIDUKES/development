import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { handleChapterGenerationHttp } from './src/server/chapter-generation/http';
import type { ChapterGenerationStreamEvent } from './src/components/chapter-generation/shared/liveChapterGeneration';
import { handleStorySeedBlueprintHttp } from './src/server/story-seed-blueprint/http';
import { handleCodexVoiceQuoteHttp } from './src/server/audio/codexVoiceQuoteHttp';
import { createConfiguredCodexVoiceQuoteService } from './src/server/audio/codexVoiceQuote';
import {
  createPublicGenerationGuard,
  type PublicGenerationGuardResult,
} from './src/server/shared/publicGenerationGuard';

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

const acceptsChapterStream = (request: IncomingMessage) =>
  request.headers.accept?.includes('application/x-ndjson') ?? false;

const generationApis = (
  environment: Record<string, string | undefined>,
): Plugin => {
  const guardChapterGeneration = createPublicGenerationGuard({
    key: 'chapter-generation',
    limit: 6,
    windowMs: 30 * 60 * 1_000,
  });
  const guardCodexVoiceQuote = createPublicGenerationGuard({
    key: 'codex-voice-quote',
    limit: 8,
    windowMs: 60 * 60 * 1_000,
  });
  // One shared service instance so concurrent Codex taps on the same
  // signature quote collapse into a single provider call.
  const codexVoiceQuoteService = (() => {
    try {
      return createConfiguredCodexVoiceQuoteService(environment, {
        onError: error => console.error('[codex-voice]', error),
      });
    } catch (error) {
      console.error('[codex-voice] configuration failure', error);
      return undefined;
    }
  })();
  const configure = (server: { middlewares: { use: (handler: (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
  ) => void) => void } }) => {
    server.middlewares.use(async (request, response, next) => {
      const pathname = new URL(request.url ?? '/', 'http://development.local').pathname;
      if (
        pathname !== '/api/chapter-generation'
        && pathname !== '/api/generate-blueprint'
        && pathname !== '/api/codex-voice-quote'
      ) {
        next();
        return;
      }
      try {
        const admission: PublicGenerationGuardResult = request.method?.toUpperCase() !== 'POST'
          ? { allowed: true }
          : pathname === '/api/chapter-generation'
            ? guardChapterGeneration(request)
            : pathname === '/api/codex-voice-quote'
              ? guardCodexVoiceQuote(request)
              : { allowed: true };
        if (!admission.allowed) {
          writeJson(response, admission.status ?? 403, {
            error: admission.error ?? 'This Development action is unavailable.',
          }, {
            'Cache-Control': 'no-store',
            ...(admission.retryAfterSeconds ? { 'Retry-After': String(admission.retryAfterSeconds) } : {}),
          });
          return;
        }
        const body = request.method?.toUpperCase() === 'POST'
          ? await readJsonBody(request)
          : undefined;
        if (pathname === '/api/generate-blueprint') {
          const result = await handleStorySeedBlueprintHttp(
            { method: request.method, body, headers: request.headers },
            {
              environment,
              onError: error => console.error('[story-seed-blueprint]', error),
            },
          );
          writeJson(response, result.status, result.body, result.headers);
          return;
        }
        if (pathname === '/api/codex-voice-quote') {
          const result = await handleCodexVoiceQuoteHttp(
            { method: request.method, body, headers: request.headers },
            {
              environment,
              service: codexVoiceQuoteService,
              onError: error => console.error('[codex-voice]', error),
            },
          );
          writeJson(response, result.status, result.body, result.headers);
          return;
        }
        const streaming = request.method?.toUpperCase() === 'POST' && acceptsChapterStream(request);
        let streamStarted = false;
        const writeEvent = (event: ChapterGenerationStreamEvent) => {
          if (!streamStarted) {
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
            response.setHeader('Cache-Control', 'no-store');
            streamStarted = true;
          }
          response.write(`${JSON.stringify(event)}\n`);
        };
        const result = await handleChapterGenerationHttp(
          { method: request.method, body, headers: request.headers },
          {
            environment,
            onError: error => console.error('[chapter-generation]', error),
            ...(streaming ? { onStageChange: stage => writeEvent({ type: 'stage', stage }) } : {}),
          },
        );
        if (streaming) {
          if (!streamStarted) {
            response.statusCode = result.status;
            response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
            response.setHeader('Cache-Control', 'no-store');
            streamStarted = true;
          }
          writeEvent({
            type: 'result',
            status: result.status,
            body: result.body as Extract<ChapterGenerationStreamEvent, { type: 'result' }>['body'],
          });
          response.end();
        } else {
          writeJson(response, result.status, result.body, result.headers);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request.';
        writeJson(response, message.includes('2 MB') ? 413 : 400, { error: message });
      }
    });
  };

  return {
    name: 'development-generation-apis',
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
      generationApis(serverEnvironment),
    ],
  };
});
