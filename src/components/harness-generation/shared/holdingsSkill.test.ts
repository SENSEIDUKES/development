import { describe, expect, it } from 'vitest';
import {
  CAPA_SCHEMA,
  SEN_HOLDINGS_INSTRUCTIONS,
  SEN_HOLDINGS_SKILL,
  SEN_NOVEL_AUTHOR_SKILL,
  assembleCapaPrompt,
  createEmptyHarnessWorkspaceState,
  createHarnessSkillCatalog,
  freezeHarnessSkillLoadout,
  includeBundledHarnessSkills,
  managedCapaSlotReason,
} from '@seihouse/sen/harness-generation';
import { TAG_WORDS, readMarks } from '../../../narrative/marks';
import { readHoldingTag } from './holdings';
import { createHarnessStory } from './foundation';
import { defaultHarnessRuntime } from './ids';

describe('SEN Holdings skill', () => {
  it('teaches every holdings tag word, each example reading as the change it names', () => {
    expect(SEN_HOLDINGS_SKILL).toMatchObject({ id: 'seihouse.sen-holdings', version: '1.0.0', slot: 'holdings', applications: ['generation'] });
    const examples = readMarks(SEN_HOLDINGS_INSTRUCTIONS).wordTags;
    // Every tag word of the language is taught, and nothing else is written as a tag.
    expect([...new Set(examples.map(tag => tag.word))].sort()).toEqual(Object.keys(TAG_WORDS).sort());
    expect(readMarks(SEN_HOLDINGS_INSTRUCTIONS).wordTagIssues).toEqual([]);
    for (const tag of examples) expect(readHoldingTag(tag), tag.word).toMatchObject({ ok: true });
    // Placeholders only, so no example item can slip into a story; the main character is MC.
    expect(examples.map(tag => tag.parts[0])).toEqual(expect.arrayContaining(['Name', 'MC']));
    expect(examples.every(tag => ['Name', 'MC'].includes(tag.parts[0]))).toBe(true);
    expect(examples.filter(tag => tag.word !== 'rank').every(tag => ['Thing', 'Ability'].includes(tag.parts[1]))).toBe(true);
  });

  it('carries the reading rule, the pacing rule and the closing list', () => {
    expect(SEN_HOLDINGS_INSTRUCTIONS).toMatch(/Characters use only what they hold/);
    expect(SEN_HOLDINGS_INSTRUCTIONS).toMatch(/give a new thing or ability only when the story earns it/);
    expect(SEN_HOLDINGS_INSTRUCTIONS).toMatch(/Finding a manual is not learning its technique, and learning a technique is not mastering it/);
    expect(SEN_HOLDINGS_INSTRUCTIONS).toMatch(/never a plan, promise, dream, memory or lie/);
    expect(SEN_HOLDINGS_INSTRUCTIONS).toMatch(/list in mainCharacterHoldings every thing the main character has and every ability they know or are learning/);
  });

  it('never speaks of the retired dialogue contract, Sound Cues, numbered marks or the packet\'s headings', () => {
    expect(SEN_HOLDINGS_INSTRUCTIONS).not.toMatch(/dialogue|Sound Cue|\[\[n\||soundCues/);
    expect(SEN_HOLDINGS_INSTRUCTIONS).not.toMatch(/CURRENT STORY INFORMATION|MISSION REMINDER|IMMEDIATE CHAPTER REQUEST|HOLDINGS \(/);
  });

  it('loads on every chapter from its managed slot, is never equipped by hand, and a host without it still writes', () => {
    expect(CAPA_SCHEMA.find(slot => slot.id === 'holdings')).toMatchObject({ managedBy: 'always', installable: false });
    expect(managedCapaSlotReason('holdings')).toContain('every chapter');
    expect(managedCapaSlotReason('speakers')).toContain('who speaks each line');
    expect(includeBundledHarnessSkills([]).map(skill => skill.id)).toContain(SEN_HOLDINGS_SKILL.id);
    const { story } = createHarnessStory(createEmptyHarnessWorkspaceState(), { premise: 'A sword is found.' }, 'en', defaultHarnessRuntime);
    story.skillLoadout = { author: { id: SEN_NOVEL_AUTHOR_SKILL.id, version: SEN_NOVEL_AUTHOR_SKILL.version } };
    const bundled = freezeHarnessSkillLoadout(story, createHarnessSkillCatalog(includeBundledHarnessSkills([])), 'now');
    expect(bundled.skills.map(skill => skill.slot)).toEqual(['author', 'speakers', 'holdings']);
    expect(assembleCapaPrompt(bundled).text).toContain('CAPA SKILL [Holdings] — SEN Holdings v1.0.0');
    // A host whose catalog lacks the skill writes the chapter without holding tags.
    const minimal = freezeHarnessSkillLoadout(story, createHarnessSkillCatalog([SEN_NOVEL_AUTHOR_SKILL]), 'now');
    expect(minimal.skills.map(skill => skill.slot)).toEqual(['author']);
  });
});
