import { describe, expect, it } from 'vitest';
import { buildHarnessTagPrompt } from '../../../server/harness-generation/tagger';
import { planChapterTagging, readChapterTagging, tagSubjectsOfStory } from './tagger';
import type { CodexEntry } from '../../../narrative/holdings';
import type { WorldRecord } from '../../../narrative/worldRecord';

/**
 * The tagger reads a chapter that is already written and writes the app's tags
 * into it (SENSEI, 2026-10-24). Two things have to hold, and the rest follows:
 * it must not change a word of the chapter, and it must tag the people and
 * things the story already holds instead of inventing new ones.
 */

const PARAGRAPHS = [
  'Ye Chen drew his sword and the yard fell still.',
  '“Hold the gate,” he said, and the Jade Token burned cold in his palm.',
  'A gaunt figure in ash-grey robes stepped out of the dust.',
];

const WORLD: WorldRecord = {
  cards: [
    { key: 'world:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true, enteredInChapter: 0, slots: {} },
    { key: 'world:thing:jade-token', kind: 'thing', name: 'Jade Token', enteredInChapter: 0, slots: {} },
    { key: 'world:place:rift-quarry', kind: 'place', name: 'Rift Quarry', enteredInChapter: 0, slots: {} },
  ],
};

const entry = (over: Partial<CodexEntry> & Pick<CodexEntry, 'name' | 'kind'>): CodexEntry => ({
  id: `e-${over.name}`, storyId: 's1', origin: { source: 'foundation' }, createdAt: '2026-10-25T00:00:00.000Z', ...over,
});

const chapter = { id: 'c1', storyId: 's1', chapterNumber: 4, paragraphs: PARAGRAPHS };

const request = (over: Partial<Parameters<typeof planChapterTagging>[0]> = {}) => planChapterTagging({
  chapter, entries: [], world: WORLD, language: 'English', model: 'm', ...over,
});

const read = (paragraphs: unknown, options?: Parameters<typeof readChapterTagging>[0]['options']) => readChapterTagging({
  raw: JSON.stringify({ paragraphs }),
  sent: PARAGRAPHS,
  chapterNumber: 4,
  at: '2026-10-25T00:00:00.000Z',
  options,
});

describe('the chapter is not the tagger\'s to change', () => {
  it('accepts tags written into the prose and gives the prose back untouched', () => {
    const tagging = read([
      '[[gained: MC | Iron Key]] Ye Chen drew his sword and the yard fell still.',
      '[[@MC]] “Hold the gate,” he said, and the Jade Token burned cold in his palm.',
      '[[appears: Old Wen | character]] A gaunt figure in ash-grey robes stepped out of the dust.',
    ]);
    expect(tagging.status).toBe('tagged');
    if (tagging.status !== 'tagged') return;
    expect(tagging.speakers).toHaveLength(1);
    expect(tagging.holdingChanges).toHaveLength(1);
    expect(tagging.appearances?.map(appearance => appearance.payload.subject.name)).toEqual(['Old Wen']);
  });

  it('refuses the whole answer when one paragraph came back reworded', () => {
    const tagging = read([
      PARAGRAPHS[0],
      '[[@MC]] “Hold the gate!” he shouted, and the Jade Token burned cold in his palm.',
      PARAGRAPHS[2],
    ]);
    expect(tagging.status).toBe('failed');
    if (tagging.status !== 'failed') return;
    expect(tagging.problem).toContain('paragraph 2');
  });

  it('refuses an answer that lost or added a paragraph', () => {
    expect(read(PARAGRAPHS.slice(0, 2)).status).toBe('failed');
    expect(read([...PARAGRAPHS, 'And the gate held.']).status).toBe('failed');
  });

  it('refuses an answer that is not readable, holds no paragraphs, or holds a paragraph that is not text', () => {
    expect(readChapterTagging({ raw: 'not json', sent: PARAGRAPHS, chapterNumber: 4, at: 'now' }).status).toBe('failed');
    expect(read(undefined).status).toBe('failed');
    expect(read([PARAGRAPHS[0], 7, PARAGRAPHS[2]]).status).toBe('failed');
  });

  it('counts a space left behind by a tag as no change', () => {
    // A tag at a paragraph's edge leaves whitespace when it is removed, and the
    // prose reads the same, so it is never called a change.
    const tagging = read([`[[@MC]] ${PARAGRAPHS[0]} `, PARAGRAPHS[1], PARAGRAPHS[2]]);
    expect(tagging.status).toBe('tagged');
  });
});

describe('a tag on a chapter the writer never touched', () => {
  it('keeps a paragraph that is nothing but its own sound', () => {
    // The stray-sound repair exists for the chapter writer, which invents the
    // words it wraps and sometimes writes them outside the prose. Run on the
    // tagger it emptied a paragraph whose whole text is the sound ("BOOM"),
    // the paragraph was then dropped, the count no longer matched, and every
    // tag of the chapter was refused (Codex review on #437).
    const sent = ['The wall groaned.', 'BOOM', 'Dust filled the yard.'];
    const tagging = readChapterTagging({
      raw: JSON.stringify({ paragraphs: ['The wall groaned.', '[[sound: boom | BOOM]]', 'Dust filled the yard.'] }),
      sent,
      chapterNumber: 4,
      at: '2026-10-25T00:00:00.000Z',
      options: { soundVocabulary: [{ word: 'boom', example: 'a boom' }] },
    });
    expect(tagging.status).toBe('tagged');
  });

  it('refuses a chapter whose paragraphs are not the prose the reader has', () => {
    // Trimming both sides of the comparison accepted this, and the speaker then
    // anchored two characters before the speech it names (Codex review on #437).
    const sent = ['  \u201cRun!\u201d'];
    const tagging = readChapterTagging({
      raw: JSON.stringify({ paragraphs: ['  [[@MC]] \u201cRun!\u201d'] }),
      sent,
      chapterNumber: 4,
      at: '2026-10-25T00:00:00.000Z',
    });
    expect(tagging.status).toBe('failed');
    if (tagging.status !== 'failed') return;
    expect(tagging.problem).toContain('paragraph 1');
    expect(tagging.problem).toContain('wrong words');
  });

  it('places every tag against the paragraph exactly as the chapter holds it', () => {
    const sent = ['\u201cHold the gate,\u201d he said.'];
    const tagging = readChapterTagging({
      raw: JSON.stringify({ paragraphs: ['[[@MC]] \u201cHold the gate,\u201d he said.'] }),
      sent,
      chapterNumber: 4,
      at: '2026-10-25T00:00:00.000Z',
    });
    expect(tagging.status).toBe('tagged');
    if (tagging.status !== 'tagged') return;
    const anchor = tagging.speakers[0].anchor;
    expect(sent[0].slice(anchor.startOffset, anchor.endOffset)).toBe(anchor.selectedText);
  });
});

describe('what the tagger is told about the story', () => {
  it('lists the Codex entries and the world cards a tag can name, once each', () => {
    const subjects = tagSubjectsOfStory({
      entries: [entry({ name: 'Ye Chen', kind: 'character', mainCharacter: true, aliases: ['the Quarry Boy'] })],
      world: WORLD,
    });
    expect(subjects.map(subject => subject.name)).toEqual(['Ye Chen', 'Jade Token']);
    // The Codex entry wins over the card of the same name: its id is what a tag resolves to.
    expect(subjects[0]).toMatchObject({ mainCharacter: true, aliases: ['the Quarry Boy'] });
  });

  it('leaves out a card kind no tag can name yet', () => {
    const subjects = tagSubjectsOfStory({ entries: [], world: WORLD });
    expect(subjects.some(subject => subject.name === 'Rift Quarry')).toBe(false);
  });

  it('sends the chapter, who exists and what they carry, and never how the story got here', () => {
    const prompt = buildHarnessTagPrompt(request({
      holdings: { characters: [{ name: 'Ye Chen', mainCharacter: true, rank: 'Qi Condensation 1', carries: ['Jade Token'] }] },
    }));
    expect(prompt.userPrompt).toContain(PARAGRAPHS[0]);
    expect(prompt.userPrompt).toContain('Jade Token');
    expect(prompt.userPrompt).toContain('Qi Condensation 1');
    // The architectural promise: a chapter an author wrote themselves has none
    // of these, and the tagger has to work on it exactly as well.
    for (const absent of ['Destined Ending', 'Hard Pins', 'ACTIVE ARC GOAL', 'PREVIOUSLY ON', 'Foundation', 'MISSION REMINDER']) {
      expect(prompt.systemInstruction + prompt.userPrompt).not.toContain(absent);
    }
  });

  it('teaches a sound tag only when the story has sound words, and a soundtrack only when it has categories', () => {
    const bare = buildHarnessTagPrompt(request());
    expect(bare.systemInstruction).not.toContain('[[sound:');
    expect(bare.systemInstruction).not.toContain('[[soundscape:');
    const equipped = buildHarnessTagPrompt(request({
      soundWords: [{ word: 'blade drawn', example: 'drew his sword' }],
      soundtrack: { music: ['Tense'], atmospheres: ['Courtyard'] },
    }));
    expect(equipped.systemInstruction).toContain('[[sound:');
    expect(equipped.systemInstruction).toContain('blade drawn');
    expect(equipped.systemInstruction).toContain('[[soundscape:');
    expect(equipped.systemInstruction).toContain('Courtyard');
  });

  it('always teaches the tags a story cannot turn off', () => {
    const prompt = buildHarnessTagPrompt(request()).systemInstruction;
    for (const taught of ['[[@Name]]', '[[gained:', '[[appears:', '[[look:', 'HARNESS TAG RULES']) {
      expect(prompt).toContain(taught);
    }
  });
});
