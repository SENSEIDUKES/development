import { describe, expect, it } from 'vitest';
import {
  DOCS_LOOKUP_LIMIT,
  docsIndex,
  docsTopicText,
  docsTopicsOf,
  findDocsTopic,
  lookUpDocs,
  searchDocs,
  type DocsCatalog,
} from './docsKnowledge';

const catalog: DocsCatalog = [
  {
    id: 'story', title: 'Story', description: 'Story things.',
    topics: [
      { id: 'story-seed', title: 'Story Seed', aliases: ['Seed'], definition: 'The starting place for a new novel.', howItFits: 'It feeds the Blueprint.' },
      { id: 'arc-goal', title: 'Arc Goal', aliases: [], definition: 'An objective for part of an arc.' },
      // Written down but not explained yet: it exists in the catalog and nowhere else.
      { id: 'hard-pin', title: 'Hard Pin', aliases: [] },
    ],
  },
  {
    id: 'rewards', title: 'Rewards', description: 'What a reader earns.',
    topics: [{ id: 'qi', title: 'QI', aliases: ['spendable qi'], definition: 'The spendable currency.', howItFits: 'Spent on a Story Seed.' }],
  },
];

describe('Docs Knowledge', () => {
  it('indexes only what has been explained, by name, so a conversation does not carry the catalog', () => {
    expect(docsTopicsOf(catalog)).toHaveLength(4);
    expect(docsIndex(catalog)).toEqual([
      { id: 'story-seed', title: 'Story Seed', category: 'Story' },
      { id: 'arc-goal', title: 'Arc Goal', category: 'Story' },
      { id: 'qi', title: 'QI', category: 'Rewards' },
    ]);
    // An unexplained topic has nothing to look up, so it is never offered.
    expect(docsIndex(catalog).some(entry => entry.id === 'hard-pin')).toBe(false);
    expect(JSON.stringify(docsIndex(catalog))).not.toContain('The starting place');
  });

  it('reads an entry back with what the host wrote, and nothing else', () => {
    expect(docsTopicText(findDocsTopic(catalog, 'story-seed')!, 'Story'))
      .toBe('Story Seed (Story): The starting place for a new novel. It feeds the Blueprint.');
    expect(docsTopicText(findDocsTopic(catalog, 'arc-goal')!)).toBe('Arc Goal: An objective for part of an arc.');
    expect(findDocsTopic(catalog, 'not-a-topic')).toBeUndefined();
  });

  it('looks a question up by name, alias or wording, and answers with nothing when the docs do not cover it', () => {
    // Named first, then whatever else mentions it, so the entry asked for leads the answer.
    expect(lookUpDocs(catalog, 'story seed').map(hit => hit.topic.id)).toEqual(['story-seed', 'qi']);
    expect(lookUpDocs(catalog, 'Seed').map(hit => hit.topic.id)).toEqual(['story-seed', 'qi']);
    // A question that names a topic reaches that topic, not whatever mentions it in passing.
    expect(lookUpDocs(catalog, 'qi')[0].topic.id).toBe('qi');
    expect(lookUpDocs(catalog, 'arc')[0].topic.id).toBe('arc-goal');
    // Nothing written about it: the caller says so instead of filling the gap.
    expect(lookUpDocs(catalog, 'refunds')).toEqual([]);
    expect(lookUpDocs(catalog, '   ')).toEqual([]);
    // An unexplained topic is never a hit, even by its own name.
    expect(lookUpDocs(catalog, 'Hard Pin')).toEqual([]);
    expect(lookUpDocs(catalog, 'the', 2)).toHaveLength(2);
    expect(DOCS_LOOKUP_LIMIT).toBe(3);
  });

  it('reads a question as a reader asks it, not as an exact title', () => {
    // A companion is told to pass the reader's question in its own words, so the
    // wording around the topic must not decide whether the docs answer at all.
    for (const question of ['Story Seed', 'story seed?', 'What is a Story Seed?', 'tell me about the story seed', 'what is a story seed']) {
      expect(lookUpDocs(catalog, question)[0].topic.id, question).toBe('story-seed');
    }
    // A plural reaches its entry: "arc goals" is the Arc Goal entry.
    expect(lookUpDocs(catalog, 'how do arc goals work')[0].topic.id).toBe('arc-goal');
    // Question words alone decide nothing, and a question the docs do not cover still finds nothing.
    expect(lookUpDocs(catalog, 'what is a refund policy?')).toEqual([]);
    expect(lookUpDocs(catalog, '??!')).toEqual([]);
  });

  it('matches whole words, so a fragment inside another word never answers a question', () => {
    // "art" sits inside "starting" and "ad" inside "Roadmap". On a substring match an
    // unanswerable question comes back looking answered, which is worse than finding
    // nothing: the companion would speak as though the docs covered it.
    expect(lookUpDocs(catalog, 'what is art')).toEqual([]);
    expect(lookUpDocs(catalog, 'What is an ad?')).toEqual([]);
    expect(lookUpDocs(catalog, 'tart')).toEqual([]);
    // The whole word still reaches its entry, punctuation and all.
    expect(lookUpDocs(catalog, 'arc')[0].topic.id).toBe('arc-goal');
    expect(lookUpDocs(catalog, 'what is QI?')[0].topic.id).toBe('qi');
  });

  it('searches the whole catalog for a reader typing on the docs page, explained or not', () => {
    expect(searchDocs(catalog, 'hard pin').map(topic => topic.id)).toEqual(['hard-pin']);
    expect(searchDocs(catalog, 'not-a-real-term')).toEqual([]);
  });
});
