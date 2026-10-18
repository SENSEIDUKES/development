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
  it('teaches the speaker tag in a few short lines, with one example: the main character\'s', () => {
    expect(SEN_SPEAKERS_SKILL).toMatchObject({ id: 'seihouse.sen-speakers', version: '2.3.0', slot: 'speakers', applications: ['generation'] });
    const lines = SEN_SPEAKERS_INSTRUCTIONS.split('\n');
    expect(lines).toEqual([
      'Every paragraph with speech starts with its speaker: [[@Name]]',
      'Example: [[@MC]] “Hold the gate,” he said.',
      'A new speaker starts a new paragraph. Speech goes in quotation marks.',
      'A line without its speaker is read in the wrong voice.',
    ]);
    // A copied placeholder is read as no tag, never as a speaker named "Name".
    expect(readMarks(SEN_SPEAKERS_INSTRUCTIONS).speakers.map(tag => tag.name)).toEqual(['Name', 'MC']);
    const example = readMarks(lines.find(line => line.startsWith('Example: '))!.slice('Example: '.length));
    expect(example).toMatchObject({ text: '“Hold the gate,” he said.', speakers: [{ name: 'MC', offset: 0 }] });
    expect(isMainCharacterTag(example.speakers[0].name)).toBe(true);
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
    expect(bundled.skills.map(skill => skill.slot)).toEqual(['author', 'speakers', 'holdings', 'appearance']);
    expect(assembleCapaPrompt(bundled).text).toContain('CAPA SKILL [Speakers] — SEN Speakers v2.3.0');
    // A host whose catalog lacks the skill writes the chapter without speaker tags.
    const minimal = freezeHarnessSkillLoadout(story, createHarnessSkillCatalog([SEN_NOVEL_AUTHOR_SKILL]), 'now');
    expect(minimal.skills.map(skill => skill.slot)).toEqual(['author']);
  });
});
