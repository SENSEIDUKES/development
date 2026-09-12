import { describe, expect, it } from 'vitest';
import { createHarnessStory } from './foundation';
import { defaultHarnessRuntime } from './ids';
import { createEmptyHarnessWorkspaceState } from './repository';
import {
  createHarnessSkillCatalog,
  freezeHarnessSkillLoadout,
  validateHarnessSkillManifest,
} from './skills';
import type { HarnessSkillManifest } from './types';

const pacingSkill = (): HarnessSkillManifest => ({
  id: 'seihouse.long-range-pacing',
  version: '1.0.0',
  name: 'Long-Range Pacing',
  description: 'Spaces major story events across chapters.',
  slot: 'pacing',
  applications: ['generation'],
  instructions: 'Earn major events across multiple chapters.',
});

describe('Harness installed skills', () => {
  it('requires generation skills to carry actual instructions', () => {
    expect(() => validateHarnessSkillManifest({ ...pacingSkill(), instructions: ' ' }))
      .toThrow('must include model instructions');
  });

  it('rejects unsupported application identifiers instead of treating them as a harmless runtime skill', () => {
    expect(() => validateHarnessSkillManifest({
      ...pacingSkill(),
      applications: ['generation '] as unknown as HarnessSkillManifest['applications'],
      instructions: undefined,
    })).toThrow('unsupported application');
  });

  it('freezes exact equipped versions in stable slot order', () => {
    const skill = pacingSkill();
    const catalog = createHarnessSkillCatalog([skill]);
    const { story } = createHarnessStory(createEmptyHarnessWorkspaceState(), { premise: 'A patient rebellion begins.' }, defaultHarnessRuntime);
    story.skillLoadout = { pacing: { id: skill.id, version: skill.version } };
    const snapshot = freezeHarnessSkillLoadout(story, catalog, '2026-09-12T12:00:00.000Z');

    skill.instructions = 'Mutated outside the Harness.';
    expect(snapshot).toMatchObject({
      capturedAt: '2026-09-12T12:00:00.000Z',
      skills: [{ id: 'seihouse.long-range-pacing', version: '1.0.0', slot: 'pacing', instructions: 'Earn major events across multiple chapters.' }],
    });
  });

  it('refuses to silently drop a referenced skill that is no longer installed', () => {
    const { story } = createHarnessStory(createEmptyHarnessWorkspaceState(), { premise: 'A patient rebellion begins.' }, defaultHarnessRuntime);
    story.skillLoadout = { media: { id: 'seihouse.soundscape', version: '2.0.0' } };
    expect(() => freezeHarnessSkillLoadout(story, createHarnessSkillCatalog([]), '2026-09-12T12:00:00.000Z'))
      .toThrow('is equipped but is not installed');
  });
});
