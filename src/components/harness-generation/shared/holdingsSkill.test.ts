import { describe, expect, it } from 'vitest';
import { SEN_HOLDINGS_INSTRUCTIONS } from '@seihouse/sen/harness-generation';
import { HOLDING_TAG_WORDS, readMarks } from '../../../narrative/marks';
import { readHoldingTag } from './holdings';

describe('The holding tags', () => {
  it('teaches every holdings tag word, each form reading as the change it names', () => {
    const examples = readMarks(SEN_HOLDINGS_INSTRUCTIONS).wordTags;
    // Every Holdings tag word is taught, and nothing else is written as a tag.
    expect([...new Set(examples.map(tag => tag.word))].sort()).toEqual(Object.keys(HOLDING_TAG_WORDS).sort());
    expect(readMarks(SEN_HOLDINGS_INSTRUCTIONS).wordTagIssues).toEqual([]);
    for (const tag of examples) expect(readHoldingTag(tag), tag.word).toMatchObject({ ok: true });
    // Every form is a placeholder; the one example (SENSEI, 2026-10-17) is on its own line.
    const forms = readMarks(SEN_HOLDINGS_INSTRUCTIONS.split('\n').filter(line => !line.startsWith('Example: ')).join('\n')).wordTags;
    expect(forms.every(tag => tag.parts[0] === 'Name')).toBe(true);
    expect(forms.filter(tag => tag.word !== 'rank').every(tag => ['Thing', 'Ability'].includes(tag.parts[1]))).toBe(true);
    expect(examples.filter(tag => tag.parts[0] !== 'Name')).toEqual([expect.objectContaining({ word: 'gained', parts: ['MC', 'Iron Key'] })]);
  });

  it('carries the owner\'s rules in a few short lines, with no FORMAT / REQUIRED / FORBIDDEN / CHECK wall', () => {
    expect(SEN_HOLDINGS_INSTRUCTIONS.split('\n')[0]).toMatch(/^When the chapter changes what someone has/);
    expect(SEN_HOLDINGS_INSTRUCTIONS).not.toMatch(/^(JOB|FORMAT|REQUIRED|FORBIDDEN|CHECK BEFORE YOU RETURN)\b/m);
    // Things and abilities only, each with one clean name, and only what happens in the story's present.
    expect(SEN_HOLDINGS_INSTRUCTIONS).toContain('Thing: an object. Ability: a technique, skill or power. One short name each, used every time.');
    expect(SEN_HOLDINGS_INSTRUCTIONS).toContain('Only the story\'s present: no plans, memories or lies.');
    // The example is one note as the tagger returns it: the sentence, then the tag.
    expect(SEN_HOLDINGS_INSTRUCTIONS).toContain('Example: {"paragraph": 3, "words": "He pocketed the iron key.", "tag": "[[gained: MC | Iron Key]]"}');
    expect(SEN_HOLDINGS_INSTRUCTIONS).not.toMatch(/Story Information/);
    // The closing list is asked for by the reply's own schema, never repeated here.
    expect(SEN_HOLDINGS_INSTRUCTIONS).not.toContain('mainCharacterHoldings');
  });

  it('never speaks of the retired dialogue contract, Sound Cues, numbered marks or the packet\'s headings', () => {
    expect(SEN_HOLDINGS_INSTRUCTIONS).not.toMatch(/dialogue|Sound Cue|\[\[n\||soundCues/);
    expect(SEN_HOLDINGS_INSTRUCTIONS).not.toMatch(/CURRENT STORY INFORMATION|MISSION REMINDER|IMMEDIATE CHAPTER REQUEST|HOLDINGS \(/);
  });

});
