import { afterEach, expect, it, vi } from 'vitest';
import { handleStorySparkHttp } from './http';
import handler from './vercelHandler';

vi.mock('./http', () => ({ handleStorySparkHttp: vi.fn(async () => ({
  status: 200, body: { configured: true }, headers: { 'Cache-Control': 'no-store' },
})) }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

const call = async (method: string, visitor: string, authorization?: string) => {
  const headers: Record<string, string> = {};
  let code = 0;
  const response = {
    setHeader: (key: string, value: string) => { headers[key] = value; },
    status: (value: number) => { code = value; return response; }, json: vi.fn(),
  };
  await handler({ method, headers: { host: 'example.test', origin: 'https://example.test', 'x-forwarded-for': visitor, authorization } }, response);
  return { headers, code };
};

it('sends usage on GET, generated responses and the existing 429 rejection', async () => {
  expect((await call('GET', '192.0.2.10')).headers['X-Sparks-Remaining']).toBe('20');
  for (let i = 0; i < 20; i++) expect((await call('POST', '192.0.2.10')).headers['X-Sparks-Remaining']).toBe(String(19 - i));
  const exhausted = await call('POST', '192.0.2.10');
  expect(exhausted.code).toBe(429);
  expect(exhausted.headers['X-Sparks-Remaining']).toBe('0');
  expect((await call('GET', '192.0.2.10')).headers['X-Sparks-Remaining']).toBe('0');
});

it('sends the consumed budget on provider failure', async () => {
  vi.mocked(handleStorySparkHttp).mockResolvedValueOnce({ status: 502, body: { error: 'Failed' } });
  const result = await call('POST', '192.0.2.11');
  expect(result.code).toBe(502);
  expect(result.headers['X-Sparks-Remaining']).toBe('19');
});

it('sends unlimited for valid owner status and generation without spending the visitor budget', async () => {
  vi.stubEnv('STORY_SEED_BLUEPRINT_ACCESS_TOKEN', 'owner');
  expect((await call('GET', '192.0.2.12', 'Bearer owner')).headers['X-Sparks-Unlimited']).toBe('true');
  expect((await call('POST', '192.0.2.12', 'Bearer owner')).headers['X-Sparks-Unlimited']).toBe('true');
  expect((await call('GET', '192.0.2.12')).headers['X-Sparks-Remaining']).toBe('20');
});
