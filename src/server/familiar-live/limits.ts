/**
 * Live talk spends provider credit by the minute, so a visitor may start 30
 * conversations a day on the Development deployment, each at most ten
 * minutes. The owner's access token lifts the daily count.
 */
export const FAMILIAR_LIVE_VISITOR_LIMIT = {
  key: 'familiar-live',
  limit: 30,
  windowMs: 24 * 60 * 60 * 1_000,
};

/** One conversation's longest run; the token stops working after it. */
export const FAMILIAR_LIVE_SESSION_MS = 10 * 60 * 1_000;
