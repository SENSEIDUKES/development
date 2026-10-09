import { PROFILE_PICTURE_VARIATIONS } from './prompt';

/** Visitors may make two sets of three portraits every 30 minutes; the owner's access token lifts the limit. */
export const PROFILE_PICTURE_VISITOR_LIMIT = { key: 'profile-picture', limit: 2 * PROFILE_PICTURE_VARIATIONS, windowMs: 30 * 60 * 1_000 } as const;
