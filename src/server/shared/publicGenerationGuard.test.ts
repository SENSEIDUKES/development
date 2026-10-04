import { describe, expect, it } from 'vitest';
import { createPublicGenerationGuard, developmentAccessToken, ownerTokenAdmission } from './publicGenerationGuard';

const request = (overrides: Record<string, string> = {}) => ({
  headers: {
    host: 'dev.seaportal.world',
    origin: 'https://dev.seaportal.world',
    'x-forwarded-for': '198.51.100.10',
    ...overrides,
  },
});

describe('public Development generation guard', () => {
  it("lets the owner's access token through, refuses another token, and leaves the rest to the visitor limit", () => {
    const owner = developmentAccessToken({ STORY_SEED_BLUEPRINT_ACCESS_TOKEN: ' owner-token ' });
    expect(owner).toBe('owner-token');
    expect(ownerTokenAdmission(request({ authorization: 'Bearer owner-token' }), owner)).toEqual({ allowed: true });
    // From another site too: the token, not the page, is what counts.
    expect(ownerTokenAdmission(request({ authorization: 'Bearer owner-token', origin: 'https://unrelated.example' }), owner)).toEqual({ allowed: true });
    expect(ownerTokenAdmission(request({ authorization: 'Bearer wrong-token' }), owner)).toEqual({
      allowed: false, status: 401, error: 'The access token was not accepted.',
    });
    // No token sent, or no token set on this server: the visitor limit decides.
    expect(ownerTokenAdmission(request(), owner)).toBeUndefined();
    expect(ownerTokenAdmission(request({ authorization: 'Bearer owner-token' }), developmentAccessToken({}))).toBeUndefined();
  });

  it('never counts an owner request against the visitor limit', () => {
    const guard = createPublicGenerationGuard({ key: 'chapter', limit: 1, windowMs: 60_000 });
    const admit = (headers: Record<string, string> = {}) => ownerTokenAdmission(request(headers), 'owner-token') ?? guard(request(headers));
    for (let chapter = 0; chapter < 10; chapter += 1) expect(admit({ authorization: 'Bearer owner-token' })).toEqual({ allowed: true });
    expect(admit()).toEqual({ allowed: true });
    expect(admit()).toMatchObject({ allowed: false, status: 429 });
  });

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

  it('reaps expired visitors on each call so the window map does not grow without bound', () => {
    let current = 1_000;
    const guard = createPublicGenerationGuard(
      { key: 'reap', limit: 5, windowMs: 1_000 },
      () => current,
    );

    for (let index = 0; index < 20; index += 1) {
      expect(guard(request({ 'x-forwarded-for': `198.51.100.${index + 1}` }))).toEqual({
        allowed: true,
      });
    }

    current += 1_000;

    // Once the window has elapsed every prior visitor is reaped before the new
    // request is admitted, so the limiter still has room for a fresh entry.
    expect(guard(request({ 'x-forwarded-for': '198.51.100.99' }))).toEqual({ allowed: true });
  });
});
