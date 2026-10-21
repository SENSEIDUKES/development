import { afterEach, describe, expect, it, vi } from 'vitest';

// The guard is what is tested: the HARNESS itself answers at once and calls no model.
vi.mock('./http', () => ({ handleHarnessGenerationHttp: vi.fn(async () => ({ status: 200, body: {} })) }));

const { default: harnessGenerationHandler } = await import('./vercelHandler');

/** One request from a visitor on the page serving the endpoint, without the owner's token; its answer's status. */
const send = async (body: unknown, visitor: string) => {
  let answered = 0;
  const response = {
    setHeader: () => undefined,
    status(code: number) { answered = code; return response; },
    json: () => undefined,
  };
  await harnessGenerationHandler({ method: 'POST', body, headers: { origin: 'https://dev.example', host: 'dev.example', 'x-forwarded-for': visitor } }, response);
  return answered;
};

afterEach(() => vi.unstubAllEnvs());

describe('the hosted HARNESS endpoint', () => {
  it('counts the planner\'s calls apart from a visitor\'s chapters, so planning never uses them up', async () => {
    vi.stubEnv('STORY_SEED_BLUEPRINT_ACCESS_TOKEN', '');
    const plan = { operation: 'plan-chapter' };
    const chapter = { immediateChapterRequest: { chapterNumber: 1 } };
    for (let call = 0; call < 6; call += 1) expect(await send(plan, '203.0.113.7')).toBe(200);
    expect(await send(plan, '203.0.113.7')).toBe(429);
    // The visitor's six chapters are all still there.
    for (let call = 0; call < 6; call += 1) expect(await send(chapter, '203.0.113.7')).toBe(200);
    expect(await send(chapter, '203.0.113.7')).toBe(429);
  });
});
