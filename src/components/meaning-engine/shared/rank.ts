import { meaningSimilarity, type Fingerprint } from './fingerprint';

/**
 * How well each candidate fits a query, on one shared scale.
 *
 * Raw similarities from an embedding model sit in a narrow band that moves with
 * the model and the query, so they cannot be blended with other signals as they
 * are. This measures each candidate against the whole field for one query: a
 * candidate has to stand clearly above the field to count at all, and one far
 * above it scores 1. A query nothing fits well gives a field of zeros instead of
 * a confident winner.
 */
export const meaningFit = <Key extends string>(
  query: Fingerprint,
  candidates: Iterable<readonly [Key, Fingerprint]>,
): Map<Key, number> => {
  const raw: [Key, number][] = [];
  for (const [key, fingerprint] of candidates) raw.push([key, meaningSimilarity(query, fingerprint)]);
  if (!raw.length) return new Map();
  const mean = raw.reduce((sum, [, value]) => sum + value, 0) / raw.length;
  const spread = Math.sqrt(raw.reduce((sum, [, value]) => sum + (value - mean) ** 2, 0) / raw.length);
  // One deviation above the field is where a real fit starts; three and a half is a clear match.
  // A candidate pointing away from the query never fits, however far below it the rest of the field sits.
  return new Map(raw.map(([key, value]) => [key, spread && value > 0 ? Math.max(0, Math.min(1, ((value - mean) / spread - 1) / 2.5)) : 0]));
};

export interface SpreadCandidate<Key extends string> {
  key: Key;
  /** How much this candidate is wanted before spread is considered; higher is better. */
  score: number;
  fingerprint?: Fingerprint;
  /** Candidates in one group say the same kind of thing; each further pick from a group counts for less. */
  group?: string;
}

export interface SpreadOptions<Key extends string> {
  limit: number;
  /** Already chosen: nothing that repeats one of these is picked. */
  taken?: Iterable<{ key: Key; fingerprint?: Fingerprint }>;
  /** Two fingerprints at least this similar say the same thing; the weaker one is left out. */
  sameMeaning: number;
  /** How strongly closeness to an earlier pick lowers a candidate, from 0 (ignore) to 1. */
  variety?: number;
}

/**
 * Pick the best candidates without saying the same thing twice.
 *
 * Takes the strongest candidate, then keeps choosing whichever remaining one is
 * both wanted and unlike what is already chosen. A candidate that means the same
 * as something chosen is dropped outright, which is what keeps five wordings of
 * one idea from filling a list.
 */
export const pickSpread = <Key extends string>(
  candidates: readonly SpreadCandidate<Key>[],
  { limit, taken = [], sameMeaning, variety = 0.35 }: SpreadOptions<Key>,
): Key[] => {
  const chosen: { fingerprint?: Fingerprint }[] = [...taken];
  const groups = new Map<string, number>();
  // A key that is taken, or offered twice, is never picked, with or without a fingerprint.
  const seen = new Set<Key>([...taken].map(entry => entry.key));
  const pool = candidates.filter(candidate => candidate.score > 0 && !seen.has(candidate.key) && Boolean(seen.add(candidate.key)));
  const picked: Key[] = [];
  while (pool.length && picked.length < limit) {
    let best = -1;
    let bestScore = 0;
    for (let index = pool.length - 1; index >= 0; index -= 1) {
      const candidate = pool[index];
      let closest = 0;
      if (candidate.fingerprint) {
        for (const other of chosen) {
          if (other.fingerprint) closest = Math.max(closest, meaningSimilarity(candidate.fingerprint, other.fingerprint));
        }
      }
      if (closest >= sameMeaning) {
        pool.splice(index, 1);
        if (best > index) best -= 1;
        continue;
      }
      const crowding = 1 + (candidate.group ? groups.get(candidate.group) ?? 0 : 0) * 0.25;
      const score = (candidate.score * (1 - variety * closest)) / crowding;
      if (best < 0 || score > bestScore || (score === bestScore && candidate.key < pool[best].key)) {
        best = index;
        bestScore = score;
      }
    }
    if (best < 0) break;
    const [winner] = pool.splice(best, 1);
    picked.push(winner.key);
    chosen.push(winner);
    if (winner.group) groups.set(winner.group, (groups.get(winner.group) ?? 0) + 1);
  }
  return picked;
};
