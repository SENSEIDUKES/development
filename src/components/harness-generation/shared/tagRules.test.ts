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

  it('hold only what every tag shares, said once, so no kind repeats them', () => {
    expect(HARNESS_TAG_RULES.split('\n')).toEqual([
      'HARNESS TAG RULES',
      'Tags are notes the app removes before anyone reads, so each paragraph must read complete without them. Tag only what your prose shows, where it happens.',
      'In every tag, Name is MC for the main character; anyone else goes by the name Story Information uses.',
    ]);
    for (const instructions of [SEN_SOUND_CUES_INSTRUCTIONS, SEN_SPEAKERS_INSTRUCTIONS, SEN_HOLDINGS_INSTRUCTIONS]) {
      expect(instructions).not.toMatch(/removes before anyone reads|Name is MC for the main character/i);
      // SENSEI, 2026-10-17: short, with no FORMAT / REQUIRED / FORBIDDEN / CHECK wall.
      expect(instructions).not.toMatch(/^(JOB|FORMAT|REQUIRED|FORBIDDEN|CHECK BEFORE YOU RETURN)\b/m);
    }
  });
});
