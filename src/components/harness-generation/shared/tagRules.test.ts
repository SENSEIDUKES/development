import { describe, expect, it } from 'vitest';
import {
  HARNESS_TAG_RULES,
  SEN_APPEARANCE_INSTRUCTIONS,
  SEN_HOLDINGS_INSTRUCTIONS,
  SEN_NOVEL_AUTHOR_SKILL,
  SEN_SOUND_CUES_INSTRUCTIONS,
  SEN_SOUNDTRACK_INSTRUCTIONS,
  SEN_SPEAKERS_INSTRUCTIONS,
  assembleCapaPrompt,
} from '@seihouse/sen/harness-generation';
import { presentTaggerTagTeaching } from '../../../server/harness-generation/tagger';
import { composeHarnessSystemInstruction } from '../../../server/harness-generation/prompt';

const EVERY_KIND = [
  SEN_SOUND_CUES_INSTRUCTIONS, SEN_SOUNDTRACK_INSTRUCTIONS,
  SEN_SPEAKERS_INSTRUCTIONS, SEN_HOLDINGS_INSTRUCTIONS, SEN_APPEARANCE_INSTRUCTIONS,
];

describe('HARNESS tag rules', () => {
  it('are said once, before the first kind of tag, in the tagger\'s prompt', () => {
    const teaching = presentTaggerTagTeaching({
      soundWords: [{ word: 'blade drawn', example: 'drew his sword' }],
      soundtrack: { music: ['Ambient'], atmospheres: ['Rain'] },
    });
    expect(teaching.split(HARNESS_TAG_RULES)).toHaveLength(2);
    expect(teaching.startsWith(`${HARNESS_TAG_RULES}\n\n`)).toBe(true);
    for (const kind of EVERY_KIND) expect(teaching.indexOf(kind)).toBeGreaterThan(teaching.indexOf(HARNESS_TAG_RULES));
  });

  it('hold only what every tag shares, said once, so no kind repeats them', () => {
    expect(HARNESS_TAG_RULES.split('\n')).toEqual([
      'HARNESS TAG RULES',
      'Tags are notes the app removes before anyone reads, so each paragraph must read complete without them. Tag only what your prose shows, where it happens.',
      'In every tag, Name is MC for the main character; anyone else goes by the name Story Information uses.',
    ]);
    for (const instructions of EVERY_KIND) {
      expect(instructions).not.toMatch(/removes before anyone reads|Name is MC for the main character/i);
      // SENSEI, 2026-10-17: short, with no FORMAT / REQUIRED / FORBIDDEN / CHECK wall.
      expect(instructions).not.toMatch(/^(JOB|FORMAT|REQUIRED|FORBIDDEN|CHECK BEFORE YOU RETURN)\b/m);
    }
  });

  it('never reach the chapter writer: it places no tags (SENSEI, 2026-10-24)', () => {
    const system = composeHarnessSystemInstruction(assembleCapaPrompt({
      capturedAt: 'now', skills: [SEN_NOVEL_AUTHOR_SKILL],
    }));
    expect(system).not.toContain('HARNESS TAG RULES');
    expect(system).not.toContain('HOW TO TAG');
    for (const kind of EVERY_KIND) expect(system).not.toContain(kind);
    // Nor any tag form, by the one shape every kind of tag is written in.
    expect(system).not.toMatch(/\[\[[a-z@]/);
  });
});
