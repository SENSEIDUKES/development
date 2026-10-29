import { describe, expect, it } from 'vitest';
import { SEN_SPEAKERS_INSTRUCTIONS } from '@seihouse/sen/harness-generation';
import { readMarks } from '../../../narrative/marks';
import { isMainCharacterTag } from './speakers';

describe('The speaker tag', () => {
  it('teaches the speaker tag in a few short lines, as a note on every spoken line, with one example: the main character\'s', () => {
    const lines = SEN_SPEAKERS_INSTRUCTIONS.split('\n');
    expect(lines).toEqual([
      'Every spoken line gets its speaker: [[@Name]], on the words of that line.',
      'Example: {"paragraph": 4, "words": "“Hold the gate,”", "tag": "[[@MC]]"}',
      'A line is what stands inside one pair of quotation marks. A paragraph with several lines gets a note for each.',
    ]);
    // A copied placeholder is read as no tag, never as a speaker named "Name".
    expect(readMarks(SEN_SPEAKERS_INSTRUCTIONS).speakers.map(tag => tag.name)).toEqual(['Name', 'MC']);
    // The example is one note as the tagger returns it, and its tag is the main character's.
    const example = JSON.parse(lines.find(line => line.startsWith('Example: '))!.slice('Example: '.length)) as { paragraph: number; words: string; tag: string };
    expect(example).toEqual({ paragraph: 4, words: '“Hold the gate,”', tag: '[[@MC]]' });
    expect(isMainCharacterTag(readMarks(example.tag).speakers[0].name)).toBe(true);
    // One speaker per paragraph was a rule for an author composing one; a tagger notes every line.
    expect(SEN_SPEAKERS_INSTRUCTIONS).not.toMatch(/One speaker per paragraph|Start each paragraph/);
    // Point of view is the Style skill's choice, kept by the HARNESS: this skill never leans on it.
    expect(SEN_SPEAKERS_INSTRUCTIONS).not.toMatch(/first person|first-person|third person|third-person|point of view/i);
  });

  it('never speaks of the retired dialogue contract, Sound Cues or numbered marks, so the guards on them stay true', () => {
    expect(SEN_SPEAKERS_INSTRUCTIONS).not.toMatch(/dialogue|Sound Cues|\[\[n\||soundCues/);
    expect(SEN_SPEAKERS_INSTRUCTIONS).not.toMatch(/CURRENT STORY INFORMATION|MISSION REMINDER|IMMEDIATE CHAPTER REQUEST/);
  });

});
