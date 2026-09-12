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
  {
    id: 'workshop.soundscape-contract',
    version: '0.1.0',
    name: 'Soundscape Contract Preview',
    description: 'Demonstrates how a downloaded music or sound pack occupies the Media slot without changing prose.',
    slot: 'media',
    applications: ['media-runtime', 'reader'],
    assetCount: 0,
    runtimeLabel: 'Host media runtime required',
    author: 'SEIHouse Workshop',
  },
  {
    id: 'workshop.dyslexic-readability',
    version: '0.1.0',
    name: 'Dyslexic Readability Preview',
    description: 'Demonstrates an accessibility skill that can guide prose and later reader presentation.',
    slot: 'accessibility',
    applications: ['generation', 'reader'],
    instructions: 'Favor clear sentence boundaries, concrete references, and readable paragraph lengths while preserving the author\'s voice and narrative complexity.',
    author: 'SEIHouse Workshop',
  },
];
