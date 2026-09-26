import { SEN_LIGHT_NOVEL_AUTHOR_INSTRUCTIONS } from '../../../lib/senLightNovelAuthorInstructions';
import type { HarnessSkillManifest } from '../../../narrative/generation';
import { SEN_FATE_SURVIVAL_SKILL } from './fateSurvivalSkill';
import { SEN_READING_MODE_SKILLS } from './readingModeSkills';

/**
 * SEN's bundled author skill. It remains a normal, replaceable skill; bundling
 * only gives new and previously saved Harness stories a visible default.
 */
export const SEN_NOVEL_AUTHOR_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-novel-author',
  version: '1.0.0',
  name: 'SEN Novel Author',
  description: 'Writes engaging, immersive chapters in the tradition of Asian serialized web novels.',
  slot: 'author',
  applications: ['generation'],
  instructions: SEN_LIGHT_NOVEL_AUTHOR_INSTRUCTIONS,
  author: 'SEIHouse',
};

const BUNDLED_HARNESS_SKILLS = [SEN_NOVEL_AUTHOR_SKILL, SEN_FATE_SURVIVAL_SKILL, ...Object.values(SEN_READING_MODE_SKILLS)];

/**
 * Every host catalog carries SEN's bundled skills: the default Author, the
 * Fate Survival skill, and one Accessibility skill per non-Standard Reading Mode.
 */
export const includeBundledHarnessSkills = (
  installedSkills: HarnessSkillManifest[],
): HarnessSkillManifest[] => [
  ...BUNDLED_HARNESS_SKILLS,
  ...installedSkills.filter(skill => !BUNDLED_HARNESS_SKILLS.some(bundled => bundled.id === skill.id && bundled.version === skill.version)),
];
