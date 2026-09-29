import { describe, expect, it } from 'vitest';
import { readMarks } from '../narrative/marks';
import type { AudioCue } from './cues';
import { resolvePlayableSoundCue, soundCueTrackId, splitBySoundCues, type SoundCueAttachment } from './inlineAudio';
import type { FrozenNarrativeMedia } from './media';
import { describeSetAsideSoundCue, placeSoundCues, type SoundCueSignal } from './soundCuePlacement';
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

/** Reads marked paragraphs the way the HARNESS does, then places the cues. */
const place = (paragraphs: string[], signals: SoundCueSignal[], chapterNumber = 1, locale?: string) => placeSoundCues({
  paragraphs: paragraphs.map((source, index) => ({ blockId: `c${chapterNumber}-p${index + 1}`, ...readMarks(source) })),
  signals, vocabulary: VOCABULARY, recordings: RECORDINGS, chapterNumber, locale,
});

describe('placeSoundCues', () => {
  it('places a cue on the exact whole words its mark wraps', () => {
    const { soundCues, setAside } = place(['Wei Lin [[1|drew his sword]] as the beast lunged.'], [{ mark: 1, sound: 'Blade Drawn', energy: 'high' }]);
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

  it('widens a mark that starts or ends inside a word to the whole word', () => {
    const { soundCues } = place(['The [[1|beast roa]]red.'], [{ mark: 1, sound: 'beast roar' }]);
    expect(soundCues[0].anchor.selectedText).toBe('beast roared');
  });

  it('places cues in Japanese prose', () => {
    const { soundCues, setAside } = place(['林は[[1|剣を抜いた]]。'], [{ mark: 1, sound: 'blade drawn' }], 1, 'ja');
    expect(setAside).toEqual([]);
    expect(soundCues[0].anchor.selectedText).toBe('剣を抜いた');
  });

  it('sets aside, never forces, what breaks the rules', () => {
    const { soundCues, setAside } = place([
      'He [[1|drew the long curved blade of his fathers]] slowly. The [[2|beast roared]].',
      '[[[3|Quest complete]]]',
      'She [[4|drew]] it.',
    ], [
      { mark: 1, sound: 'blade drawn' },
      { mark: 2, sound: 'thunder' },
      { mark: 3, sound: 'blade drawn' },
      { mark: 9, sound: 'beast roar' },
      { mark: 4, sound: 'blade drawn' },
      { mark: 4, sound: 'beast roar' },
    ]);
    expect(soundCues.map(cue => cue.anchor.selectedText)).toEqual(['drew']);
    expect(setAside.map(item => [item.mark, item.reason])).toEqual([
      [1, 'too-many-words'], [2, 'unknown-sound'], [3, 'not-prose'], [9, 'missing-mark'], [4, 'duplicate-signal'],
    ]);
    expect(describeSetAsideSoundCue(setAside[0])).toBe('Sound Cue 1 "blade drawn" covers more than 5 words ("drew the long curved blade of his fathers"); it was set aside.');
  });

  it('keeps the first ten in reading order and drops overlaps', () => {
    const paragraph = Array.from({ length: 12 }, (_, index) => `[[${index + 1}|roared]]`).join(' and ');
    const { soundCues, setAside } = place([paragraph], Array.from({ length: 12 }, (_, index) => ({ mark: 12 - index, sound: 'beast roar' })));
    expect(soundCues).toHaveLength(10);
    expect(soundCues[0].anchor.startOffset).toBe(0);
    expect(setAside.map(item => [item.mark, item.reason])).toEqual([[11, 'over-limit'], [12, 'over-limit']]);
    const overlapping = place(['He [[1|drew his]] sword'], [{ mark: 1, sound: 'blade drawn' }]);
    expect(overlapping.soundCues).toHaveLength(1);
  });

  it('rotates recordings so repeated sounds vary, identically on every run', () => {
    const run = () => place(['The [[1|beast roared]]. Again the [[2|beast roared]].'], [{ mark: 1, sound: 'beast roar' }, { mark: 2, sound: 'beast roar' }], 3);
    const urls = run().soundCues.map(cue => cue.payload.cue.publicUrl);
    expect(new Set(urls).size).toBe(2);
    expect(run()).toEqual(run());
  });

  it('prefers the Energy asked for and falls back to any recording of the word', () => {
    expect(place(['He [[1|drew]].'], [{ mark: 1, sound: 'blade drawn', energy: 'medium' }]).soundCues[0].payload.cue.publicUrl).toContain('sword-medium');
    expect(place(['The [[1|beast roared]].'], [{ mark: 1, sound: 'beast roar', energy: 'low' }]).soundCues).toHaveLength(1);
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
