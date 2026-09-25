import { afterEach, describe, expect, it, vi } from 'vitest';
import { type BlueprintGenerationPayload } from '@seihouse/sen/story-seed';
import { requestArcRoadmapExtension, requestWorldBlueprint } from '../../../host/story-seed/blueprintGenerationClient';

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
        funSettings: {},
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

describe('Adding arcs through the Blueprint client', () => {
  const extension = { operation: 'extend-arc-roadmap' as const, storySeed: payload.storySeed, blueprint: {} as never, arcCount: 5 };
  const added = [{ arcNumber: 3, goals: [{ id: 'arc-3-new', text: 'Cross the second moon.', chapters: 100 }] }];

  it('posts the extension request and returns only the new arcs', async () => {
    const fetchNewArcs = vi.fn(async () => new Response(JSON.stringify({ addedArcPlans: added }), { status: 200 }));
    vi.stubGlobal('fetch', fetchNewArcs);
    await expect(requestArcRoadmapExtension(extension, 'development-token')).resolves.toEqual(added);
    const [, init] = fetchNewArcs.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({ operation: 'extend-arc-roadmap', arcCount: 5 });
  });

  it('reports the server reason as it is', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'The model planned 1 of the 2 new arcs. Nothing was added; try again.' }), { status: 502 })));
    await expect(requestArcRoadmapExtension(extension, 'development-token')).rejects.toThrow('The model planned 1 of the 2 new arcs.');
    await expect(requestArcRoadmapExtension(extension, ' ')).rejects.toThrow('before adding arcs');
  });
});
