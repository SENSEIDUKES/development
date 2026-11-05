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
 * What the catalog says about a question, best match first: an explained topic
 * matches when every word of the question appears in its title, its aliases or
 * its own text. An empty result is the honest answer that nothing was written
 * about this, and the caller may record it as a question the docs do not cover.
 */
export function lookUpDocs(catalog: DocsCatalog, query: string, limit = DOCS_LOOKUP_LIMIT): DocsLookupHit[] {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits = catalog.flatMap(category => category.topics
    .filter(docsTopicExplained)
    .map(topic => ({ topic, category: category.title })));
  const matched = hits.filter(({ topic, category }) => {
    const text = [topic.title, ...topic.aliases, topic.definition, topic.howItFits, category]
      .filter(Boolean).join(' ').toLocaleLowerCase();
    return words.every(word => text.includes(word));
  });
  // A question that names a topic should reach that topic, not whatever mentions it in passing.
  const named = (hit: DocsLookupHit) =>
    [hit.topic.title, ...hit.topic.aliases].some(name => words.every(word => name.toLocaleLowerCase().includes(word)));
  return [...matched.filter(named), ...matched.filter(hit => !named(hit))].slice(0, limit);
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
