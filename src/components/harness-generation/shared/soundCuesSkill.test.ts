import { describe, expect, it } from 'vitest';
import { buildHarnessTagPrompt } from '../../../server/harness-generation/tagger';
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
  assembleCapaPrompt,
  presentSoundVocabulary,
} from '@seihouse/sen/harness-generation';

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
  it('teaches the sound tag with the same numbers placement enforces', () => {
    // The owner's rules: a cue is earned by the prose, and a sentence is never bent to fit one.
    expect(SEN_SOUND_CUES_INSTRUCTIONS).toContain('Never add or change a sentence to fit a sound.');
    expect(SEN_SOUND_CUES_INSTRUCTIONS).not.toContain('may have none');
    expect(SEN_SOUND_CUES_INSTRUCTIONS).toContain(`wrap up to ${SOUND_CUE_RULES.maxWords} of its own words, where they stand`);
    // Blade Chapter 17: a tag written between sentences, with words of its own, was dropped.
    expect(SEN_SOUND_CUES_INSTRUCTIONS).toContain('never put a tag between sentences or write words only for it.');
    expect(SEN_SOUND_CUES_INSTRUCTIONS).toContain(`At most ${SOUND_CUE_RULES.maxPerChapter} a chapter.`);
    expect(SEN_SOUND_CUES_INSTRUCTIONS).toContain(`${AUDIO_ENERGIES.slice(0, -1).join(', ')} or ${AUDIO_ENERGIES.at(-1)}`);
  });

  it('never teaches the retired numbered marks or a separate list of sounds', () => {
    expect(SEN_SOUND_CUES_INSTRUCTIONS).not.toMatch(/\[\[n\||\[\[\d|soundCues|"mark"/);
  });

  it('names no sounds of its own: the story\'s list is the whole vocabulary', () => {
    for (const { word } of LIBRARY_SOUND_WORDS) expect(SEN_SOUND_CUES_INSTRUCTIONS).not.toContain(word);
  });

  it('gives the writer exactly these instructions, so nothing changes what the model receives unnoticed', () => {
    expect(SEN_SOUND_CUES_INSTRUCTIONS).toBe([
      'When your sentence describes a sound below happening, wrap up to 8 of its own words, where they stand:',
      '[[sound: Sound Word | the words | Energy]]  Energy: low, medium or high.',
      'The words stay part of your sentence: never put a tag between sentences or write words only for it.',
      'At most 10 a chapter. Never add or change a sentence to fit a sound.',
    ].join('\n'));
  });

  it('shows one example made from the first word, the tag inside a sentence with no phrase to copy, then the words', () => {
    // The owner's Sundered Heavens test: given phrases ("iron scraped stone"), the writer copied them into the chapter.
    const list = presentSoundVocabulary([{ word: 'unsheathe', example: 'drew his sword' }, { word: 'chime', example: 'a soft chime', meaning: 'a small bright chime' }]);
    expect(list).toBe([
      'Example: Far off, [[sound: unsheathe | the words of your own sentence | high]] and the yard fell still.',
      'SOUND WORDS: unsheathe, chime',
    ].join('\n'));
    expect(list).not.toMatch(/drew his sword|a soft chime|small bright/);
    expect(presentSoundVocabulary([])).toBe('');
  });

  it('carries the largest sound list a pack may declare into the tagger\'s prompt', () => {
    // The list left the writer with the rest of the tag teaching (SENSEI,
    // 2026-10-24), so what has to hold it now is the tagger's own prompt.
    const soundWords = largestVocabulary();
    const prompt = buildHarnessTagPrompt({
      operation: 'tag-chapter', storyId: 'story', chapterId: 'chapter', chapterNumber: 1, model: 'fixture', language: 'en',
      paragraphs: ['The yard fell still.'], subjects: [], soundWords,
    });
    expect(prompt.systemInstruction).toContain(`SOUND WORDS: ${soundWords.map(sound => sound.word).join(', ')}`);
    expect(prompt.systemInstruction).toContain('[[sound:');
  });

  it('leaves the CAPA budget to the writing skills alone, with room for an author\'s own', () => {
    const capa = assembleCapaPrompt({
      capturedAt: 'now',
      originalLanguage: 'ja',
      skills: [SEN_NOVEL_AUTHOR_SKILL, SEN_FATE_SURVIVAL_SKILL, SEN_READING_MODE_SKILLS['Easy Read']],
    });
    expect(capa.estimatedTokens).toBeLessThan(CAPA_PROMPT_TOKEN_LIMIT);
    // Room is left for an author's own Pacing, Continuity and Style skills and a Translation glossary.
    expect(CAPA_PROMPT_TOKEN_LIMIT - capa.estimatedTokens).toBeGreaterThan(1_000);
  });

  it('points a budget overflow at the remedies that are left', () => {
    const long = { ...SEN_NOVEL_AUTHOR_SKILL, id: 'test.long', slot: 'style' as const, instructions: 'x'.repeat(CAPA_PROMPT_TOKEN_LIMIT * 4) };
    expect(() => assembleCapaPrompt({ capturedAt: 'now', skills: [SEN_NOVEL_AUTHOR_SKILL, long] }))
      .toThrow('Empty a skill slot, install shorter instructions, or narrow the Translation glossary.');
  });
});
