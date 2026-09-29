import { describe, expect, it } from 'vitest';
import { SOUND_CUE_RULES } from '../../../audio/soundCueRules';
import { SOUND_WORD_LIMITS, validateSoundWords, type SoundWord } from '../../../audio/soundWords';
import { LIBRARY_SOUND_WORDS } from '../../../host/media/libraryCatalog';
import {
  CAPA_PROMPT_TOKEN_LIMIT,
  SEN_FATE_SURVIVAL_SKILL,
  SEN_NOVEL_AUTHOR_SKILL,
  SEN_READING_MODE_SKILLS,
  SEN_SOUND_CUES_INSTRUCTIONS,
  SEN_SOUND_CUES_SKILL,
  assembleCapaPrompt,
  presentSoundVocabulary,
} from '@seihouse/sen/harness-generation';

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** The largest sound list a Sound Cue Pack may declare: every limit at its maximum. */
const largestVocabulary = (): SoundWord[] => validateSoundWords(Array.from({ length: SOUND_WORD_LIMITS.maxWords }, (_, index) => {
  const letters = String.fromCharCode(97 + (index % 26)) + String.fromCharCode(97 + Math.floor(index / 26));
  return {
    word: `${letters}${'w'.repeat(SOUND_WORD_LIMITS.wordCharacters - 2 - 6)} wwwww`,
    example: ['aaaaaaa', 'bbbbbbb', 'ccccccc', 'ddddddd', 'eeeeeee'].join(' ') + 'e'.repeat(SOUND_WORD_LIMITS.exampleCharacters - 39),
    meaning: 'm'.repeat(SOUND_WORD_LIMITS.meaningCharacters),
  };
}));

describe('SEN Sound Cues skill', () => {
  it('states the finished-cue rules with the same numbers placement enforces', () => {
    expect(SEN_SOUND_CUES_INSTRUCTIONS).toContain(`[[n|words]]`);
    expect(SEN_SOUND_CUES_INSTRUCTIONS).toContain(`one to ${NUMBER_WORDS[SOUND_CUE_RULES.maxWords]} words`);
    expect(SEN_SOUND_CUES_INSTRUCTIONS).toContain(`at most ${NUMBER_WORDS[SOUND_CUE_RULES.maxPerChapter]}`);
    expect(SEN_SOUND_CUES_SKILL).toMatchObject({ id: 'seihouse.sen-sound-cues', slot: 'soundCues', applications: ['generation'] });
  });

  it('names no sounds of its own: the story\'s example list teaches the pattern and is the whole vocabulary', () => {
    for (const { word, example } of LIBRARY_SOUND_WORDS) {
      expect(SEN_SOUND_CUES_INSTRUCTIONS).not.toContain(word);
      expect(SEN_SOUND_CUES_INSTRUCTIONS).not.toContain(example);
    }
  });

  it('tells the writer the list below is examples of how to mark, not text for the chapter', () => {
    const list = presentSoundVocabulary([{ word: 'blade drawn', example: 'drew his sword' }, { word: 'chime', example: 'a soft chime', meaning: 'a small bright chime' }]);
    const [header, ...lines] = list.split('\n');
    expect(header).toMatch(/^The examples below show how to do it\./);
    expect(header).toContain('They are not text for the chapter');
    expect(header).toContain('use only these sound words');
    expect(lines).toEqual(['[[n|drew his sword]] → blade drawn', '[[n|a soft chime]] → chime (a small bright chime)']);
  });

  it('fits the CAPA budget with every bundled skill loaded and the largest sound list a pack may declare', () => {
    const soundVocabulary = largestVocabulary();
    const capa = assembleCapaPrompt({
      capturedAt: 'now',
      originalLanguage: 'ja',
      skills: [SEN_NOVEL_AUTHOR_SKILL, SEN_FATE_SURVIVAL_SKILL, SEN_READING_MODE_SKILLS['Easy Read'], SEN_SOUND_CUES_SKILL],
      soundVocabulary,
    });
    expect(capa.soundVocabulary).toHaveLength(SOUND_WORD_LIMITS.maxWords);
    expect(capa.estimatedTokens).toBeLessThan(CAPA_PROMPT_TOKEN_LIMIT);
    // Room is left for an author's own Pacing, Continuity and Style skills and a Translation glossary.
    expect(CAPA_PROMPT_TOKEN_LIMIT - capa.estimatedTokens).toBeGreaterThan(1_000);
  });

  it('points a budget overflow at the Sound Cue Pack among its remedies', () => {
    const long = { ...SEN_NOVEL_AUTHOR_SKILL, id: 'test.long', slot: 'style' as const, instructions: 'x'.repeat(CAPA_PROMPT_TOKEN_LIMIT * 4) };
    expect(() => assembleCapaPrompt({ capturedAt: 'now', skills: [SEN_NOVEL_AUTHOR_SKILL, long, SEN_SOUND_CUES_SKILL], soundVocabulary: largestVocabulary() }))
      .toThrow('equip a Sound Cue Pack with fewer sound words');
  });
});
