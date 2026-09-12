import { SEN_LIGHT_NOVEL_AUTHOR_INSTRUCTIONS } from '../../../lib/senLightNovelAuthorInstructions';
import type { HarnessSkillManifest } from './types';

/**
 * SEN's bundled author skill. It remains a normal, replaceable skill; bundling
 * only gives new and previously saved Harness stories a visible default.
 */
export const SEN_NOVEL_AUTHOR_SKILL: HarnessSkillManifest = {
  id: 'seihouse.sen-novel-author',
  version: '1.0.0',
  name: 'SEN Novel Author',
  description: 'Writes immersive, emotionally impactful light-novel chapters with genre-sensitive control over cultivation intensity.',
  slot: 'author',
  applications: ['generation'],
  instructions: SEN_LIGHT_NOVEL_AUTHOR_INSTRUCTIONS,
  author: 'SEIHouse',
};

export const includeBundledHarnessSkills = (
  installedSkills: HarnessSkillManifest[],
): HarnessSkillManifest[] => [
  SEN_NOVEL_AUTHOR_SKILL,
  ...installedSkills.filter(skill => (
    skill.id !== SEN_NOVEL_AUTHOR_SKILL.id
    || skill.version !== SEN_NOVEL_AUTHOR_SKILL.version
  )),
];
