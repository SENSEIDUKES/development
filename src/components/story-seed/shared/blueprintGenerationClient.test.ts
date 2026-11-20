import { afterEach, describe, expect, it, vi } from 'vitest';
import { type BlueprintGenerationPayload } from '@seihouse/sen/story-seed';
import { BlueprintRequestError, requestWorldBlueprint } from '../../../host/story-seed/blueprintGenerationClient';

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
        fateSurvival: { enabled: false, pressure: 'immortal' },
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

describe('Blueprint generation client: the Blueprint model', () => {
  it('uses the Blueprint preference independently of the chapter model and reasoning', async () => {
    const bodies: unknown[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ title: 'Blueprint' }), { status: 200 });
    }));
    const model = 'anthropic/claude-haiku-5-5';
    let blueprint: { model?: string; reasoningLevel?: string } = {};
    vi.stubGlobal('window', { localStorage: { getItem: () => JSON.stringify({ chapters: model, reasoning: { [model]: 'low' }, blueprint }) } });
    await requestWorldBlueprint(payload, 'development-token');
    blueprint = { model, reasoningLevel: 'high' };
    await requestWorldBlueprint(payload, 'development-token');
    blueprint = { reasoningLevel: 'medium' };
    await requestWorldBlueprint(payload, 'development-token');
    expect(bodies).toEqual([
      payload,
      { ...payload, model, reasoningLevel: 'high' },
      { ...payload, reasoningLevel: 'medium' },
    ]);
  });
});

describe('Blueprint generation client cancellation', () => {
  it('times out a stalled request after the server timeout ceiling', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', fetchUntilAborted);

    const request = requestWorldBlueprint(payload, 'development-token');
    const rejection = expect(request).rejects.toThrow(
      'World Blueprint generation timed out. No Story Seed data was changed; please retry.',
    );
    let settled = false;
    void request.catch(() => undefined).finally(() => { settled = true; });
    // The server's route runs up to 180 seconds; its own answer arrives first.
    await vi.advanceTimersByTimeAsync(185_000);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(5_000);

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

describe('Blueprint generation client refusals', () => {
  it('carries the server\'s status, so a host can ask again for a token the server did not accept', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'A valid Development Story Seed access token is required.' }), { status: 401 })));

    const refusal = await requestWorldBlueprint(payload, 'wrong-token').catch((error: unknown) => error);
    expect(refusal).toBeInstanceOf(BlueprintRequestError);
    expect(refusal).toMatchObject({ status: 401, message: 'A valid Development Story Seed access token is required.' });
  });
});
