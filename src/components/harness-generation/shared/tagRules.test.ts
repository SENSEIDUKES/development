import { describe, expect, it } from 'vitest';
import {
  HARNESS_TAG_RULES,
  SEN_HOLDINGS_INSTRUCTIONS,
  SEN_HOLDINGS_SKILL,
  SEN_NOVEL_AUTHOR_SKILL,
  SEN_SOUND_CUES_INSTRUCTIONS,
  SEN_SOUND_CUES_SKILL,
  SEN_SPEAKERS_INSTRUCTIONS,
  SEN_SPEAKERS_SKILL,
  assembleCapaPrompt,
} from '@seihouse/sen/harness-generation';

const assemble = (...skills: Array<typeof SEN_NOVEL_AUTHOR_SKILL>) => assembleCapaPrompt({
  capturedAt: 'now', skills: [SEN_NOVEL_AUTHOR_SKILL, ...skills], soundVocabulary: [{ word: 'blade drawn', example: 'drew his sword' }],
}).text;

describe('HARNESS tag rules', () => {
  it('are said once, just before the first skill that teaches a tag, and never without one', () => {
    const text = assemble(SEN_SOUND_CUES_SKILL, SEN_SPEAKERS_SKILL, SEN_HOLDINGS_SKILL);
    expect(text.split(HARNESS_TAG_RULES)).toHaveLength(2);
    expect(text).toContain(`${HARNESS_TAG_RULES}\n\nCAPA SKILL [Sound Cues]`);
    expect(text.indexOf('CAPA SKILL [Author]')).toBeLessThan(text.indexOf(HARNESS_TAG_RULES));
    // A story with no sound words: the rules come before Speakers instead.
    expect(assemble(SEN_SPEAKERS_SKILL, SEN_HOLDINGS_SKILL)).toContain(`${HARNESS_TAG_RULES}\n\nCAPA SKILL [Speakers]`);
    expect(assemble()).not.toContain('HARNESS TAG RULES');
  });

  it('hold only what every tag shares, so no kind repeats them', () => {
    expect(HARNESS_TAG_RULES.split('\n')).toEqual([
      'HARNESS TAG RULES (every tag below)',
      'Tags are machine notes in the prose, removed before anyone reads it.',
      'REQUIRED: Write each tag exactly as its FORMAT shows. Each paragraph reads complete without its tags.',
      'FORBIDDEN: Tags outside paragraphs. Writing about tags in the prose.',
    ]);
    for (const instructions of [SEN_SOUND_CUES_INSTRUCTIONS, SEN_SPEAKERS_INSTRUCTIONS, SEN_HOLDINGS_INSTRUCTIONS]) {
      expect(instructions).not.toMatch(/only inside paragraphs|never in the title|removed before anyone reads|double brackets/i);
      // Every kind has the same parts, in the same order, and ends with its check.
      expect(instructions.startsWith('JOB: ')).toBe(true);
      expect(instructions.split('\n').at(-1)).toMatch(/^CHECK BEFORE YOU RETURN: /);
      for (const part of ['FORMAT', 'REQUIRED:', 'FORBIDDEN:']) expect(instructions).toContain(part);
    }
  });
});
