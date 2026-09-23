import { useEffect, useRef } from 'react';

/**
 * Re-reads balance projections whenever a reward projection is replaced by a
 * newer server answer — a scroll opened or was earned, a Relic landed, QI was
 * offered to a Familiar. The reward surfaces never adjust a balance
 * themselves; the host passes the snapshot it watches and the refresh for the
 * balances that reward can move.
 *
 * The first answer only records a baseline: loading a snapshot is not a
 * reward landing.
 */
export function useRefreshWhenReplaced(value: unknown, refresh: () => unknown) {
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current && value && previous.current !== value) void refresh();
    previous.current = value;
  }, [value, refresh]);
}
