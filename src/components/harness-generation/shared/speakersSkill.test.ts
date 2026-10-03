import { describe, expect, it } from 'vitest';
import {
  CAPA_SCHEMA,
  SEN_NOVEL_AUTHOR_SKILL,
  SEN_SPEAKERS_INSTRUCTIONS,
  SEN_SPEAKERS_SKILL,
  assembleCapaPrompt,
  createEmptyHarnessWorkspaceState,
  createHarnessSkillCatalog,
  freezeHarnessSkillLoadout,
  includeBundledHarnessSkills,
  managedCapaSlotReason,
} from '@seihouse/sen/harness-generation';
import { readMarks } from '../../../narrative/marks';
import { isMainCharacterTag } from './speakers';
import { createHarnessStory } from './foundation';
import { defaultHarnessRuntime } from './ids';

describe('SEN Speakers skill', () => {
  it('teaches the main character\'s own tag and the name tag the HARNESS reads, with a placeholder name', () => {
    expect(SEN_SPEAKERS_SKILL).toMatchObject({ id: 'seihouse.sen-speakers', version: '1.2.0', slot: 'speakers', applications: ['generation'] });
    expect(SEN_SPEAKERS_INSTRUCTIONS).toContain('[[@MC]]');
    expect(SEN_SPEAKERS_INSTRUCTIONS).toContain('[[@Name]]');
    // Its own examples read as one tag on one spoken line each: the main character's, then anyone else's.
    const [mine, theirs] = SEN_SPEAKERS_INSTRUCTIONS.split('\n').slice(-2).map(line => readMarks(line));
    expect(mine).toMatchObject({ text: '“Hold the gate,” he said.', speakers: [{ name: 'MC', offset: 0 }] });
    expect(isMainCharacterTag(mine.speakers[0].name)).toBe(true);
    expect(theirs).toMatchObject({ text: '“It will not hold,” she said.', speakers: [{ name: 'Name', offset: 0 }] });
    expect(isMainCharacterTag(theirs.speakers[0].name)).toBe(false);
    expect(SEN_SPEAKERS_INSTRUCTIONS).toMatch(/never dashes/);
    expect(SEN_SPEAKERS_INSTRUCTIONS).toMatch(/new paragraph when the speaker changes/);
    expect(SEN_SPEAKERS_INSTRUCTIONS).toMatch(/the tag is always \[\[@MC\]\], whatever name or pronoun the prose uses for them\./);
    // Point of view is the Style skill's choice, kept by the HARNESS: this skill never leans on it.
    expect(SEN_SPEAKERS_INSTRUCTIONS).not.toMatch(/first person|first-person|third person|third-person|point of view/i);
  });

  it('never speaks of the retired dialogue contract, Sound Cues or numbered marks, so the guards on them stay true', () => {
    expect(SEN_SPEAKERS_INSTRUCTIONS).not.toMatch(/dialogue|Sound Cues|\[\[n\||soundCues/);
    expect(SEN_SPEAKERS_INSTRUCTIONS).not.toMatch(/CURRENT STORY INFORMATION|MISSION REMINDER|IMMEDIATE CHAPTER REQUEST/);
  });

  it('loads on every chapter from its managed slot, is never equipped by hand, and a host without it still writes', () => {
    expect(CAPA_SCHEMA.find(slot => slot.id === 'speakers')).toMatchObject({ managedBy: 'always', installable: false });
    expect(managedCapaSlotReason('speakers')).toContain('every chapter');
    expect(includeBundledHarnessSkills([]).map(skill => skill.id)).toContain(SEN_SPEAKERS_SKILL.id);
    const { story } = createHarnessStory(createEmptyHarnessWorkspaceState(), { premise: 'A gate holds.' }, 'en', defaultHarnessRuntime);
    story.skillLoadout = { author: { id: SEN_NOVEL_AUTHOR_SKILL.id, version: SEN_NOVEL_AUTHOR_SKILL.version } };
    const bundled = freezeHarnessSkillLoadout(story, createHarnessSkillCatalog(includeBundledHarnessSkills([])), 'now');
    expect(bundled.skills.map(skill => skill.slot)).toEqual(['author', 'speakers', 'holdings']);
    expect(assembleCapaPrompt(bundled).text).toContain('CAPA SKILL [Speakers] — SEN Speakers v1.2.0');
    // A host whose catalog lacks the skill writes the chapter without speaker tags.
    const minimal = freezeHarnessSkillLoadout(story, createHarnessSkillCatalog([SEN_NOVEL_AUTHOR_SKILL]), 'now');
    expect(minimal.skills.map(skill => skill.slot)).toEqual(['author']);
  });
});
