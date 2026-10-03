import { describe, expect, it } from 'vitest';
import { chapterPointOfView, storyPointOfView } from './pointOfView';
import type { ProtagonistNames } from './speakers';

const grit: ProtagonistNames = { names: ['Grit'], others: ['Krag', 'Slink', 'Vex'] };
const repeat = (paragraph: string, times: number) => Array.from({ length: times }, () => paragraph);

/** The opening the owner's Goblin story was written in: Grit by name, never "I". */
const thirdPerson = repeat('Grit marked the gutter’s flow on the slate. Krag waited while Grit measured the bend.', 6);
/** The switch that story's Chapter 2 made: the same narration as "I". */
const firstPerson = repeat('I marked the gutter’s flow on the slate. Krag glanced at the stone in my hand while I measured the bend.', 5);

describe('The story\'s point of view', () => {
  it('reads third person from narration that names the main character, and first person from narration that says I', () => {
    expect(chapterPointOfView(thirdPerson, grit)).toBe('third-person');
    expect(chapterPointOfView(firstPerson, grit)).toBe('first-person');
  });

  it('leaves spoken lines out: a third-person chapter whose characters say "I" stays third person', () => {
    const talkative = repeat('“I will hold it, and my crew with me,” Grit said. Grit set the stone down.', 6);
    expect(chapterPointOfView(talkative, grit)).toBe('third-person');
  });

  it('reads nothing when neither side is clearly ahead, or there is too little to tell', () => {
    // Third person with the main character's thoughts written as "I": too close to call, so the Style decides.
    const mixed = repeat('Grit studied the floor. I have not measured those exits, Grit thought, and I will.', 4);
    expect(chapterPointOfView(mixed, grit)).toBeUndefined();
    expect(chapterPointOfView(['Grit nodded. Grit waited.'], grit)).toBeUndefined();
    // Without a main character there is no name to count, so third person is never read.
    expect(chapterPointOfView(thirdPerson, { names: [], others: [] })).toBeUndefined();
  });

  it('counts a full name once, and never a name part someone else shares', () => {
    const jiuyan: ProtagonistNames = { names: ['Shen Jiuyan'], others: ['Shen Wei'] };
    // Four mentions of the full name are four, not eight: too few to decide.
    expect(chapterPointOfView(repeat('Shen Jiuyan studied the brace.', 4), jiuyan)).toBeUndefined();
    expect(chapterPointOfView(repeat('Shen Jiuyan studied the brace.', 8), jiuyan)).toBe('third-person');
    // "Shen" alone is the family name both carry: it is not the main character.
    expect(chapterPointOfView(repeat('Shen studied the brace.', 10), jiuyan)).toBeUndefined();
    expect(chapterPointOfView(repeat('Jiuyan studied the brace. Jiuyan’s hand was steady.', 4), jiuyan)).toBe('third-person');
  });

  it('is the point of view the story opened in: a later chapter that switched never changes it', () => {
    const chapters = [
      { chapterNumber: 2, paragraphs: firstPerson },
      { chapterNumber: 1, paragraphs: thirdPerson },
      { chapterNumber: 3, paragraphs: ['Grit lost the slate.'] },
    ];
    expect(storyPointOfView(chapters, grit, 'en')).toBe('third-person');
  });

  it('takes the earliest chapter that shows one clearly, and reads English stories only', () => {
    const chapters = [{ chapterNumber: 1, paragraphs: ['Grit woke.'] }, { chapterNumber: 2, paragraphs: firstPerson }];
    expect(storyPointOfView(chapters, grit, 'en')).toBe('first-person');
    expect(storyPointOfView([], grit, 'en')).toBeUndefined();
    expect(storyPointOfView(chapters, grit, 'es')).toBeUndefined();
  });
});
