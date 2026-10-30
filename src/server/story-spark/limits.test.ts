import { expect, it } from 'vitest';
import { createPublicGenerationGuard, ownerTokenAdmission } from '../shared/publicGenerationGuard';
import { STORY_SPARK_VISITOR_LIMIT, storySparkUsageHeaders } from './limits';

const request = (extra: Record<string, string> = {}) => ({ headers: {
  host: 'example.test', origin: 'https://example.test', 'x-forwarded-for': '192.0.2.1', ...extra,
} });

it('reports the existing twenty-request window without spending requests, and refreshes after expiry', () => {
  let now = 1000;
  const guard = createPublicGenerationGuard(STORY_SPARK_VISITOR_LIMIT, () => now);
  for (let i = 0; i < 25; i++) expect(storySparkUsageHeaders(request(), guard)).toEqual({
    'X-Sparks-Limit': '20', 'X-Sparks-Remaining': '20',
  });
  for (let i = 0; i < 20; i++) expect(guard(request())).toEqual({ allowed: true });
  expect(guard(request())).toMatchObject({ allowed: false, status: 429 });
  expect(storySparkUsageHeaders(request(), guard)).toEqual({
    'X-Sparks-Limit': '20', 'X-Sparks-Remaining': '0', 'X-Sparks-Reset': String(now + STORY_SPARK_VISITOR_LIMIT.windowMs),
  });
  expect(guard.usage(request({ 'x-forwarded-for': '192.0.2.2' })).remaining).toBe(20);
  now += STORY_SPARK_VISITOR_LIMIT.windowMs;
  expect(guard.usage(request())).toEqual({ limit: 20, remaining: 20, resetsAt: null });
});

it('reports unlimited only for a valid owner token and does not charge the visitor window', () => {
  const guard = createPublicGenerationGuard(STORY_SPARK_VISITOR_LIMIT);
  const owner = request({ authorization: 'Bearer owner-token' });
  for (let i = 0; i < 25; i++) expect(ownerTokenAdmission(owner, 'owner-token') ?? guard(owner)).toEqual({ allowed: true });
  expect(storySparkUsageHeaders(owner, guard, 'owner-token')).toEqual({ 'X-Sparks-Unlimited': 'true' });
  expect(storySparkUsageHeaders(request({ authorization: 'Bearer wrong' }), guard, 'owner-token')).toEqual({
    'X-Sparks-Limit': '20', 'X-Sparks-Remaining': '20',
  });
});
