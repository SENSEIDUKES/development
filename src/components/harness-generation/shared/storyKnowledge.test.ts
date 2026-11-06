import { describe, expect, it } from 'vitest';
import { docsIndex, docsTopicText, lookUpDocs } from '../../docs-knowledge/shared/docsKnowledge';
import { HOLDING_CHANGE_KIND, type CodexEntry, type HoldingChangeAttachment, type HoldingVerb } from '../../../narrative/holdings';
import { SPEAKER_KIND, type SpeakerAttachment } from '../../../narrative/speech';
import { deriveStoryCodex, type StoryCodexChapter } from './storyCodex';
import { STORY_KNOWLEDGE_CATEGORIES, storyKnowledge, storyKnowledgeOf, storySpoilers } from './storyKnowledge';
import { APPEARANCE_KIND, type AppearanceAttachment, type AppearancePayload } from '../../../narrative/appearances';
import type { HarnessChapter, HarnessWorkspaceState } from '../../../narrative/generation';

const MC: CodexEntry = { id: 'hcx_mc', storyId: 's', kind: 'character', name: 'Han Shuo', mainCharacter: true, origin: { source: 'foundation' }, createdAt: '' };
const SWORD: CodexEntry = { id: 'hcx_sword', storyId: 's', kind: 'thing', name: 'Broken Broadsword', origin: { source: 'tag', chapterId: 'c1', chapterNumber: 1 }, createdAt: '' };

const speaker = (chapter: number, paragraph: number, text: string, words: string, name: string, protagonist = false): SpeakerAttachment => {
  const start = text.indexOf(words);
  const blockId = `c${chapter}-p${paragraph}`;
  return { id: `speaker:${blockId}:${start}`, kind: SPEAKER_KIND, anchor: { level: 'span', blockId, startOffset: start, endOffset: start + words.length, selectedText: words }, payload: { origin: 'harness', speaker: name, protagonist } } as SpeakerAttachment;
};
const change = (chapter: number, paragraph: number, verb: HoldingVerb, target: CodexEntry): HoldingChangeAttachment => ({
  id: `holding:c${chapter}-p${paragraph}:${verb}`, kind: HOLDING_CHANGE_KIND,
  anchor: { level: 'span', blockId: `c${chapter}-p${paragraph}`, startOffset: 0, endOffset: 4, selectedText: 'Then' },
  payload: { origin: 'harness', verb, holder: { name: MC.name, entryId: MC.id }, target: { name: target.name, entryId: target.id } },
} as HoldingChangeAttachment);

const ONE = ['Ash fell.', 'Then he drew the blade. "Who dares?" the sword said.', 'Then "Quiet," Han Shuo said.'];
const chapters: StoryCodexChapter[] = [
  { id: 'c1', chapterNumber: 1, paragraphs: ONE, holdingChanges: [change(1, 2, 'gained', SWORD), change(1, 2, 'equipped', SWORD)],
    speakers: [speaker(1, 2, ONE[1], '"Who dares?"', 'Scarlet Sovereign Chi Lian'), speaker(1, 3, ONE[2], '"Quiet,"', 'MC', true)] },
];
const codex = deriveStoryCodex({
  entries: [MC, SWORD], chapters,
  declared: [{ name: 'Han Shuo', mainCharacter: true }, { name: 'Scarlet Sovereign Chi Lian', aliases: ['Chi Lian'] }, { name: 'Lin Qinghan' }],
});
const recaps = [
  { chapterNumber: 1, title: 'Ash', recap: { text: 'Han Shuo finds a talking sword in the ash', source: 'model' as const, updatedAt: '' } },
  { chapterNumber: 2, title: 'The Gate', recap: undefined },
];

describe('the story\'s knowledge, for a companion to look up', () => {
  it('files every card the Codex shows, and only those, under the story\'s own categories', () => {
    const knowledge = storyKnowledge({ codex, chapters: recaps, openChapterNumber: 1 });
    expect(knowledge.map(category => category.title)).toEqual([
      STORY_KNOWLEDGE_CATEGORIES.characters, STORY_KNOWLEDGE_CATEGORIES.items, STORY_KNOWLEDGE_CATEGORIES.chapters,
    ]);
    // The companion is handed names; a declared character the chapters have not reached is not among them.
    expect(docsIndex(knowledge).map(entry => entry.title)).toEqual(['Han Shuo', 'Scarlet Sovereign Chi Lian', 'Broken Broadsword', 'Chapter 1: Ash']);
  });

  it('reads a card back as what the record knows: who they are, what they carry, what changed', () => {
    const knowledge = storyKnowledge({ codex, chapters: recaps });
    const [hit] = lookUpDocs(knowledge, 'Han Shuo');
    expect(docsTopicText(hit.topic, hit.category)).toBe(
      'Han Shuo (This story: characters): The main character. First met in Chapter 1. Carries: Broken Broadsword (in hand or worn). First words: "Quiet," Lately: gained Broken Broadsword in Chapter 1; took up Broken Broadsword in Chapter 1.',
    );
    expect(lookUpDocs(knowledge, 'broadsword')[0].topic.definition).toBe('First met in Chapter 1. Held by Han Shuo, in hand or worn. Lately: Han Shuo gained Broken Broadsword in Chapter 1; Han Shuo took up Broken Broadsword in Chapter 1.');
    // Nothing the record does not hold.
    expect(lookUpDocs(knowledge, 'Lin Qinghan')).toEqual([]);
  });

  it('tells what each chapter held from its recap, and finds the open chapter as "this chapter"', () => {
    const knowledge = storyKnowledge({ codex, chapters: recaps, openChapterNumber: 1 });
    expect(lookUpDocs(knowledge, 'this chapter')[0].topic.definition).toBe('The chapter open now. Han Shuo finds a talking sword in the ash.');
    expect(lookUpDocs(knowledge, 'what happened in chapter 1')[0].topic.title).toBe('Chapter 1: Ash');
    // A chapter with no saved recap has nothing to tell.
    expect(lookUpDocs(knowledge, 'The Gate')).toEqual([]);
  });

  it('never tells what comes after the open chapter as fact: it is kept apart as unlisted spoilers', () => {
    // Chapter 2: Chi Lian takes the sword. The reader has Chapter 1 open.
    const TWO = ['Then the Sovereign laughed. "Fool," she said.', 'Then he set the blade down.'];
    const later: StoryCodexChapter[] = [...chapters, { id: 'c2', chapterNumber: 2, paragraphs: TWO, holdingChanges: [change(2, 2, 'lost', SWORD)] }];
    const whole = deriveStoryCodex({ entries: [MC, SWORD], chapters: later, declared: [{ name: 'Han Shuo', mainCharacter: true }] });
    const written = [recaps[0], { chapterNumber: 2, title: 'The Gate', recap: { text: 'Han Shuo loses the sword', source: 'model' as const, updatedAt: '' } }];
    const reached = storyKnowledge({ codex: deriveStoryCodex({ entries: [MC, SWORD], chapters, declared: [{ name: 'Han Shuo', mainCharacter: true }] }), chapters: [recaps[0]], openChapterNumber: 1 });
    const spoilers = storySpoilers(reached, storyKnowledge({ codex: whole, chapters: written, openChapterNumber: 1 }), 1);
    const knowledge = [...reached, ...spoilers];
    // The companion is never handed a spoiler's name.
    expect(docsIndex(knowledge).map(entry => entry.category)).not.toContain(STORY_KNOWLEDGE_CATEGORIES.spoilers);
    // As fact, Han Shuo still carries the sword; what Chapter 2 changed is found only marked as a spoiler.
    const hits = lookUpDocs(knowledge, 'Han Shuo');
    expect(hits.map(hit => hit.category).slice(0, 2)).toEqual([STORY_KNOWLEDGE_CATEGORIES.characters, STORY_KNOWLEDGE_CATEGORIES.spoilers]);
    expect(hits[0].topic.definition).toContain('Carries: Broken Broadsword');
    expect(hits[1].topic.definition).toMatch(/^Spoiler, from after Chapter 1: .*lost Broken Broadsword in Chapter 2/);
    expect(lookUpDocs(knowledge, 'chapter 2')[0].topic.definition).toBe('Spoiler, from after Chapter 1: Han Shuo loses the sword.');
    // Nothing unchanged is repeated as a spoiler.
    expect(spoilers[0].topics.map(entry => entry.title)).toEqual(['Han Shuo', 'Broken Broadsword', 'Chapter 2: The Gate']);
  });

  it('reads the record as it stood at the open chapter: no look written from a later passage', () => {
    const shown = (chapter: number, paragraph: number, payload: Omit<AppearancePayload, 'origin'>): AppearanceAttachment => ({
      id: `appearance:c${chapter}-p${paragraph}`, kind: APPEARANCE_KIND,
      anchor: { level: 'span', blockId: `c${chapter}-p${paragraph}`, startOffset: 0, endOffset: 4, selectedText: 'Then' },
      payload: { origin: 'harness', ...payload },
    });
    const han = { name: MC.name, entryId: MC.id };
    const story = (chapter: number, appearance: AppearanceAttachment) =>
      ({ id: `c${chapter}`, storyId: 's', chapterNumber: chapter, title: `Chapter ${chapter}`, paragraphs: ['Then Han stood.'], appearances: [appearance] }) as unknown as HarnessChapter;
    // Han's look was written after Chapter 2's battle, from both passages.
    const look = { summary: 'Han is missing an arm after the battle.', traits: {}, from: ['appearance:c1-p1', 'appearance:c2-p1'], at: '' };
    const state = {
      stories: [], foundations: [], worldCards: [],
      codexEntries: [{ ...MC, look }],
      chapters: [
        story(1, shown(1, 1, { event: 'appears', subject: han, entity: 'character' })),
        story(2, shown(2, 1, { event: 'look', subject: han, entity: 'character', change: 'lost his left arm' })),
      ],
    } as unknown as HarnessWorkspaceState;
    const knowledge = storyKnowledgeOf(state, 's', 'c1');
    const [han1] = lookUpDocs(knowledge, 'Han Shuo');
    expect(han1.category).toBe(STORY_KNOWLEDGE_CATEGORIES.characters);
    expect(han1.topic.definition).not.toContain('missing an arm');
    expect(han1.topic.definition).toContain('Described as: Then Han stood.');
    // It comes back only as a marked spoiler.
    const spoiled = lookUpDocs(knowledge, 'Han Shuo').find(hit => hit.category === STORY_KNOWLEDGE_CATEGORIES.spoilers);
    expect(spoiled?.topic.definition).toMatch(/^Spoiler, from after Chapter 1: .*missing an arm/);
    // With Chapter 2 open, the change it tagged is part of how Han looks now, even where no look was written after it.
    const noCached = { ...state, codexEntries: [MC] } as HarnessWorkspaceState;
    expect(lookUpDocs(storyKnowledgeOf(noCached, 's', 'c2'), 'Han Shuo')[0].topic.definition).toContain('Since then: lost his left arm in Chapter 2.');
    // With the last chapter open, the whole record is how things are.
    expect(lookUpDocs(storyKnowledgeOf(state, 's', 'c2'), 'Han Shuo')[0].topic.definition).toContain('missing an arm');
  });
});

