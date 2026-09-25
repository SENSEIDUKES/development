import { describe, expect, it } from 'vitest';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { createHarnessStory } from './foundation';
import { defaultHarnessRuntime } from './ids';
import { createEmptyHarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { CAPA_SCHEMA, HARNESS_OFFICIAL_OUTPUT_REQUIREMENTS, assembleCapaPrompt, createHarnessSkillCatalog, freezeHarnessSkillLoadout, validateHarnessSkillManifest } from '@seihouse/sen/harness-generation';
import { type HarnessSkillManifest, type HarnessSkillSlotId } from '@seihouse/sen/harness-generation';
import { SEN_FATE_SURVIVAL_SKILL, SEN_NOVEL_AUTHOR_SKILL, includeBundledHarnessSkills } from '@seihouse/sen/harness-generation';
import { SEN_LIGHT_NOVEL_AUTHOR_INSTRUCTIONS } from '../../../lib/senLightNovelAuthorInstructions';

const pacingSkill = (): HarnessSkillManifest => ({
  id: 'seihouse.long-range-pacing',
  version: '1.0.0',
  name: 'Long-Range Pacing',
  description: 'Spaces major story events across chapters.',
  slot: 'pacing',
  applications: ['generation'],
  instructions: 'Earn major events across multiple chapters.',
});

const generationSkill = (
  slot: Exclude<HarnessSkillSlotId, 'author' | 'pacing' | 'translation'>,
  instructions: string,
): HarnessSkillManifest => ({
  id: `seihouse.${slot}`,
  version: '1.0.0',
  name: `${slot[0].toUpperCase()}${slot.slice(1)}`,
  description: `${slot} instructions.`,
  slot,
  applications: ['generation'],
  instructions,
});

const translationSkill = (): HarnessSkillManifest => ({
  id: 'seihouse.translation.en',
  version: '1.0.0',
  name: 'English Translation',
  description: 'English language instructions.',
  slot: 'translation',
  applications: ['generation', 'reader'],
  instructions: 'Keep reader-facing text in clear English.',
  translation: { targetLanguage: 'en' },
});

const rejectedMediaSkill = () => ({
  id: 'seihouse.media',
  version: '1.0.0',
  name: 'Media Instructions',
  description: 'Must never enter CAPA.',
  slot: 'media',
  applications: ['generation'],
  instructions: 'Use the secret asset catalog and track list.',
}) as unknown as HarnessSkillManifest;

describe('Harness installed skills', () => {
  it('uses the source SEN author direction as a visible, replaceable skill', () => {
    expect(SEN_NOVEL_AUTHOR_SKILL).toMatchObject({
      slot: 'author',
      applications: ['generation'],
      instructions: SEN_LIGHT_NOVEL_AUTHOR_INSTRUCTIONS,
    });
  });

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
    const catalog = createHarnessSkillCatalog([SEN_NOVEL_AUTHOR_SKILL, skill]);
    const { story } = createHarnessStory(createEmptyHarnessWorkspaceState(), { premise: 'A patient rebellion begins.' }, 'en', defaultHarnessRuntime);
    story.skillLoadout = {
      author: { id: SEN_NOVEL_AUTHOR_SKILL.id, version: SEN_NOVEL_AUTHOR_SKILL.version },
      pacing: { id: skill.id, version: skill.version },
    };
    const snapshot = freezeHarnessSkillLoadout(story, catalog, '2026-09-12T12:00:00.000Z');

    skill.instructions = 'Mutated outside the Harness.';
    expect(snapshot).toMatchObject({
      capturedAt: '2026-09-12T12:00:00.000Z',
      skills: [
        { id: 'seihouse.sen-novel-author', version: '1.0.0', slot: 'author' },
        { id: 'seihouse.long-range-pacing', version: '1.0.0', slot: 'pacing', instructions: 'Earn major events across multiple chapters.' },
      ],
    });
  });

  it('requires an Author skill before a generation request can be frozen', () => {
    const { story } = createHarnessStory(createEmptyHarnessWorkspaceState(), { premise: 'A patient rebellion begins.' }, 'en', defaultHarnessRuntime);
    expect(() => freezeHarnessSkillLoadout(story, createHarnessSkillCatalog([]), '2026-09-12T12:00:00.000Z'))
      .toThrow('Author skill');
  });

  it('refuses to silently drop a referenced skill that is no longer installed', () => {
    const { story } = createHarnessStory(createEmptyHarnessWorkspaceState(), { premise: 'A patient rebellion begins.' }, 'en', defaultHarnessRuntime);
    story.skillLoadout = { continuity: { id: 'seihouse.continuity', version: '2.0.0' } };
    expect(() => freezeHarnessSkillLoadout(story, createHarnessSkillCatalog([]), '2026-09-12T12:00:00.000Z'))
      .toThrow('is equipped but is not installed');
  });

  it('defines the ordered CAPA writing slots and keeps Accessibility, Translation, and the official requirements intact', () => {
    const capa = assembleCapaPrompt({
      capturedAt: '2026-09-13T00:00:00.000Z',
      skills: [
        translationSkill(),
        generationSkill('accessibility', 'Use readable paragraph boundaries.'),
        generationSkill('style', 'Use short sentences.'),
        generationSkill('continuity', 'Preserve established canon.'),
        SEN_FATE_SURVIVAL_SKILL,
        pacingSkill(),
        SEN_NOVEL_AUTHOR_SKILL,
      ],
    });
    expect(CAPA_SCHEMA.map(slot => slot.id)).toEqual([
      'author', 'pacing', 'fate', 'continuity', 'style', 'accessibility', 'translation',
    ]);
    // Only the Fate slot is filled by the HARNESS; every other slot is equipped by hand.
    expect(CAPA_SCHEMA.filter(slot => slot.managedBy).map(slot => slot.id)).toEqual(['fate']);
    expect(capa.skills.map(skill => skill.slot)).toEqual([
      'author', 'pacing', 'fate', 'continuity', 'style', 'accessibility', 'translation',
    ]);
    expect(capa.skills.map(skill => skill.authoring)).toEqual([true, true, true, true, true, true, true]);
    const headers = capa.text.match(/^CAPA SKILL \[[^\]]+\]/gm);
    expect(headers).toEqual([
      'CAPA SKILL [Author]',
      'CAPA SKILL [Pacing]',
      'CAPA SKILL [Fate]',
      'CAPA SKILL [Continuity]',
      'CAPA SKILL [Style]',
      'CAPA SKILL [Accessibility]',
      'CAPA SKILL [Translation]',
    ]);
    expect(capa.text.split(SEN_LIGHT_NOVEL_AUTHOR_INSTRUCTIONS.trim())).toHaveLength(2);
    expect(capa.text).toContain('Use readable paragraph boundaries.');
    expect(capa.text).toContain('Keep reader-facing text in clear English.');
    expect(capa.text).not.toContain('secret asset catalog');
    expect(capa.text.endsWith(HARNESS_OFFICIAL_OUTPUT_REQUIREMENTS)).toBe(true);
    expect(capa.text.split('HARNESS OFFICIAL OUTPUT REQUIREMENTS')).toHaveLength(2);
    expect(capa.text.indexOf('CAPA SKILL [Translation]')).toBeLessThan(capa.text.indexOf('HARNESS OFFICIAL OUTPUT REQUIREMENTS'));
    expect(capa.skills).toHaveLength(7);
    expect(capa.estimatedTokens).toBeGreaterThan(0);
  });

  it('loads SEN Fate Survival into the Fate slot on every Fate Survival freeze, and never in Regular Reader mode', () => {
    const catalog = createHarnessSkillCatalog(includeBundledHarnessSkills([]));
    const { story } = createHarnessStory(createEmptyHarnessWorkspaceState(), { premise: 'A patient rebellion begins.' }, 'en', defaultHarnessRuntime);
    story.skillLoadout = { author: { id: SEN_NOVEL_AUTHOR_SKILL.id, version: SEN_NOVEL_AUTHOR_SKILL.version } };
    const slots = (mode?: 'regular' | 'survival') => freezeHarnessSkillLoadout(story, catalog, 'now', mode).skills.map(skill => skill.id);
    expect(slots()).toEqual(['seihouse.sen-novel-author']);
    expect(slots('regular')).toEqual(['seihouse.sen-novel-author']);
    expect(slots('survival')).toEqual(['seihouse.sen-novel-author', 'seihouse.sen-fate-survival']);
    // The slot follows the mode, whatever the story's loadout says.
    story.skillLoadout = { ...story.skillLoadout, fate: { id: 'someone.else', version: '1.0.0' } };
    expect(slots('regular')).toEqual(['seihouse.sen-novel-author']);
    expect(slots('survival')).toEqual(['seihouse.sen-novel-author', 'seihouse.sen-fate-survival']);
    const capa = assembleCapaPrompt(freezeHarnessSkillLoadout(story, catalog, 'now', 'survival'));
    expect(capa.text).toContain(`CAPA SKILL [Fate] — SEN Fate Survival v${SEN_FATE_SURVIVAL_SKILL.version}`);
    expect(capa.text).toContain('bring the story to a believable, final ending in this chapter');
    // A host without the bundled skill cannot write a Fate Survival chapter.
    expect(() => freezeHarnessSkillLoadout(story, createHarnessSkillCatalog([SEN_NOVEL_AUTHOR_SKILL]), 'now', 'survival'))
      .toThrow('Fate Survival skill is not installed');
  });

  it('never equips the Fate slot by hand', async () => {
    const controller = new HarnessGenerationController({
      repository: new InMemoryHarnessGenerationRepository(),
      modelAdapter: {
        getServerInfo: async () => ({ provider: 'gemini', configured: false, models: [], defaultModel: 'fixture' }),
        generate: async () => { throw new Error('not used'); },
      },
    });
    await controller.hydrate();
    const fate = { id: SEN_FATE_SURVIVAL_SKILL.id, version: SEN_FATE_SURVIVAL_SKILL.version };
    const story = await controller.createStory({ premise: 'A patient rebellion begins.' });
    await expect(controller.setSkillSlot(story.id, 'fate', fate)).rejects.toThrow('follows the story\'s Fate mode');
    await expect(controller.createStory({ premise: 'Another rebellion.' }, 'en', {
      author: { id: SEN_NOVEL_AUTHOR_SKILL.id, version: SEN_NOVEL_AUTHOR_SKILL.version }, fate,
    })).rejects.toThrow('follows the story\'s Fate mode');
  });

  it('rejects Media at installation, application, assembly, freeze, and equip boundaries', async () => {
    const media = rejectedMediaSkill();
    expect(() => validateHarnessSkillManifest(media)).toThrow('unsupported slot');
    expect(() => createHarnessSkillCatalog([media])).toThrow('unsupported slot');
    expect(() => validateHarnessSkillManifest({
      ...pacingSkill(),
      applications: ['media-runtime'] as unknown as HarnessSkillManifest['applications'],
    })).toThrow('unsupported application');
    expect(() => assembleCapaPrompt({
      capturedAt: 'now',
      skills: [SEN_NOVEL_AUTHOR_SKILL, media],
    })).toThrow('not a supported CAPA skill slot');

    const created = createHarnessStory(
      createEmptyHarnessWorkspaceState(),
      { premise: 'A patient rebellion begins.' },
      'en',
      defaultHarnessRuntime,
    );
    created.story.skillLoadout = {
      author: { id: SEN_NOVEL_AUTHOR_SKILL.id, version: SEN_NOVEL_AUTHOR_SKILL.version },
      media: { id: media.id, version: media.version },
    } as unknown as typeof created.story.skillLoadout;
    expect(() => freezeHarnessSkillLoadout(
      created.story,
      createHarnessSkillCatalog([SEN_NOVEL_AUTHOR_SKILL]),
      '2026-09-16T00:00:00.000Z',
    )).toThrow('not a supported CAPA skill slot');

    const controller = new HarnessGenerationController({
      repository: new InMemoryHarnessGenerationRepository(),
      modelAdapter: {
        getServerInfo: async () => ({ provider: 'gemini', configured: false, models: [], defaultModel: 'fixture' }),
        generate: async () => { throw new Error('not used'); },
      },
    });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'A patient rebellion begins.' });
    await expect(controller.setSkillSlot(
      story.id,
      'media' as HarnessSkillSlotId,
      { id: media.id, version: media.version },
    )).rejects.toThrow('not a supported CAPA skill slot');
  });

  it('refuses to assemble a CAPA Prompt without an Author skill or beyond the CAPA budget', () => {
    expect(() => assembleCapaPrompt({ capturedAt: 'now', skills: [pacingSkill()] })).toThrow('Author skill');
    const long = { ...pacingSkill(), instructions: 'x'.repeat(16_000) };
    expect(() => assembleCapaPrompt({ capturedAt: 'now', skills: [SEN_NOVEL_AUTHOR_SKILL, long, { ...long, id: 'b', slot: 'style' }] })).toThrow('CAPA Prompt budget');
  });
});
