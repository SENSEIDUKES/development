/**
 * Story Sparks are free: a visitor may seek 20 a day on the Development
 * deployment, so they cannot be spammed. The owner's access token lifts it.
 */
export const STORY_SPARK_VISITOR_LIMIT = {
  key: 'story-spark',
  limit: 20,
  windowMs: 24 * 60 * 60 * 1_000,
};
