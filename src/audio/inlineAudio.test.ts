import { describe, expect, it } from 'vitest';
import { readMarks } from '../narrative/marks';
import type { AudioCue } from './cues';
import { resolvePlayableSoundCue, soundCueTrackId, splitBySoundCues, type SoundCueAttachment } from './inlineAudio';
import type { FrozenNarrativeMedia } from './media';
import { describeSetAsideSoundCue, placeSoundCues } from './soundCuePlacement';
import type { SoundWord } from './soundWords';

const recording = (name: string, sound: string, energy?: 'low' | 'medium' | 'high'): FrozenNarrativeMedia['soundCues'][number] => ({
  cue: {
    file_path: `cues/${name}.mp3`,
    public_url: `https://media.example.org/${name}.mp3`,
    category: 'weapons',
    metadata: {
      main_category: 'weapons', broad_variation: 'unsheathe', soft_tags: [], description: name, confidence_score: 1,
      sound, ...(energy ? { studio_tags: { energy } } : {}),
    },
  } satisfies AudioCue,
  provenance: { catalogId: 'test-cues', version: '1' },
});

const RECORDINGS = [
  recording('sword-medium', 'blade drawn', 'medium'),
  recording('sword-heavy', 'blade drawn', 'high'),
  recording('sword-plain', 'blade drawn'),
  recording('roar-a', 'beast roar'),
  recording('roar-b', 'beast roar'),
];
const VOCABULARY: SoundWord[] = [
  { word: 'blade drawn', example: 'drew his sword' },
  { word: 'beast roar', example: 'the beast roared' },
];

/** Reads tagged paragraphs the way the HARNESS does, then places the cues. */
const place = (paragraphs: string[], chapterNumber = 1, locale?: string, vocabulary = VOCABULARY) => placeSoundCues({
  paragraphs: paragraphs.map((source, index) => ({ blockId: `c${chapterNumber}-p${index + 1}`, ...readMarks(source) })),
  vocabulary, recordings: RECORDINGS, chapterNumber, locale,
});

describe('placeSoundCues', () => {
  it('places a cue on the exact whole words its sound tag wraps', () => {
    const { soundCues, setAside } = place(['Wei Lin [[sound: Blade Drawn | drew his sword | high]] as the beast lunged.']);
    expect(setAside).toEqual([]);
    expect(soundCues).toEqual([{
      id: 'sound-cue:c1-p1:8-22',
      kind: 'sound-cue',
      anchor: { level: 'span', blockId: 'c1-p1', startOffset: 8, endOffset: 22, selectedText: 'drew his sword' },
      payload: {
        origin: 'harness', sound: 'blade drawn', energy: 'high',
        cue: { publicUrl: 'https://media.example.org/sword-heavy.mp3', provenance: { catalogId: 'test-cues', version: '1' }, category: 'weapons', tags: { energy: 'high' } },
      },
    }]);
  });

  it('widens a tag that starts or ends inside a word to the whole word', () => {
    const { soundCues } = place(['The [[sound: beast roar | beast roa]]red.']);
    expect(soundCues[0].anchor.selectedText).toBe('beast roared');
  });

  it('places cues in Japanese prose', () => {
    const { soundCues, setAside } = place(['林は[[sound: blade drawn | 剣を抜いた | medium]]。'], 1, 'ja');
    expect(setAside).toEqual([]);
    expect(soundCues[0].anchor.selectedText).toBe('剣を抜いた');
  });

  it('places up to eight words, the moment a writer wraps whole', () => {
    const { soundCues, setAside } = place(['Below, [[sound: beast roar | a beast roared across the terrace at dusk]] and fell silent.']);
    expect(setAside).toEqual([]);
    expect(soundCues[0].anchor.selectedText).toBe('a beast roared across the terrace at dusk');
  });

  it('sets aside, never forces, what breaks the rules', () => {
    const { soundCues, setAside } = place([
      'He [[sound: blade drawn | drew the long curved blade of his fathers and grandfathers]] slowly. The [[sound: thunder | beast roared]].',
      '[[[sound: blade drawn | Quest complete]]]',
      'She [[sound: blade drawn | drew]] it.',
    ], 1, undefined, [...VOCABULARY, { word: 'chime', example: 'a soft chime' }]);
    expect(soundCues.map(cue => cue.anchor.selectedText)).toEqual(['drew']);
    expect(setAside.map(item => [item.sound, item.reason, item.blockId])).toEqual([
      ['blade drawn', 'too-many-words', 'c1-p1'], ['thunder', 'unknown-sound', 'c1-p1'], ['blade drawn', 'not-prose', 'c1-p2'],
    ]);
    expect(describeSetAsideSoundCue(setAside[0])).toBe('The "blade drawn" sound on “drew the long curved blade of his fathers and grandfathers” covers more than 8 words; it was set aside.');
    expect(describeSetAsideSoundCue(setAside[1])).toBe('The "thunder" sound on “beast roared” is not one of this story\'s sound words; it was set aside.');
    // A story word with no playable recording is set aside too.
    const silent = place(['A [[sound: chime | soft chime]] rang.'], 1, undefined, [...VOCABULARY, { word: 'chime', example: 'a soft chime' }]);
    expect(silent.setAside.map(item => item.reason)).toEqual(['no-recording']);
  });

  it('keeps the first ten in reading order and drops overlaps', () => {
    const paragraph = Array.from({ length: 12 }, () => '[[sound: beast roar | roared]]').join(' and ');
    const { soundCues, setAside } = place([paragraph]);
    expect(soundCues).toHaveLength(10);
    expect(soundCues[0].anchor.startOffset).toBe(0);
    expect(setAside.map(item => item.reason)).toEqual(['over-limit', 'over-limit']);
    const overlapping = placeSoundCues({
      paragraphs: [{ blockId: 'p1', text: 'He drew his sword.', sounds: [{ sound: 'blade drawn', start: 3, end: 11 }, { sound: 'blade drawn', start: 8, end: 17 }] }],
      vocabulary: VOCABULARY, recordings: RECORDINGS, chapterNumber: 1,
    });
    expect(overlapping.soundCues).toHaveLength(1);
    expect(overlapping.setAside).toMatchObject([{ reason: 'overlaps', words: 'his sword' }]);
  });

  it('rotates recordings so repeated sounds vary, identically on every run', () => {
    const run = () => place(['The [[sound: beast roar | beast roared]]. Again the [[sound: beast roar | beast roared]].'], 3);
    const urls = run().soundCues.map(cue => cue.payload.cue.publicUrl);
    expect(new Set(urls).size).toBe(2);
    expect(run()).toEqual(run());
  });

  it('prefers the Energy asked for and falls back to any recording of the word', () => {
    expect(place(['He [[sound: blade drawn | drew | medium]].']).soundCues[0].payload.cue.publicUrl).toContain('sword-medium');
    expect(place(['The [[sound: beast roar | beast roared | low]].']).soundCues).toHaveLength(1);
  });
});

const cueOn = (text: string, words: string, overrides: Partial<SoundCueAttachment['payload']['cue']> = {}): SoundCueAttachment => {
  const start = text.indexOf(words);
  return {
    id: `sound-cue:p1:${start}`, kind: 'sound-cue',
    anchor: { level: 'span', blockId: 'p1', startOffset: start, endOffset: start + words.length, selectedText: words },
    payload: { origin: 'harness', sound: 'blade drawn', cue: { publicUrl: 'https://media.example.org/a.mp3', provenance: { catalogId: 'x', version: '1' }, category: 'weapons', ...overrides } },
  };
};

describe('Reader side of a Sound Cue', () => {
  const text = 'Wei Lin drew his sword as the beast roared.';

  it('splits a paragraph at its cues by offsets', () => {
    const segments = splitBySoundCues(text, [cueOn(text, 'beast roared'), cueOn(text, 'drew his sword')]);
    expect(segments.map(segment => [segment.text, Boolean(segment.cue)])).toEqual([
      ['Wei Lin ', false], ['drew his sword', true], [' as the ', false], ['beast roared', true], ['.', false],
    ]);
  });

  it('leaves prose plain where the words no longer match or cues overlap', () => {
    expect(splitBySoundCues('Wei Lin sheathed his sword.', [cueOn(text, 'drew his sword')])).toEqual([{ text: 'Wei Lin sheathed his sword.' }]);
    const overlap = { ...cueOn(text, 'his sword'), id: 'b' };
    expect(splitBySoundCues(text, [cueOn(text, 'drew his sword'), overlap]).filter(segment => segment.cue)).toHaveLength(1);
  });

  it('plays only whole records with a public, provenanced recording, whatever the language', () => {
    expect(resolvePlayableSoundCue(cueOn('林は剣を抜いた。', '剣を抜いた'))).toEqual({ ok: true, publicUrl: 'https://media.example.org/a.mp3' });
    expect(resolvePlayableSoundCue(cueOn(text, 'drew', { publicUrl: 'http://media.example.org/a.mp3' })).ok).toBe(false);
    expect(resolvePlayableSoundCue(cueOn(text, 'drew', { provenance: { catalogId: '', version: '' } })).ok).toBe(false);
    const detached = cueOn(text, 'drew');
    expect(resolvePlayableSoundCue({ ...detached, anchor: { ...detached.anchor, detached: true } })).toMatchObject({ ok: false, reason: 'detached' });
    expect(soundCueTrackId(detached)).toBe('reader-inline:sound-cue:p1:8');
  });
});
