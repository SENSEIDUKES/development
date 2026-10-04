import { describe, expect, it } from 'vitest';
import { AUDIO_ENERGIES } from '../../../audio/audioTags';
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
  SEN_SPEAKERS_SKILL,
  assembleCapaPrompt,
  presentSoundVocabulary,
} from '@seihouse/sen/harness-generation';
import { readMarks } from '../../../narrative/marks';

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
  it('teaches the sound tag with the same numbers placement enforces, in its five parts', () => {
    expect(SEN_SOUND_CUES_SKILL).toMatchObject({ id: 'seihouse.sen-sound-cues', version: '2.0.0', slot: 'soundCues', applications: ['generation'] });
    const lines = SEN_SOUND_CUES_INSTRUCTIONS.split('\n');
    expect(lines[0]).toMatch(/^JOB: /);
    expect(lines).toContain('FORMAT: [[sound: Sound Word | Words | Energy]]');
    expect(lines.filter(line => /^(?:REQUIRED|FORBIDDEN|CHECK BEFORE YOU RETURN):/.test(line)).map(line => line.split(':')[0])).toEqual(['REQUIRED', 'FORBIDDEN', 'CHECK BEFORE YOU RETURN']);
    expect(lines.at(-1)).toMatch(/^CHECK BEFORE YOU RETURN: /);
    expect(SEN_SOUND_CUES_INSTRUCTIONS).toContain(`the few words where it happens, at most ${SOUND_CUE_RULES.maxWords}.`);
    expect(SEN_SOUND_CUES_INSTRUCTIONS).toContain(`at most ${SOUND_CUE_RULES.maxWords} words and an energy`);
    expect(SEN_SOUND_CUES_INSTRUCTIONS).toContain(`At most ${SOUND_CUE_RULES.maxPerChapter} per chapter.`);
    expect(SEN_SOUND_CUES_INSTRUCTIONS).toContain(`${AUDIO_ENERGIES.slice(0, -1).join(', ')} or ${AUDIO_ENERGIES.at(-1)}`);
  });

  it('never teaches the retired numbered marks or a separate list of sounds', () => {
    expect(SEN_SOUND_CUES_INSTRUCTIONS).not.toMatch(/\[\[n\||\[\[\d|soundCues|"mark"/);
  });

  it('names no sounds of its own: the story\'s example list teaches the pattern and is the whole vocabulary', () => {
    for (const { word, example } of LIBRARY_SOUND_WORDS) {
      expect(SEN_SOUND_CUES_INSTRUCTIONS).not.toContain(word);
      expect(SEN_SOUND_CUES_INSTRUCTIONS).not.toContain(example);
    }
  });

  it('shows one example tag made from the first word, then every word with example words it fits', () => {
    const list = presentSoundVocabulary([{ word: 'blade drawn', example: 'drew his sword' }, { word: 'chime', example: 'a soft chime', meaning: 'a small bright chime' }]);
    const [example, header, ...lines] = list.split('\n');
    expect(example).toBe('EXAMPLE: [[sound: blade drawn | drew his sword | medium]]');
    // The example is a real tag: the reader keeps its words and reads its sound and Energy.
    const reading = readMarks(example.slice('EXAMPLE: '.length));
    expect(reading).toMatchObject({ text: 'drew his sword', sounds: [{ sound: 'blade drawn', energy: 'medium', start: 0, end: 14 }], soundIssues: [] });
    expect(header).toBe('SOUND WORDS (each with example words; write your own):');
    expect(lines).toEqual(['blade drawn: drew his sword', 'chime: a soft chime (a small bright chime)']);
    expect(presentSoundVocabulary([])).toBe('');
  });

  it('fits the CAPA budget with every bundled skill loaded and the largest sound list a pack may declare', () => {
    const soundVocabulary = largestVocabulary();
    const capa = assembleCapaPrompt({
      capturedAt: 'now',
      originalLanguage: 'ja',
      skills: [SEN_NOVEL_AUTHOR_SKILL, SEN_FATE_SURVIVAL_SKILL, SEN_READING_MODE_SKILLS['Easy Read'], SEN_SOUND_CUES_SKILL, SEN_SPEAKERS_SKILL],
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
