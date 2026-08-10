import { handleStorySeedBlueprintHttp } from "./http";

export const maxDuration = 120;

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
    },
  );
  for (const [name, value] of Object.entries(result.headers ?? {})) {
    response.setHeader(name, value);
  }
  response.status(result.status).json(result.body);
}
