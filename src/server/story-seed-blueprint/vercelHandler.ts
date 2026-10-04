import { handleStorySeedBlueprintHttp } from "./http";

export const maxDuration = 180;

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

export default async function storySeedBlueprintHandler(
  request: RequestLike,
  response: ResponseLike,
) {
  const result = await handleStorySeedBlueprintHttp(
    { method: request.method, body: request.body, headers: request.headers },
    {
      environment: process.env,
      onError: error => console.error("[story-seed-blueprint]", error),
      // One line per Blueprint: which model wrote it and how long it took. Never the Seed.
      onAnswer: ({ model, durationMs }) => console.info(`[story-seed-blueprint] ${model} answered in ${Math.round(durationMs / 1000)}s`),
    },
  );
  for (const [name, value] of Object.entries(result.headers ?? {})) {
    response.setHeader(name, value);
  }
  response.status(result.status).json(result.body);
}
