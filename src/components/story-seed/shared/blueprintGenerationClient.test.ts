import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BlueprintGenerationPayload } from './storySeedSchema';
import { requestWorldBlueprint } from './blueprintGenerationClient';

const payload: BlueprintGenerationPayload = {
  storySeed: {
    creator: {},
    story: {
      required: {
        storyTags: ['mystery'],
        premise: 'A sealed city wakes beneath a second moon.',
        genre: 'Fantasy mystery',
        style: 'chinese',
      },
      optional: {
        intendedForMatureAudiences: false,
        fateSurvival: { enabled: false, visibility: 'partial', pressure: 'immortal' },
        plotAndTropeSettings: {},
      },
    },
    world: { required: {}, optional: { worldIdentity: {}, worldFoundations: {} } },
  },
};

const fetchUntilAborted = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    const signal = init?.signal;
    if (!signal) throw new Error('Expected a request signal.');
    const rejectAbort = () => reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    if (signal.aborted) rejectAbort();
    else signal.addEventListener('abort', rejectAbort, { once: true });
  }));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchUntilAborted.mockClear();
});

describe('Blueprint generation client cancellation', () => {
  it('times out a stalled request after the server timeout ceiling', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', fetchUntilAborted);

    const request = requestWorldBlueprint(payload, 'development-token');
    const rejection = expect(request).rejects.toThrow(
      'World Blueprint generation timed out. No Story Seed data was changed; please retry.',
    );
    await vi.advanceTimersByTimeAsync(130_000);

    await rejection;
  });

  it('still honors caller cancellation', async () => {
    vi.stubGlobal('fetch', fetchUntilAborted);
    const controller = new AbortController();

    const request = requestWorldBlueprint(payload, 'development-token', controller.signal);
    controller.abort(new DOMException('Scenario changed', 'AbortError'));

    await expect(request).rejects.toThrow('Scenario changed');
  });
});
