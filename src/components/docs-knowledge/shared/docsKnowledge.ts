/**
 * Docs Knowledge: a structured topic catalog a host writes, and the lookup a
 * grounded companion reads it with.
 *
 * SEN owns the shape and the reading; it never owns the words. A host supplies
 * its own catalog, so a publisher embedding SEN grounds its own companion in
 * its own documentation without touching this file.
 *
 * The reading is built for a live conversation, where the instruction is fixed
 * when the connection opens and cannot be rewritten per question: the companion
 * is given the index at the start and looks an entry up when it needs one,
 * instead of carrying the whole catalog through every exchange.
 */

/** One explained term. `definition` and `howItFits` are absent until its meaning is confirmed. */
export interface DocsTopic {
  id: string;
  title: string;
  aliases: readonly string[];
  definition?: string;
  howItFits?: string;
  related?: readonly string[];
}

export interface DocsCategory {
  id: string;
  title: string;
  description: string;
  topics: readonly DocsTopic[];
}

/** A host's whole catalog. */
export type DocsCatalog = readonly DocsCategory[];

/** One line of the index a companion is given at the start of a conversation. */
export interface DocsIndexEntry {
  id: string;
  title: string;
  category: string;
}

/** Every topic in the catalog, in catalog order. */
export function docsTopicsOf(catalog: DocsCatalog): DocsTopic[] {
  return catalog.flatMap(category => category.topics as DocsTopic[]);
}

/** A topic has an entry only once its meaning is written down. */
export function docsTopicExplained(topic: DocsTopic): boolean {
  return Boolean(topic.definition?.trim());
}

export function findDocsTopic(catalog: DocsCatalog, id: string): DocsTopic | undefined {
  return docsTopicsOf(catalog).find(topic => topic.id === id);
}

/**
 * The index: what the companion is told exists, without what any of it says.
 * Only explained topics, because an unexplained one has nothing to look up.
 *
 * This is what keeps a conversation's cost flat as a catalog grows: writing a
 * new entry adds one short line here, not a paragraph to every exchange.
 */
export function docsIndex(catalog: DocsCatalog): DocsIndexEntry[] {
  return catalog.flatMap(category => category.topics
    .filter(docsTopicExplained)
    .map(topic => ({ id: topic.id, title: topic.title, category: category.title })));
}

/** One entry as a companion reads it back: its name, then what the host wrote. */
export function docsTopicText(topic: DocsTopic, category?: string): string {
  const heading = category ? `${topic.title} (${category})` : topic.title;
  return `${heading}: ${topic.definition ?? ''}${topic.howItFits ? ` ${topic.howItFits}` : ''}`.trim();
}

/** The most entries one lookup returns, so an answer stays short enough to speak. */
export const DOCS_LOOKUP_LIMIT = 3;

export interface DocsLookupHit {
  topic: DocsTopic;
  category: string;
}

/**
 * The words a spoken question is wrapped in. A companion is told to pass the
 * reader's question as it was asked, so "what is a Story Seed?" has to reach
 * the same entry as "Story Seed"; these carry no meaning of their own and
 * would otherwise match everything or nothing.
 */
const DOCS_QUESTION_WORDS = new Set([
  'a', 'about', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'could', 'did', 'do', 'does',
  'explain', 'for', 'from', 'get', 'give', 'had', 'has', 'have', 'how', 'i', 'if', 'in', 'into', 'is', 'it',
  'its', 'me', 'mean', 'means', 'my', 'of', 'on', 'or', 'our', 'should', 'so', 'tell', 'than', 'that', 'the',
  'their', 'them', 'then', 'there', 'these', 'they', 'this', 'to', 'us', 'use', 'used', 'was', 'we', 'were',
  'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'work', 'works', 'would', 'you', 'your',
]);

/** Anything that is not a letter or a number separates two words. */
const DOCS_WORD_SPLIT = /[^\p{L}\p{N}]+/u;

/**
 * Case is folded in one fixed locale, never the reader's. The companion speaks
 * every language, and a device set to Turkish lowercases "ORIGIN" to "orıgın",
 * which would never meet the "origin" written in the catalog.
 */
const DOCS_FOLD_LOCALE = 'en-US';

/**
 * A word reduced so a plural meets its singular: a reader asking about "arc
 * goals" means the Arc Goal entry. Short words are left alone, so "qi" is not
 * mistaken for a plural.
 */
const docsStem = (word: string): string => (word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word);

/**
 * A question reduced to the words that carry its meaning: punctuation dropped,
 * so "Story Seed?" and "Story Seed" ask the same thing. If a question is
 * nothing but question words, they are kept, because they are all it has.
 */
function docsQueryWords(query: string): string[] {
  const words = query.toLocaleLowerCase(DOCS_FOLD_LOCALE).split(DOCS_WORD_SPLIT).filter(Boolean);
  const meaningful = words.filter(word => !DOCS_QUESTION_WORDS.has(word));
  return (meaningful.length ? meaningful : words).map(docsStem);
}

/**
 * The whole words of some text, each reduced the same way a question's are.
 *
 * Matching whole words and not fragments is what keeps a lookup honest: on a
 * substring, "ad" is found inside "Roadmap" and an unanswerable question comes
 * back looking answered, which is worse than finding nothing because the
 * companion then speaks as though the docs covered it.
 */
function docsWordList(text: string): string[] {
  return text.toLocaleLowerCase(DOCS_FOLD_LOCALE).split(DOCS_WORD_SPLIT).filter(Boolean).map(docsStem);
}

function docsWords(text: string): Set<string> {
  return new Set(docsWordList(text));
}

/**
 * Whether one of a topic's names is the question itself. "Reader" has to beat
 * "Reader Chamber", "Reader Codex" and "Reader Language", which all contain the
 * word and would otherwise fill every slot and leave the asked-for entry out.
 */
function docsNamedExactly(topic: DocsTopic, words: string[]): boolean {
  return [topic.title, ...topic.aliases].some(name => {
    const parts = docsWordList(name);
    return parts.length === words.length && parts.every((part, index) => part === words[index]);
  });
}

/**
 * What the catalog says about a question, best match first.
 *
 * The question is matched as a reader would ask it aloud, not as an exact
 * title: its meaningful words are looked for in each explained topic, a topic
 * whose own name is named outranks one that merely mentions it, and matching
 * every word outranks matching some. An empty result means no word of the
 * question appears anywhere in the docs — the honest answer that nothing was
 * written about this, which the caller may record as a question worth an entry.
 */
export function lookUpDocs(catalog: DocsCatalog, query: string, limit = DOCS_LOOKUP_LIMIT): DocsLookupHit[] {
  const words = docsQueryWords(query);
  if (!words.length) return [];
  const scored = catalog.flatMap(category => category.topics
    .filter(docsTopicExplained)
    .map(topic => {
      const name = docsWords([topic.title, ...topic.aliases].join(' '));
      const text = docsWords([topic.title, ...topic.aliases, topic.definition, topic.howItFits, category.title].filter(Boolean).join(' '));
      const inText = words.filter(word => text.has(word)).length;
      const inName = words.filter(word => name.has(word)).length;
      const exact = docsNamedExactly(topic, words) ? 10 : 0;
      return { topic, category: category.title, inName, all: inText === words.length, score: inText ? inText + inName * 3 + exact : 0 };
    }));
  // Overlap is not coverage. An entry that answers the whole question comes
  // first; failing that, only an entry the question actually names is offered,
  // because a question the docs do not cover ("can I change my password?")
  // otherwise comes back answered by whatever happens to share one word with it,
  // and the companion speaks it as though the docs settled the matter.
  const matched = scored.filter(hit => hit.score > 0);
  const whole = matched.filter(hit => hit.all);
  const named = matched.filter(hit => hit.inName > 0);
  return (whole.length ? whole : named)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ topic, category }) => ({ topic, category }));
}

/** The search a reader types on a docs page: every match, with its category. */
export function searchDocs(catalog: DocsCatalog, query: string) {
  const words = query.trim().toLocaleLowerCase(DOCS_FOLD_LOCALE).split(/\s+/).filter(Boolean);
  return catalog.flatMap(category => category.topics
    .filter(topic => {
      const text = [topic.title, ...topic.aliases, topic.definition, topic.howItFits, category.title].join(' ').toLocaleLowerCase(DOCS_FOLD_LOCALE);
      return words.every(word => text.includes(word));
    })
    .map(topic => ({ ...topic, category: category.title })));
}
