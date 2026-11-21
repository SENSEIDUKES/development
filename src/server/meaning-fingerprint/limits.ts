/**
 * Fingerprints are cheap (a fraction of a cent each) but not free: a visitor on
 * the Development deployment may ask for 300 a day. The owner's access token
 * lifts it.
 */
export const MEANING_FINGERPRINT_VISITOR_LIMIT = {
  key: 'meaning-fingerprint',
  limit: 300,
  windowMs: 24 * 60 * 60 * 1_000,
};
