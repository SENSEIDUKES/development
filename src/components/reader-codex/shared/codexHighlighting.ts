import type { StoryMemory } from './types';

export type CodexTermType = 'character' | 'faction' | 'artifact' | 'location';

export interface CodexTerm {
  /** The literal text matched in chapter prose. */
  term: string;
  /** Category that decides the rendered highlight colour. */
  type: CodexTermType;
  /** The Codex entry the hovercard and reveal card render. */
  entry: any;
  /** False when `term` is an alias rather than the entry's canonical name. */
  isCanonicalName: boolean;
}

export interface CodexHighlighter {
  /** Single-group matcher; `String.split` keeps matches at odd indices. */
  regex: RegExp | null;
  /** Case-insensitive lookup for a matched fragment. */
  resolve(matched: string): CodexTerm | undefined;
  terms: CodexTerm[];
}

export interface CodexSegment {
  text: string;
  /** Present when this segment is a Codex mention that should be coloured. */
  match?: CodexTerm;
}

const MIN_TERM_LENGTH = 3;

/**
 * Scripts written without spaces, where a neighbouring letter is normal rather
 * than evidence that the match ran into a longer word. Guarding these with a
 * word boundary would mean a Han or Kana name never matched at all.
 */
const UNSPACED_SCRIPT = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/;

const WORD_EDGE = /[\p{L}\p{N}_]/u;

/** Escape every RegExp metacharacter. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function boundedPattern(term: string): string {
  const escaped = escapeRegExp(term);
  if (UNSPACED_SCRIPT.test(term)) return escaped;
  const prefix = WORD_EDGE.test(term[0]) ? '(?<![\\p{L}\\p{N}_])' : '';
  const suffix = WORD_EDGE.test(term[term.length - 1]) ? '(?![\\p{L}\\p{N}_])' : '';
  return `${prefix}${escaped}${suffix}`;
}

/**
 * Every name and alias the reader may colour, longest first.
 *
 * Aliases are first-class Codex data — they are extracted, persisted as their
 * own rows and hydrated back — but the reader only ever offered canonical
 * names, so an entity introduced by its alias in the prose read as plain text
 * with no colour, hovercard or reveal card.
 */
export function collectCodexTerms(memory: StoryMemory | undefined): CodexTerm[] {
  const terms: CodexTerm[] = [];
  if (!memory) return terms;

  const groups = [
    { entries: memory.characters, type: 'character' as const },
    { entries: memory.factions, type: 'faction' as const },
    { entries: memory.artifacts, type: 'artifact' as const },
    { entries: memory.locations, type: 'location' as const },
  ];

  const seen = new Set<string>();
  const push = (term: unknown, type: CodexTermType, entry: any, isCanonicalName: boolean) => {
    if (typeof term !== 'string') return;
    const trimmed = term.trim();
    if (trimmed.length <= MIN_TERM_LENGTH - 1) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    terms.push({ term: trimmed, type, entry, isCanonicalName });
  };

  // A malformed replica must not take the reader down with it: a story that
  // arrives from an import, an older local cache, or a partial hydration can
  // hold a non-array where a collection or an alias list is expected, and a
  // bare `.forEach` on it throws while rendering the chapter.
  const each = (value: unknown, visit: (item: any) => void) => {
    if (Array.isArray(value)) value.forEach(visit);
  };

  // Canonical names claim their text before aliases, so an alias that collides
  // with another entity's real name never steals that entity's colour.
  for (const { entries, type } of groups) {
    each(entries, entry => push(entry?.name, type, entry, true));
  }
  for (const { entries, type } of groups) {
    each(entries, entry => each(entry?.aliases, alias => push(alias, type, entry, false)));
  }

  return terms.sort((left, right) => right.term.length - left.term.length);
}

/**
 * Compile the matcher used by the reader.
 *
 * The previous escape expression (`/[.*+?^${}()|[\\\ ]]/g`) closed its
 * character class early, so it matched nothing and no term was ever escaped.
 * A single entity called "Ye Mo (Reborn)" therefore injected an extra capture
 * group into the alternation, which shifted `String.split`'s match positions
 * and silently dropped the colour mapping for every name in the chapter.
 */
export function createCodexHighlighter(terms: CodexTerm[]): CodexHighlighter {
  const byText = new Map<string, CodexTerm>();
  for (const term of terms) {
    const key = term.term.toLowerCase();
    if (!byText.has(key)) byText.set(key, term);
  }

  const patterns = terms.map(term => boundedPattern(term.term)).filter(Boolean);
  let regex: RegExp | null = null;
  if (patterns.length > 0) {
    try {
      regex = new RegExp(`(${patterns.join('|')})`, 'giu');
    } catch (error) {
      console.warn('Codex highlight matcher could not be compiled.', error);
      regex = null;
    }
  }

  return {
    regex,
    terms,
    resolve: (matched: string) =>
      typeof matched === 'string' ? byText.get(matched.trim().toLowerCase()) : undefined,
  };
}

/**
 * Split a paragraph into plain runs and Codex mentions.
 *
 * The reader used to inline this with a bare `index % 2` convention over
 * `String.split`, which is only sound while the compiled alternation holds
 * exactly one capture group. Owning the split here keeps that invariant in one
 * place and lets the whole match-to-colour chain be tested directly.
 */
export function splitByCodexTerms(
  text: string,
  highlighter: CodexHighlighter,
): CodexSegment[] {
  if (!highlighter.regex || highlighter.terms.length === 0) return [{ text }];
  const parts = text.split(highlighter.regex);
  if (parts.length === 1) return [{ text }];
  return parts.map((part, index) => (
    index % 2 === 0 ? { text: part } : { text: part, match: highlighter.resolve(part) }
  ));
}
