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
  it('teaches every holdings tag word, each form reading as the change it names', () => {
    expect(SEN_HOLDINGS_SKILL).toMatchObject({ id: 'seihouse.sen-holdings', version: '2.1.0', slot: 'holdings', applications: ['generation'] });
    const examples = readMarks(SEN_HOLDINGS_INSTRUCTIONS).wordTags;
    // Every tag word of the language is taught, and nothing else is written as a tag.
    expect([...new Set(examples.map(tag => tag.word))].sort()).toEqual(Object.keys(TAG_WORDS).sort());
    expect(readMarks(SEN_HOLDINGS_INSTRUCTIONS).wordTagIssues).toEqual([]);
    for (const tag of examples) expect(readHoldingTag(tag), tag.word).toMatchObject({ ok: true });
    // Placeholders only, so no example item can slip into a story.
    expect(examples.every(tag => tag.parts[0] === 'Name')).toBe(true);
    expect(examples.filter(tag => tag.word !== 'rank').every(tag => ['Thing', 'Ability'].includes(tag.parts[1]))).toBe(true);
    expect(SEN_HOLDINGS_INSTRUCTIONS).toContain('Name: MC for the main character; anyone else exactly as Story Information writes them.');
  });

  it('carries the reading rule, the pacing rule and the closing list, in its five parts', () => {
    const lines = SEN_HOLDINGS_INSTRUCTIONS.split('\n');
    expect(lines.map(line => line.match(/^([A-Z][A-Z ]+)[:( ]/)?.[1]?.trim()).filter(Boolean)).toEqual(['JOB', 'FORMAT', 'REQUIRED', 'FORBIDDEN', 'CHECK BEFORE YOU RETURN']);
    expect(SEN_HOLDINGS_INSTRUCTIONS).toMatch(/Characters use only what they have\. A new thing or ability comes only when the story earns it\./);
    expect(SEN_HOLDINGS_INSTRUCTIONS).toMatch(/A found manual treated as a learned technique, or a learned technique as mastered\./);
    expect(SEN_HOLDINGS_INSTRUCTIONS).toMatch(/Tags for plans, promises, dreams, memories or lies\./);
    expect(lines.at(-1)).toBe('CHECK BEFORE YOU RETURN: Every change has its tag in the prose, and mainCharacterHoldings lists by exact name, with no tags, every thing the main character owns and every ability they know or are learning.');
    // Things and abilities only, each with one clean name: never the story's events or a count inside a name.
    expect(SEN_HOLDINGS_INSTRUCTIONS).toContain('Each keeps one short exact name, with no count or description inside it; a count goes in its own place.');
    expect(SEN_HOLDINGS_INSTRUCTIONS).toMatch(/Events, news, deadlines, places, people or alliances as things or abilities\./);
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
    expect(assembleCapaPrompt(bundled).text).toContain('CAPA SKILL [Holdings] — SEN Holdings v2.1.0');
    // A host whose catalog lacks the skill writes the chapter without holding tags.
    const minimal = freezeHarnessSkillLoadout(story, createHarnessSkillCatalog([SEN_NOVEL_AUTHOR_SKILL]), 'now');
    expect(minimal.skills.map(skill => skill.slot)).toEqual(['author']);
  });
});
