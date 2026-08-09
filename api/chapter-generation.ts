import { handleChapterGenerationHttp } from "../src/server/chapter-generation/http";

export const maxDuration = 300;

interface RequestLike {
  method?: string;
  body?: unknown;
}

interface ResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(value: unknown): void;
}

export default async function chapterGenerationHandler(
  request: RequestLike,
  response: ResponseLike,
) {
  const result = await handleChapterGenerationHttp(
    { method: request.method, body: request.body },
    {
      environment: process.env,
      onError: error => console.error("[chapter-generation]", error),
    },
  );
  for (const [name, value] of Object.entries(result.headers ?? {})) {
    response.setHeader(name, value);
  }
  response.status(result.status).json(result.body);
}
