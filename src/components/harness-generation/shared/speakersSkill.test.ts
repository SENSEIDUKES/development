import { describe, expect, it } from 'vitest';
import { SEN_SPEAKERS_INSTRUCTIONS } from '@seihouse/sen/harness-generation';
import { readMarks } from '../../../narrative/marks';
import { isMainCharacterTag } from './speakers';

describe('The speaker tag', () => {
  it('teaches the speaker tag in a few short lines, with one example: the main character\'s', () => {
    const lines = SEN_SPEAKERS_INSTRUCTIONS.split('\n');
    expect(lines).toEqual([
      'Start each paragraph with speech with its speaker: [[@Name]]',
      'Example: [[@MC]] “Hold the gate,” he said.',
      'One speaker per paragraph. Speech goes in quotation marks.',
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

});
