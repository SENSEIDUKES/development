import { ownerTokenAdmission, type createPublicGenerationGuard, type RequestWithHeaders } from '../shared/publicGenerationGuard';

/**
 * Story Sparks are free: a visitor may seek 20 a day on the Development
 * deployment, so they cannot be spammed. The owner's access token lifts it.
 */
export const STORY_SPARK_VISITOR_LIMIT = {
  key: 'story-spark',
  limit: 20,
  windowMs: 24 * 60 * 60 * 1_000,
};

/** Report the existing guard's budget on status, success and error responses. */
export const storySparkUsageHeaders = (
  request: RequestWithHeaders,
  guard: ReturnType<typeof createPublicGenerationGuard>,
  ownerToken?: string,
): Record<string, string> => {
  if (ownerTokenAdmission(request, ownerToken)?.allowed) return { 'X-Sparks-Unlimited': 'true' };
  const usage = guard.usage(request);
  return {
    'X-Sparks-Limit': String(usage.limit),
    'X-Sparks-Remaining': String(usage.remaining),
    ...(usage.resetsAt !== null ? { 'X-Sparks-Reset': String(usage.resetsAt) } : {}),
  };
};
