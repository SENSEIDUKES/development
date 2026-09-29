import { describe, expect, it } from 'vitest';
import { soundVocabulary, type FrozenNarrativeMedia } from './media';
import { SOUND_WORD_LIMITS, isSoundWord, normalizeSoundWord, validateSoundWords } from './soundWords';
import type { AudioCue } from './cues';

const recording = (sound: string | undefined, url = `https://media.example.org/${sound ?? 'none'}.mp3`): FrozenNarrativeMedia['soundCues'][number] => ({
  cue: {
    file_path: `cues/${sound ?? 'none'}.mp3`,
    public_url: url,
    category: 'weapons',
    metadata: {
      main_category: 'weapons', broad_variation: 'unsheathe', soft_tags: [], description: 'Test.', confidence_score: 1,
      ...(sound ? { sound } : {}),
    },
  } satisfies AudioCue,
  provenance: { catalogId: 'test-cues', version: '1' },
});

describe('sound words', () => {
  it('keeps one spelling for a word', () => {
    expect(normalizeSoundWord('  Blade_Drawn ')).toBe('blade drawn');
    expect(normalizeSoundWord('war-cry')).toBe('war cry');
    expect(isSoundWord('bell rings')).toBe(true);
    expect(isSoundWord('artifact activates')).toBe(true);
    expect(isSoundWord('a very long four words')).toBe(false);
    expect(isSoundWord('dragon2')).toBe(false);
    expect(isSoundWord('x'.repeat(SOUND_WORD_LIMITS.wordCharacters + 1))).toBe(false);
  });

  it('reads a declared list with examples and optional meanings', () => {
    expect(validateSoundWords([
      { word: 'Blade Drawn', example: ' drew  his sword ' },
      { word: 'chime', example: 'a soft chime', meaning: 'a small bright chime' },
    ])).toEqual([
      { word: 'blade drawn', example: 'drew his sword' },
      { word: 'chime', example: 'a soft chime', meaning: 'a small bright chime' },
    ]);
  });

  it('holds every example to one to five words of plain text', () => {
    expect(() => validateSoundWords([{ word: 'beast roar', example: 'the enormous beast roared across the valley' }])).toThrow('one to five words');
    expect(() => validateSoundWords([{ word: 'beast roar', example: '' }])).toThrow('one to five words');
    expect(() => validateSoundWords([{ word: 'beast roar', example: '[[1|the beast roared]]' }])).toThrow('plain text');
    expect(() => validateSoundWords([{ word: 'beast roar', example: 'see https://x.io' }])).toThrow('plain text');
  });

  it('rejects duplicates, bad words, unknown fields, long meanings and oversized lists', () => {
    expect(() => validateSoundWords([{ word: 'chime', example: 'a chime' }, { word: 'Chime', example: 'a bell' }])).toThrow('declared twice');
    expect(() => validateSoundWords([{ word: 'roar!', example: 'it roared' }])).toThrow('lowercase English words');
    expect(() => validateSoundWords([{ word: 'chime', example: 'a chime', url: 'x' }])).toThrow('unsupported field url');
    expect(() => validateSoundWords([{ word: 'chime', example: 'a chime', meaning: 'm'.repeat(61) }])).toThrow('one line');
    expect(validateSoundWords([{ word: 'chime', example: 'a chime', meaning: 'two\nlines' }])).toEqual([{ word: 'chime', example: 'a chime', meaning: 'two lines' }]);
    const many = Array.from({ length: SOUND_WORD_LIMITS.maxWords + 1 }, (_, index) => ({ word: `sound ${'abcdefghijklmnopqrstuvwxyzabcdefgh'[index]}`, example: 'a sound' }));
    expect(() => validateSoundWords(many)).toThrow(`at most ${SOUND_WORD_LIMITS.maxWords} words`);
    expect(() => validateSoundWords({ word: 'chime' })).toThrow('list');
  });
});

describe('a story\'s sound vocabulary', () => {
  it('offers only declared words that a playable recording answers, in declared order', () => {
    const media: Pick<FrozenNarrativeMedia, 'sounds' | 'soundCues'> = {
      sounds: [
        { word: 'chime', example: 'a soft chime' },
        { word: 'blade drawn', example: 'drew his sword' },
        { word: 'gong strikes', example: 'the gong sounded' },
        { word: 'beast roar', example: 'the beast roared' },
      ],
      soundCues: [
        recording('blade drawn'),
        recording('chime'),
        recording('gong strikes', 'http://media.example.org/gong.mp3'),
        recording(undefined),
      ],
    };
    expect(soundVocabulary(media).map(sound => sound.word)).toEqual(['chime', 'blade drawn']);
    expect(soundVocabulary(undefined)).toEqual([]);
    expect(soundVocabulary({ soundCues: [recording('chime')] })).toEqual([]);
  });
});
