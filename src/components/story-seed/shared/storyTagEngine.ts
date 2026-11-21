import { decodeFingerprint, meaningSimilarity, type Fingerprint } from '../../meaning-engine/shared/fingerprint';
import { meaningFit, pickSpread, type SpreadCandidate } from '../../meaning-engine/shared/rank';
import { normalizeStoryTagIdentity, STORY_TAG_CATALOG, type StoryTagMetadata } from './storyTagCatalog';
import { findStoryTagNiche } from './storyTagNiches';

/**
 * The Story Tag engine: which tags to suggest for this story, next.
 *
 * The creator always chooses their own tags (SENSEI, 2026-11-21); the engine
 * only suggests, and never assigns. It blends four signals:
 *
 * 1. Fit to the synopsis. With meaning fingerprints, every tag is compared with
 *    what the synopsis means, so a takeover story lands near "infrastructure
 *    growth" without using those words. A tag or alias the synopsis names
 *    outright always counts, with or without fingerprints.
 * 2. Fit to the genre: the genre's starter set, its defining tags first.
 * 3. Company: tags that sit near the ones already picked.
 * 4. Spread: nothing that says the same thing as a picked or suggested tag, and
 *    each further tag from one family counts for less.
 *
 * Fingerprints are optional. Without them (no model key, or still loading) the
 * engine works from the genre and the words of the synopsis alone.
 */
export interface StoryTagMeaning {
  /** Every catalog tag's stored fingerprint, by tag identity. */
  tags: ReadonlyMap<string, Fingerprint>;
  /** The synopsis, fingerprinted by the host with the same model. */
  synopsis?: Fingerprint;
  /** Fingerprints of the creator's own tags, by tag identity. */
  custom?: ReadonlyMap<string, Fingerprint>;
}

export interface StoryTagSuggestionInput {
  synopsis?: string;
  genre?: string;
  style?: string;
  /** Tags already on the story. */
  picked?: readonly string[];
  /** Suggestions already offered and passed over, so asking for more gives new ones. */
  skip?: readonly string[];
  limit?: number;
  meaning?: StoryTagMeaning;
}

export const STORY_TAG_SUGGESTION_LIMIT = 8;

/**
 * Two tag meanings at least this alike say one thing in two wordings ("returner"
 * and "revenge returner", "quest systems" and "system missions"). Measured on
 * the stored fingerprints: about one pair of tags in a thousand is this close.
 */
export const SAME_TAG_MEANING = 0.75;
/** Around this, two tags are merely both story tags; above it they keep company. */
const UNRELATED_TAG_MEANING = 0.56;

const WEIGHT = { named: 1, fit: 1, genreCore: 0.45, genreNiche: 0.2, company: 0.25, style: 0.05 };
/** Below this a tag has no real case: no filler when the story says little. */
const MINIMUM_SCORE = 0.2;

const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const containsPhrase = (text: string, phrase: string) => (` ${text} `).includes(` ${phrase} `);
const catalog = [...new Map(STORY_TAG_CATALOG.map(entry => [normalizeStoryTagIdentity(entry.label), entry])).entries()].map(([identity, entry]) => ({
  identity,
  entry,
  phrases: [entry.label, ...entry.aliases].map(normalize).filter(Boolean),
}));

const NEGATION = /\b(?:no|without|not|never)\s+([^,.!?;]+?)(?=\b(?:but|instead|yet)\b|[,.;!?]|$)/gi;
/**
 * What the synopsis rules out, as the things named right after the negation
 * ("no romance", "without fighting or magic"). Words further along the clause are
 * not ruled out: "no money studies magic and romance" and "no money and studies
 * magic and romance" both still have magic and romance. A list carries on only
 * from a bare first item of a word or two, and only through items that are a
 * tag's own name; anything else has moved on to saying something new.
 * Word-level only: implied intent is the fingerprint's job.
 */
const LEADING = /^(?:(?:no|not|without|never|any|a|an|the|more) )+/;
const tagPhrases = new Set(catalog.flatMap(entry => entry.phrases));
const ruledOut = (synopsis: string) => [...synopsis.matchAll(NEGATION)].flatMap(match => {
  const [first, ...rest] = normalize(match[1]).split(/ (?:or|nor|and) /).map(part => part.replace(LEADING, '')).filter(Boolean);
  if (!first) return [];
  if (first.split(' ').length > 2) return [first];
  const stop = rest.findIndex(item => !tagPhrases.has(item));
  return [first, ...(stop < 0 ? rest : rest.slice(0, stop))];
});
const startsWithPhrase = (text: string, phrase: string) => text === phrase || text.startsWith(`${phrase} `);

/** Read `storyTagFingerprints.json` into the map the engine compares against. */
export const readStoryTagFingerprints = (stored: { tags: Record<string, readonly [string, string]> }): Map<string, Fingerprint> =>
  new Map(Object.entries(stored.tags).map(([label, [, fingerprint]]) => [normalizeStoryTagIdentity(label), decodeFingerprint(fingerprint)]));

/** The best tags to offer next, strongest first. An empty story gets none. */
export const suggestStoryTags = (input: StoryTagSuggestionInput): StoryTagMetadata[] => {
  const raw = input.synopsis ?? '';
  const exclusions = ruledOut(raw);
  const synopsis = normalize(raw);
  const picked = new Set((input.picked ?? []).map(normalizeStoryTagIdentity));
  const skip = new Set((input.skip ?? []).map(normalizeStoryTagIdentity));
  const niche = findStoryTagNiche(input.genre);
  const core = new Set(niche?.core.map(normalizeStoryTagIdentity));
  const nicheTags = new Set(niche?.tags.map(normalizeStoryTagIdentity));
  const { meaning } = input;
  const fit = meaning?.synopsis ? meaningFit(meaning.synopsis, meaning.tags) : undefined;
  const taken = [...picked].map(identity => ({ key: identity, fingerprint: meaning?.tags.get(identity) ?? meaning?.custom?.get(identity) }));
  const company = taken.flatMap(entry => entry.fingerprint ? [entry.fingerprint] : []);

  const candidates: SpreadCandidate<string>[] = [];
  for (const { identity, entry, phrases } of catalog) {
    if (picked.has(identity) || skip.has(identity)) continue;
    if (exclusions.some(text => phrases.some(phrase => startsWithPhrase(text, phrase)))) continue;
    const fingerprint = meaning?.tags.get(identity);
    const named = synopsis && phrases.some(phrase => containsPhrase(synopsis, phrase)) ? 1 : 0;
    const nearest = fingerprint ? Math.max(0, ...company.map(other => meaningSimilarity(fingerprint, other))) : 0;
    const keepsCompany = Math.max(0, Math.min(1, (nearest - UNRELATED_TAG_MEANING) / (SAME_TAG_MEANING - UNRELATED_TAG_MEANING)));
    const evidence = WEIGHT.named * named
      + WEIGHT.fit * (fit?.get(identity) ?? 0)
      + (core.has(identity) ? WEIGHT.genreCore : nicheTags.has(identity) ? WEIGHT.genreNiche : 0)
      + WEIGHT.company * keepsCompany;
    if (evidence < MINIMUM_SCORE) continue;
    // Style never supplies evidence on its own: it nudges a tag that already has a case.
    const style = !input.style || entry.styles.includes('all') ? 0
      : entry.styles.some(option => option === input.style) ? WEIGHT.style : -WEIGHT.style;
    candidates.push({ key: identity, score: evidence + style, fingerprint, group: entry.category });
  }

  const byIdentity = new Map(catalog.map(({ identity, entry }) => [identity, entry]));
  return pickSpread(candidates, {
    limit: Math.max(0, Math.min(input.limit ?? STORY_TAG_SUGGESTION_LIMIT, 30)),
    taken,
    sameMeaning: SAME_TAG_MEANING,
  }).map(identity => byIdentity.get(identity)!);
};
