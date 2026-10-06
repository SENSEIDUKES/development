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
  it('teaches the main character\'s own tag and the name tag the HARNESS reads, in its five parts', () => {
    expect(SEN_SPEAKERS_SKILL).toMatchObject({ id: 'seihouse.sen-speakers', version: '2.1.0', slot: 'speakers', applications: ['generation'] });
    const lines = SEN_SPEAKERS_INSTRUCTIONS.split('\n');
    expect(lines[0]).toMatch(/^JOB: /);
    expect(lines.map(line => line.match(/^([A-Z][A-Z ]+):/)?.[1]).filter(Boolean)).toEqual(['JOB', 'FORMAT', 'EXAMPLE', 'REQUIRED', 'FORBIDDEN', 'CHECK BEFORE YOU RETURN']);
    expect(SEN_SPEAKERS_INSTRUCTIONS).toContain('[[@MC]] for the main character, whatever the prose calls them.');
    expect(SEN_SPEAKERS_INSTRUCTIONS).toContain('Anyone else: the same tag with their own name after the @, exactly as Story Information writes it.');
    // No tag form holds a placeholder name a writer could copy as a speaker.
    expect(readMarks(SEN_SPEAKERS_INSTRUCTIONS).speakers.map(tag => tag.name)).toEqual(['MC', 'MC']);
    // Its example reads as one tag on one spoken line: the main character's.
    const example = readMarks(lines.find(line => line.startsWith('EXAMPLE: '))!.slice('EXAMPLE: '.length));
    expect(example).toMatchObject({ text: '“Hold the gate,” he said.', speakers: [{ name: 'MC', offset: 0 }] });
    expect(isMainCharacterTag(example.speakers[0].name)).toBe(true);
    // The rule Chapter 1 broke in the owner's tests, and the check that holds the writer to it.
    expect(SEN_SPEAKERS_INSTRUCTIONS).toContain('In every chapter, including the first: each paragraph with speech starts with its speaker\'s tag.');
    expect(lines.at(-1)).toBe('CHECK BEFORE YOU RETURN: Every paragraph with a quotation mark starts with a speaker tag naming a real character.');
    expect(SEN_SPEAKERS_INSTRUCTIONS).toContain('FORBIDDEN: Dashes for speech. A tag with a word from these instructions in place of a real name.');
    expect(SEN_SPEAKERS_INSTRUCTIONS).toMatch(/start a new paragraph when the speaker changes/);
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
    expect(assembleCapaPrompt(bundled).text).toContain('CAPA SKILL [Speakers] — SEN Speakers v2.1.0');
    // A host whose catalog lacks the skill writes the chapter without speaker tags.
    const minimal = freezeHarnessSkillLoadout(story, createHarnessSkillCatalog([SEN_NOVEL_AUTHOR_SKILL]), 'now');
    expect(minimal.skills.map(skill => skill.slot)).toEqual(['author']);
  });
});
