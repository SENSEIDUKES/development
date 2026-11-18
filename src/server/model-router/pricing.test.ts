import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

it('converts published per-token prices, preserves free routes and shares one catalog read', async () => {
  const fetchCatalog = vi.fn(async () => Response.json({ data: [
    { id: 'vendor/paid', pricing: { prompt: '0.000002', completion: '0.000010' } },
    { id: 'vendor/free', pricing: { prompt: '0', completion: '0' } },
    { id: 'vendor/unknown', pricing: { prompt: '', completion: '-1' } },
  ] }));
  vi.stubGlobal('fetch', fetchCatalog);
  const { openRouterRates } = await import('./pricing');
  const [rates] = await Promise.all([openRouterRates(), openRouterRates()]);
  expect(rates.get('openrouter/vendor/paid')).toEqual({ input: 2, output: 10 });
  expect(rates.get('openrouter/vendor/free')).toEqual({ input: 0, output: 0 });
  expect(rates.has('openrouter/vendor/unknown')).toBe(false);
  expect(fetchCatalog).toHaveBeenCalledTimes(1);
});

it('leaves missing rates unquoted during an outage and retries after a minute', async () => {
  vi.useFakeTimers();
  const fetchCatalog = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(Response.json({ data: [] }));
  vi.stubGlobal('fetch', fetchCatalog);
  const { openRouterRates } = await import('./pricing');
  expect((await openRouterRates()).size).toBe(0);
  await openRouterRates();
  expect(fetchCatalog).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(60_001);
  await openRouterRates();
  expect(fetchCatalog).toHaveBeenCalledTimes(2);
});
