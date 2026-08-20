import { describe, expect, it } from 'vitest';
import { createPublicGenerationGuard } from './publicGenerationGuard';

const request = (overrides: Record<string, string> = {}) => ({
  headers: {
    host: 'dev.seaportal.world',
    origin: 'https://dev.seaportal.world',
    'x-forwarded-for': '198.51.100.10',
    ...overrides,
  },
});

describe('public Development generation guard', () => {
  it('allows the current Library page but rejects another site', () => {
    const guard = createPublicGenerationGuard({ key: 'chapter', limit: 2, windowMs: 60_000 });

    expect(guard(request())).toEqual({ allowed: true });
    expect(guard(request({ origin: 'https://unrelated.example' }))).toMatchObject({
      allowed: false,
      status: 403,
    });
  });

  it('enforces a separate temporary budget per visitor', () => {
    let current = 1_000;
    const guard = createPublicGenerationGuard(
      { key: 'voice', limit: 1, windowMs: 5_000 },
      () => current,
    );

    expect(guard(request())).toEqual({ allowed: true });
    expect(guard(request())).toMatchObject({ allowed: false, status: 429, retryAfterSeconds: 5 });
    expect(guard(request({ 'x-forwarded-for': '203.0.113.20' }))).toEqual({ allowed: true });

    current += 5_000;
    expect(guard(request())).toEqual({ allowed: true });
  });
});
