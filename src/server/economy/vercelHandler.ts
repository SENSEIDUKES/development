import { createDevelopmentEconomy } from './developmentRuntime';

export const maxDuration = 30;
const economy = createDevelopmentEconomy(process.env);

/** One function owns the DEV memory instance for Energy, QI and DAO Pillar. Resets on recycling. */
export default async function economyHandler(request: {
  url?: string; method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined>;
}, response: { setHeader(name: string, value: string): void; status(code: number): { json(value: unknown): void } }) {
  const capability = new URL(request.url ?? '/', 'http://development.local').searchParams.get('capability');
  const result = await economy.handle(capability, request);
  for (const [name, value] of Object.entries(result.headers ?? {})) response.setHeader(name, value);
  response.status(result.status).json(result.body);
}
