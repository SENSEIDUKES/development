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

/**
 * A question reduced to the words that carry its meaning: punctuation dropped,
 * so "Story Seed?" and "Story Seed" ask the same thing. If a question is
 * nothing but question words, they are kept, because they are all it has.
 */
function docsQueryWords(query: string): string[] {
  const words = query.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, ' ').split(/\s+/).filter(Boolean);
  const meaningful = words.filter(word => !DOCS_QUESTION_WORDS.has(word));
  return meaningful.length ? meaningful : words;
}

/**
 * Whether a question's word appears in some text, counting a plural as its
 * singular: a reader asking about "arc goals" means the Arc Goal entry.
 */
function docsWordIn(text: string, word: string): boolean {
  return text.includes(word) || (word.length > 3 && word.endsWith('s') && text.includes(word.slice(0, -1)));
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
      const name = [topic.title, ...topic.aliases].join(' ').toLocaleLowerCase();
      const text = [name, topic.definition, topic.howItFits, category.title].filter(Boolean).join(' ').toLocaleLowerCase();
      const inText = words.filter(word => docsWordIn(text, word)).length;
      const inName = words.filter(word => docsWordIn(name, word)).length;
      return { topic, category: category.title, all: inText === words.length, score: inText ? inText + inName * 3 : 0 };
    }));
  // An entry that answers the whole question crowds out one that caught a single
  // word of it, so a spoken answer is not padded with whatever shares a category.
  const matched = scored.filter(hit => hit.score > 0);
  const whole = matched.filter(hit => hit.all);
  return (whole.length ? whole : matched)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ topic, category }) => ({ topic, category }));
}

/** The search a reader types on a docs page: every match, with its category. */
export function searchDocs(catalog: DocsCatalog, query: string) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return catalog.flatMap(category => category.topics
    .filter(topic => {
      const text = [topic.title, ...topic.aliases, topic.definition, topic.howItFits, category.title].join(' ').toLocaleLowerCase();
      return words.every(word => text.includes(word));
    })
    .map(topic => ({ ...topic, category: category.title })));
}
