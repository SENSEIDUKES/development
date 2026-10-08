import { handleImageLabHttp } from './http';

export const maxDuration = 150;

interface RequestLike {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

interface ResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(value: unknown): void;
}

/** The Image Lab on Vercel: the owner's access token is required, so no visitor guard is needed. */
export default async function imageLabHandler(request: RequestLike, response: ResponseLike) {
  const result = await handleImageLabHttp(
    { method: request.method, body: request.body, headers: request.headers },
    {
      environment: process.env,
      onError: error => console.error('[image-lab] request failure', error),
      onAnswer: ({ model, durationMs }) => console.info(`[image-lab] ${model} answered in ${Math.round(durationMs / 1000)}s`),
    },
  );
  for (const [name, value] of Object.entries(result.headers ?? {})) response.setHeader(name, value);
  response.status(result.status).json(result.body);
}
