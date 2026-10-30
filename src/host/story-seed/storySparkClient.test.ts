import { afterEach, expect, it, vi } from 'vitest';
import { getStorySparkStatus, requestStorySpark } from './storySparkClient';

afterEach(() => vi.unstubAllGlobals());

it('reads the server allowance on status and includes the saved owner token', async () => {
  const fetch = vi.fn(async () => new Response(JSON.stringify({ configured: true }), {
    headers: { 'X-Sparks-Limit': '20', 'X-Sparks-Remaining': '13', 'X-Sparks-Reset': '123456789' },
  }));
  vi.stubGlobal('fetch', fetch);
  expect(await getStorySparkStatus(' owner ')).toEqual({ configured: true, usage: {
    unlimited: false, limit: 20, remaining: 13, resetsAt: 123456789,
  } });
  expect(fetch).toHaveBeenCalledWith('/api/story-spark', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer owner' }) }));
});

it('reports owner access and does not invent a count when metadata is missing or invalid', async () => {
  for (const [headers, usage] of [
    [{ 'X-Sparks-Unlimited': 'true' }, { unlimited: true }],
    [{}, undefined],
    [{ 'X-Sparks-Limit': '20', 'X-Sparks-Remaining': '21' }, undefined],
  ] as const) {
    vi.stubGlobal('fetch', async () => new Response('{"configured":false}', { headers }));
    expect((await getStorySparkStatus()).usage).toEqual(usage);
  }
});

it.each([200, 429, 502])('updates allowance even when generation returns HTTP %s', async status => {
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify(status === 200 ? {
    premise: 'A flower awakens on a barren mountain.', genre: 'Xianxia', style: 'chinese',
  } : { error: 'The model failed.' }), {
    status, headers: { 'X-Sparks-Limit': '20', 'X-Sparks-Remaining': status === 429 ? '0' : '19' },
  }));
  const onUsage = vi.fn();
  const result = requestStorySpark({ genre: 'Xianxia' }, undefined, undefined, onUsage);
  if (status === 200) await expect(result).resolves.toMatchObject({ premise: 'A flower awakens on a barren mountain.' });
  else await expect(result).rejects.toThrow(status === 429 ? /twenty sparks/ : /model failed/);
  expect(onUsage).toHaveBeenCalledWith({ unlimited: false, limit: 20, remaining: status === 429 ? 0 : 19, resetsAt: null });
});
