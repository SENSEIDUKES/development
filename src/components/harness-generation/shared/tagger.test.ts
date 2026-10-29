import { describe, expect, it } from 'vitest';
import { buildHarnessTagPrompt } from '../../../server/harness-generation/tagger';
import { notesOfTaggedChapter, placeTagNotes, planChapterTagging, readChapterTagging, tagSubjectsOfStory, type TagNote } from './tagger';
import type { CodexEntry } from '../../../narrative/holdings';
import type { WorldRecord } from '../../../narrative/worldRecord';

/**
 * The tagger reads a chapter that is already written and writes the app's tags
 * for it as notes in the margin (SENSEI, 2026-10-24; 2026-10-29: "the page is
 * never retyped"). Three things have to hold, and the rest follows: it never
 * holds a copy of the prose, so it cannot change a word of it; a note that
 * cannot be placed is dropped on its own and every other note lands; and it
 * tags the people and things the story already holds instead of inventing
 * new ones.
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

const SOUND = { soundVocabulary: [{ word: 'blade drawn', example: 'drew his sword' }] };

const read = (notes: unknown, options?: Parameters<typeof readChapterTagging>[0]['options'], sent: readonly string[] = PARAGRAPHS) => readChapterTagging({
  raw: JSON.stringify({ notes }),
  sent,
  chapterNumber: 4,
  at: '2026-10-25T00:00:00.000Z',
  options,
});

/** The notes the HARNESS dropped, by their warning; no recordings travel here, so a placed sound is set aside and says on which words. */
const droppedNotes = (tagging: ReturnType<typeof read>) => tagging.record.warnings?.find(warning => warning.code === 'tag_note_dropped')?.message;
const setAsideSound = (tagging: ReturnType<typeof read>) => tagging.record.warnings?.find(warning => warning.code === 'sound_cue_set_aside')?.message;

const GOOD: TagNote[] = [
  { paragraph: 1, words: 'drew his sword', tag: '[[sound: blade drawn | high]]' },
  { paragraph: 1, words: 'Ye Chen drew his sword and the yard fell still.', tag: '[[gained: MC | Iron Key]]' },
  { paragraph: 2, words: '“Hold the gate,”', tag: '[[@MC]]' },
  { paragraph: 3, words: 'A gaunt figure in ash-grey robes stepped out of the dust.', tag: '[[appears: Old Wen | character]]' },
];

describe('the tagger writes in the margin', () => {
  it('places every note on the chapter\'s own words and leaves the prose exactly as it is', () => {
    const tagging = read(GOOD, SOUND);
    expect(tagging.record.status).toBe('tagged');
    expect(droppedNotes(tagging)).toBeUndefined();
    expect(tagging.tags?.speakers).toHaveLength(1);
    expect(tagging.tags?.holdingChanges).toHaveLength(1);
    expect(tagging.tags?.appearances?.map(appearance => appearance.payload.subject.name)).toEqual(['Old Wen']);
    // The sound sits on the words the note named, measured on the chapter's own paragraph.
    expect(setAsideSound(tagging)).toContain('The "blade drawn" sound on “drew his sword”');
    const speaker = tagging.tags!.speakers[0].anchor;
    expect(PARAGRAPHS[1].slice(speaker.startOffset, speaker.endOffset)).toBe('“Hold the gate,”');
  });

  it('cannot change a word of the chapter, whatever the notes say', () => {
    // The tagger returns no prose at all: there is nothing of its to compare.
    // Every attachment is measured on the paragraphs the chapter already has.
    const tagging = read([
      { paragraph: 2, words: '“Hold the gate!” he shouted', tag: '[[@MC]]' },
      ...GOOD,
    ], SOUND);
    expect(tagging.record.status).toBe('tagged');
    expect(droppedNotes(tagging)).toContain('“Hold the gate!” he shouted');
    for (const attachment of [...tagging.tags!.speakers, ...tagging.tags!.holdingChanges, ...(tagging.tags!.appearances ?? [])]) {
      expect(PARAGRAPHS.some(paragraph => paragraph.slice(attachment.anchor.startOffset, attachment.anchor.endOffset) === attachment.anchor.selectedText)).toBe(true);
    }
  });

  it('drops a note whose words are not in its paragraph, on its own, and keeps every other note', () => {
    const tagging = read([
      ...GOOD,
      { paragraph: 2, words: 'the gate swung shut', tag: '[[gained: MC | Gate Key]]' },
      { paragraph: 9, words: 'Ye Chen', tag: '[[@MC]]' },
      { paragraph: 2, words: 'the', tag: '[[gained: MC | Sword]]' },
    ], SOUND);
    expect(tagging.record.status).toBe('tagged');
    expect(tagging.tags?.speakers).toHaveLength(1);
    expect(tagging.tags?.holdingChanges).toHaveLength(1);
    expect(setAsideSound(tagging)).toContain('“drew his sword”');
    const dropped = droppedNotes(tagging);
    expect(dropped).toContain('Dropped 3 of the tagger\'s 7 notes');
    expect(dropped).toContain('“the gate swung shut” are not in that paragraph');
    expect(dropped).toContain('on paragraph 9: the chapter has 3 paragraphs');
    expect(dropped).toContain('“the” are in that paragraph more than once');
  });

  it('reads straight quotation marks as the chapter\'s curly ones', () => {
    const tagging = read([{ paragraph: 2, words: '"Hold the gate,"', tag: '[[@MC]]' }]);
    expect(tagging.record.status).toBe('tagged');
    expect(tagging.record.warnings).toBeUndefined();
    expect(tagging.tags?.speakers[0].anchor.selectedText).toBe('“Hold the gate,”');
  });

  it('gives a speaker to the whole spoken line when the note quotes words from inside it', () => {
    const tagging = read([{ paragraph: 2, words: 'Hold the gate', tag: '[[@MC]]' }]);
    expect(tagging.tags?.speakers).toHaveLength(1);
    expect(tagging.tags?.speakers[0].anchor.selectedText).toBe('“Hold the gate,”');
  });

  it('tags every spoken line of a paragraph, each with its own speaker', () => {
    const sent = ['“Hold the gate,” he said. The clerk leaned closer. “You can separate the usable residue from that?”'];
    const tagging = read([
      { paragraph: 1, words: '“Hold the gate,”', tag: '[[@MC]]' },
      { paragraph: 1, words: '“You can separate the usable residue from that?”', tag: '[[@Clerk]]' },
    ], undefined, sent);
    expect(tagging.tags?.speakers.map(speaker => [speaker.payload.speaker, speaker.anchor.selectedText])).toEqual([
      ['Main character', '“Hold the gate,”'],
      ['Clerk', '“You can separate the usable residue from that?”'],
    ]);
    expect(sent[0]).toBe('“Hold the gate,” he said. The clerk leaned closer. “You can separate the usable residue from that?”');
  });

  it('reads a sound note written the old way, with its words inside the tag, and still wraps only the paragraph\'s own words', () => {
    const tagging = read([{ paragraph: 1, words: 'drew his sword', tag: '[[sound: blade drawn | drew his sword | high]]' }], SOUND);
    expect(droppedNotes(tagging)).toBeUndefined();
    expect(setAsideSound(tagging)).toContain('The "blade drawn" sound on “drew his sword”');
    expect(placeTagNotes(PARAGRAPHS, [{ paragraph: 1, words: 'drew his sword', tag: '[[sound: blade drawn | drew his sword | high]]' }]).paragraphs[0])
      .toBe('Ye Chen [[sound: blade drawn | high | drew his sword]] and the yard fell still.');
  });

  it('opens the chapter with its music and atmosphere from notes with no words', () => {
    const tagging = read([
      { paragraph: 1, words: '', tag: '[[soundscape: Tense | dark | urgent | high]]' },
      { paragraph: 1, words: '', tag: '[[atmosphere: Courtyard | low]]' },
    ], { media: { soundCues: [], soundscapes: [], atmospheres: [] } as never });
    expect(tagging.record.status).toBe('tagged');
    // The scene is read from the tags; with no recordings to choose from it has nothing to play, but no note was dropped.
    expect(tagging.record.warnings?.some(warning => warning.code === 'tag_note_dropped')).toBeFalsy();
  });

  it('accepts a tag with or without its brackets, and drops an entry that is no note', () => {
    const tagging = read([
      { paragraph: 2, words: '“Hold the gate,”', tag: '@MC' },
      { paragraph: 1, words: 'the yard fell still', tag: '[gained: MC | Iron Key]' },
      { paragraph: 3 },
      'not a note',
    ]);
    expect(tagging.tags?.speakers).toHaveLength(1);
    expect(tagging.tags?.holdingChanges).toHaveLength(1);
    expect(tagging.record.warnings?.find(warning => warning.code === 'tag_note_dropped')?.message).toContain('Dropped 2 of the tagger\'s 4 notes');
  });

  it('reports a tag the reader cannot read, as it did when the writer slipped one', () => {
    // `[[obtainedd: …]]` is no tag word: the reader removes it and the chapter
    // says so, exactly as it did for a writer's slip, because the note is placed
    // through the same path.
    const tagging = read([{ paragraph: 1, words: PARAGRAPHS[0], tag: '[[obtainedd: MC | Ghost]]' }]);
    expect(tagging.record.status).toBe('tagged');
    expect(tagging.tags?.holdingChanges).toEqual([]);
    expect(tagging.record.warnings?.find(warning => warning.code === 'holding_tags_incomplete')?.message).toBe('1 tag was unreadable and removed.');
  });

  it('is tagged, with nothing placed, when the tagger found nothing to tag', () => {
    const tagging = read([]);
    expect(tagging.record.status).toBe('tagged');
    expect(tagging.tags?.speakers).toEqual([]);
  });

  it('fails only when the answer is not a list of notes at all', () => {
    expect(readChapterTagging({ raw: 'not json', sent: PARAGRAPHS, chapterNumber: 4, at: 'now' }).record.status).toBe('failed');
    expect(readChapterTagging({ raw: JSON.stringify({ paragraphs: PARAGRAPHS }), sent: PARAGRAPHS, chapterNumber: 4, at: 'now' }).record).toMatchObject({ status: 'failed', problem: 'The answer held no list of notes.' });
  });

  it('refuses a chapter whose paragraphs are not the prose the reader has', () => {
    // Every attachment is measured on the text the tag reader returns, which
    // trims a paragraph: a paragraph with space around it would place its tags
    // at the wrong character (Codex review on #437).
    const sent = ['  “Run!”'];
    const tagging = readChapterTagging({
      raw: JSON.stringify({ notes: [{ paragraph: 1, words: '“Run!”', tag: '[[@MC]]' }] }),
      sent,
      chapterNumber: 4,
      at: '2026-10-25T00:00:00.000Z',
    });
    expect(tagging.record.status).toBe('failed');
    expect(tagging.record.problem).toContain('paragraph 1');
    expect(tagging.record.problem).toContain('wrong words');
  });

  it('keeps a paragraph that is nothing but its own sound', () => {
    const sent = ['The wall groaned.', 'BOOM', 'Dust filled the yard.'];
    const tagging = read([{ paragraph: 2, words: 'BOOM', tag: '[[sound: boom]]' }], { soundVocabulary: [{ word: 'boom', example: 'a boom' }] }, sent);
    expect(tagging.record.status).toBe('tagged');
    expect(droppedNotes(tagging)).toBeUndefined();
    expect(setAsideSound(tagging)).toContain('The "boom" sound on “BOOM”');
  });

  it('drops a note the tag reader would read as standing in for a name, rather than let it change the prose', () => {
    // SENSEI's Sundered Heavens slip: a holding tag written where its thing's
    // name belongs makes the tag reader write the name into the prose. As a
    // note it lands before "that bit", after "a twist of", and the reader would
    // add "Copper Hair Wire" there. The prose is the chapter's: the note goes.
    const sent = ['He fastened a twist of that bit into the hair at his nape.'];
    const tagging = read([{ paragraph: 1, words: 'that bit into', tag: '[[equipped: MC | Copper Hair Wire]]' }], undefined, sent);
    expect(tagging.record.status).toBe('tagged');
    expect(tagging.tags?.holdingChanges).toEqual([]);
    expect(tagging.record.warnings?.find(warning => warning.code === 'tag_note_dropped')?.message).toContain('could not be placed without changing the paragraph');
  });
});

describe('placing notes on a chapter', () => {
  it('writes the inline form for the tag reader, outside any sound it does not belong to', () => {
    const placed = placeTagNotes(PARAGRAPHS, GOOD);
    expect(placed.placed).toBe(4);
    expect(placed.dropped).toEqual([]);
    expect(placed.paragraphs).toEqual([
      '[[gained: MC | Iron Key]]Ye Chen [[sound: blade drawn | high | drew his sword]] and the yard fell still.',
      '[[@MC]]“Hold the gate,” he said, and the Jade Token burned cold in his palm.',
      '[[appears: Old Wen | character]]A gaunt figure in ash-grey robes stepped out of the dust.',
    ]);
  });

  it('is the inverse of reading a tagged chapter, so a saved chapter replays through the tagger', () => {
    const tagged = [
      '[[soundscape: Tense | dark | urgent | high]] [[gained: MC | Iron Key]] Ye Chen [[sound: blade drawn | drew his sword | high]] and the yard fell still.',
      '[[@MC]] “Hold the gate,” he said, and the Jade Token burned cold in his palm. [[@Old Wen]] “The gate holds itself.”',
      '[[appears: Old Wen | character]] A gaunt figure in ash-grey robes stepped out of the dust.',
    ];
    const notes = notesOfTaggedChapter(tagged);
    expect(notes).toEqual([
      { paragraph: 1, words: '', tag: '[[soundscape: Tense | dark | urgent | high]]' },
      { paragraph: 1, words: 'Ye Chen drew his sword and the yard fell still.', tag: '[[gained: MC | Iron Key]]' },
      { paragraph: 1, words: 'drew his sword', tag: '[[sound: blade drawn | high]]' },
      { paragraph: 2, words: '“Hold the gate,”', tag: '[[@MC]]' },
      { paragraph: 2, words: '“The gate holds itself.”', tag: '[[@Old Wen]]' },
      { paragraph: 3, words: 'A gaunt figure in ash-grey robes stepped out of the dust.', tag: '[[appears: Old Wen | character]]' },
    ]);
    const clean = ['Ye Chen drew his sword and the yard fell still.', '“Hold the gate,” he said, and the Jade Token burned cold in his palm. “The gate holds itself.”', PARAGRAPHS[2]];
    const tagging = read(notes, SOUND, clean);
    expect(droppedNotes(tagging)).toBeUndefined();
    expect(tagging.tags?.speakers.map(speaker => speaker.payload.speaker)).toEqual(['Main character', 'Old Wen']);
    expect(tagging.tags?.holdingChanges).toHaveLength(1);
    expect(setAsideSound(tagging)).toContain('“drew his sword”');
    expect(tagging.tags?.appearances).toHaveLength(1);
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

  it('asks for notes and never for the chapter back', () => {
    const prompt = buildHarnessTagPrompt(request());
    expect(prompt.responseJsonSchema.required).toEqual(['notes']);
    expect(prompt.responseJsonSchema.properties.notes.items.required).toEqual(['paragraph', 'words', 'tag']);
    expect(prompt.systemInstruction).toContain('Never return the chapter or any paragraph of it');
    expect(prompt.userPrompt).toContain('Return your notes on these 3 paragraphs, and nothing else.');
    expect(prompt.systemInstruction + prompt.userPrompt).not.toMatch(/tags written in|Return every paragraph|HOW TO READ THE TAG TEACHING/);
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
