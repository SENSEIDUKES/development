import {
  SEN_NOVEL_AUTHOR_SKILL,
  type HarnessSkillManifest,
} from '@seihouse/sen/harness-generation';

/** Workshop-only installed inventory used to inspect the real portable loadout UI. */
export const WORKSHOP_HARNESS_SKILLS: HarnessSkillManifest[] = [
  SEN_NOVEL_AUTHOR_SKILL,
  {
    id: 'workshop.long-range-pacing',
    version: '0.1.0',
    name: 'Long-Range Pacing',
    description: 'A development skill for spacing major events across chapters and earning arc payoffs gradually.',
    slot: 'pacing',
    applications: ['generation'],
    instructions: 'Treat the current arc as a runway, not a checklist. Advance one meaningful beat at a time, preserve room for reaction and consequence, and do not collapse a multi-chapter event into one chapter unless explicit author direction requires it.',
    author: 'SEIHouse Workshop',
  },
];
