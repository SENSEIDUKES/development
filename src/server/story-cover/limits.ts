/** Visitors may make a few covers; the owner's access token lifts the limit (the owner's choice, 2026-10-08). */
export const STORY_COVER_VISITOR_LIMIT = { key: 'story-cover', limit: 3, windowMs: 30 * 60 * 1_000 } as const;
