import type { HarnessSkillManifest } from '../../../narrative/generation';
import type { ChapterWritingStyle } from '../../../narrative/readingMode';

type ActiveReadingMode = Exclude<ChapterWritingStyle, 'Standard'>;

/**
 * Production's Reading Mode instructions (Light-Novels
 * `src/lib/chapterWritingStyle.ts`), carried word for word. Standard has none.
 */
const READING_MODE_INSTRUCTIONS: Record<ActiveReadingMode, string> = {
  'Clear Reading':
    'Write this chapter in a clear, dyslexia-friendly prose style while preserving its maturity, detail, genre voice, pacing, and emotional depth.',
  'Easy Read':
    'Write this chapter in an adult Easy Read style. Preserve the complete story, characters, emotion, genre identity, and mature subject matter, but communicate everything in language that is especially direct and easy to understand.',
  'Literal Reading':
    'Write this chapter in a clear, literal prose style. Preserve its maturity, genre voice, and emotional depth, but reduce ambiguous phrasing and make actions, speakers, scene changes, and cause-and-effect relationships easy to identify.',
};

const readingModeSkill = (mode: ActiveReadingMode, id: string): HarnessSkillManifest => ({
  id,
  version: '1.0.0',
  name: `SEN ${mode}`,
  description: `Writes every chapter in ${mode} for this story's readers.`,
  slot: 'accessibility',
  applications: ['generation'],
  instructions: READING_MODE_INSTRUCTIONS[mode],
  author: 'SEIHouse',
});

/**
 * SEN's bundled Accessibility skills, one per non-Standard Reading Mode. The
 * HARNESS loads the story's mode into the managed Accessibility slot on every
 * chapter call; Standard leaves the slot empty. None is ever equipped by hand.
 */
export const SEN_READING_MODE_SKILLS: Readonly<Record<ActiveReadingMode, HarnessSkillManifest>> = {
  'Clear Reading': readingModeSkill('Clear Reading', 'seihouse.sen-reading-mode.clear-reading'),
  'Easy Read': readingModeSkill('Easy Read', 'seihouse.sen-reading-mode.easy-read'),
  'Literal Reading': readingModeSkill('Literal Reading', 'seihouse.sen-reading-mode.literal-reading'),
};
