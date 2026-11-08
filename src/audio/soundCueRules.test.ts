import { describe, expect, it } from 'vitest';
import { SOUND_CUE_RULES, soundCueWordIssue } from './soundCueRules';

const TEXT = 'Lin Wei drew his sword, planted his feet, and met the lunge with a ringing strike.';
const at = (phrase: string) => [TEXT.indexOf(phrase), TEXT.indexOf(phrase) + phrase.length] as const;

describe('Sound Cue rules', () => {
  it('are one to twelve whole words, at most ten a chapter', () => {
    expect(SOUND_CUE_RULES).toEqual({ maxWords: 12, maxPerChapter: 10 });
  });

  it('accept whole words and name what is wrong with anything else', () => {
    expect(soundCueWordIssue(TEXT, ...at('drew his sword'))).toBeUndefined();
    expect(soundCueWordIssue(TEXT, ...at('strike'))).toBeUndefined();
    expect(soundCueWordIssue(TEXT, ...at('ringing str'))).toBe('partial-word');
    expect(soundCueWordIssue(TEXT, ...at('sword,'))).toBe('partial-word');
    expect(soundCueWordIssue(TEXT, ...at(' feet'))).toBe('partial-word');
    // Twelve words hold a cue; thirteen do not.
    expect(soundCueWordIssue(TEXT, ...at('Lin Wei drew his sword, planted his feet, and met the lunge'))).toBeUndefined();
    expect(soundCueWordIssue(TEXT, ...at('Lin Wei drew his sword, planted his feet, and met the lunge with'))).toBe('too-many-words');
    expect(soundCueWordIssue(TEXT, ...at(', '))).toBe('no-words');
  });
});
