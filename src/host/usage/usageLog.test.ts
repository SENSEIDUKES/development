// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FamiliarLive, FamiliarLiveEvents } from '@seihouse/library/familiar';
import { HarnessGenerationHttpClient } from '../generation/httpClient';
import { withLiveUsage } from '../familiar/liveTalk';
import { readUsage, recordUsage, usageEnergy, USAGE_STORAGE_KEY } from './usageLog';

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

const DAY = 24 * 60 * 60 * 1_000;

describe('the usage record', () => {
  it('keeps each entry on this device for 90 days, and survives a damaged record', () => {
    const now = Date.UTC(2026, 10, 1);
    recordUsage({ kind: 'chapter', model: 'google/gemini-3.8-flash', inputTokens: 20_000, outputTokens: 4_000, at: now - 91 * DAY });
    recordUsage({ kind: 'image', model: 'minimax/image-01', at: now });
    expect(readUsage()).toEqual([{ kind: 'image', model: 'minimax/image-01', at: now }]);
    localStorage.setItem(USAGE_STORAGE_KEY, 'not json');
    expect(readUsage()).toEqual([]);
    recordUsage({ kind: 'blueprint' });
    expect(readUsage()).toHaveLength(1);
  });

  it('prices an entry at the tier it was chosen at, which can differ from its model\'s grade', () => {
    expect(usageEnergy({ at: 0, kind: 'chapter', model: 'google/gemini-3.1-flash-lite', grade: 'heaven' })).toBe(8);
    expect(usageEnergy({ at: 0, kind: 'live', model: 'google/gemini-3.8-live', grade: 'immortal', seconds: 20 })).toBe(2);
  });

  it('prices each entry in Energy by its model\'s grade', () => {
    expect(usageEnergy({ at: 0, kind: 'chapter', model: 'google/gemini-3.8-flash' })).toBe(4);
    expect(usageEnergy({ at: 0, kind: 'story-upkeep', model: 'google/gemini-3.8-flash', task: 'Tagging' })).toBe(0);
    expect(usageEnergy({ at: 0, kind: 'image', model: 'google/gemini-3.1-flash-lite-image' })).toBe(5);
    expect(usageEnergy({ at: 0, kind: 'live', model: 'openai/gpt-live-1', seconds: 90 })).toBe(10);
    expect(usageEnergy({ at: 0, kind: 'blueprint', model: 'anthropic/claude-opus-5-5' })).toBe(8);
  });

  it('records each chapter and story-upkeep call with the provider\'s own counts', async () => {
    const receipt = (model: string) => ({ rawProviderResponse: '{}', providerReceipt: { provider: 'gemini', model, generatedAt: '', usage: { source: 'reported', inputTokens: 1_200, outputTokens: 300 } } });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(receipt('google/gemini-3.8-flash')), { status: 200 })));
    const client = new HarnessGenerationHttpClient();
    await client.generate({ model: 'google/gemini-3.8-flash' } as never);
    await client.tagChapter({ model: 'google/gemini-3.8-flash', operation: 'tag-chapter' } as never);
    expect(readUsage().map(({ at: _at, ...entry }) => entry)).toEqual([
      { kind: 'chapter', grade: 'immortal', model: 'google/gemini-3.8-flash', inputTokens: 1_200, outputTokens: 300 },
      { kind: 'story-upkeep', task: 'Tagging', model: 'google/gemini-3.8-flash', inputTokens: 1_200, outputTokens: 300 },
    ]);
    // A count the server estimated stays marked as an estimate.
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ...receipt('google/gemini-3.8-flash'), providerReceipt: { ...receipt('google/gemini-3.8-flash').providerReceipt, usage: { source: 'estimated', inputTokens: 900, outputTokens: 200 } } }), { status: 200 })));
    await client.generate({ model: 'google/gemini-3.8-flash' } as never);
    expect(readUsage().at(-1)).toMatchObject({ kind: 'chapter', inputTokens: 900, outputTokens: 200, tokensEstimated: true });
  });

  it('records a live conversation from when it connected until it ended, once', () => {
    let clock = 1_000;
    let handlers: FamiliarLiveEvents | undefined;
    const end = vi.fn();
    const inner: FamiliarLive = { start: (_brief, events) => { handlers = events; return { end, send: vi.fn() }; } };
    const events: FamiliarLiveEvents = { connected: vi.fn(), caption: vi.fn(), call: vi.fn(async () => ''), ended: vi.fn() };
    const session = withLiveUsage(inner, 'openai/gpt-live-1', () => clock).start({} as never, events);
    handlers!.connected();
    expect(events.connected).toHaveBeenCalledOnce();
    clock += 95_000;
    session.end();
    handlers!.ended();
    expect(end).toHaveBeenCalledOnce();
    expect(readUsage().map(({ at: _at, ...entry }) => entry)).toEqual([{ kind: 'live', model: 'openai/gpt-live-1', grade: 'immortal', seconds: 95 }]);
    // A talk that never connected costs nothing and is not recorded.
    withLiveUsage(inner, 'openai/gpt-live-1', () => clock).start({} as never, events);
    handlers!.ended('Live talk could not start', true);
    expect(readUsage()).toHaveLength(1);
  });
});
