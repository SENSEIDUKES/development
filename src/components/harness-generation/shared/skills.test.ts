import { describe, expect, it } from 'vitest';
import { createHarnessStory } from './foundation';
import { defaultHarnessRuntime } from './ids';
import { createEmptyHarnessWorkspaceState } from './repository';
import {
  CAPA_SCHEMA,
  HARNESS_OFFICIAL_OUTPUT_REQUIREMENTS,
  assembleCapaPrompt,
  createHarnessSkillCatalog,
  freezeHarnessSkillLoadout,
  validateHarnessSkillManifest,
} from './skills';
import type { HarnessSkillManifest } from './types';
import { SEN_NOVEL_AUTHOR_SKILL } from './authorSkill';
import { SEN_LIGHT_NOVEL_AUTHOR_INSTRUCTIONS } from '../../../lib/senLightNovelAuthorInstructions';
import { CHAPTER_PROMPTS } from '../../chapter-generation/shared/lib/chapterPrompts';

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
  it('uses the source SEN author direction as a visible, replaceable skill', () => {
    expect(SEN_NOVEL_AUTHOR_SKILL).toMatchObject({
      slot: 'author',
      applications: ['generation'],
      instructions: SEN_LIGHT_NOVEL_AUTHOR_INSTRUCTIONS,
    });
    expect(CHAPTER_PROMPTS.system.startsWith(SEN_LIGHT_NOVEL_AUTHOR_INSTRUCTIONS)).toBe(true);
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
    story.skillLoadout = { media: { id: 'seihouse.soundscape', version: '2.0.0' } };
    expect(() => freezeHarnessSkillLoadout(story, createHarnessSkillCatalog([]), '2026-09-12T12:00:00.000Z'))
      .toThrow('is equipped but is not installed');
  });

  it('assembles the CAPA Prompt once, Author first, in CAPA Schema order, without non-generation skills', () => {
    const style: HarnessSkillManifest = { id: 'seihouse.style', version: '2.0.0', name: 'Terse Style', description: 'Style.', slot: 'style', applications: ['generation'], instructions: 'Short sentences.' };
    const media: HarnessSkillManifest = { id: 'seihouse.music', version: '1.0.0', name: 'Night Soundscape', description: 'Music.', slot: 'media', applications: ['media-runtime'], runtimeLabel: 'SAP' };
    const capa = assembleCapaPrompt({ capturedAt: '2026-09-13T00:00:00.000Z', skills: [media, style, pacingSkill(), SEN_NOVEL_AUTHOR_SKILL] });
    expect(capa.skills.map(skill => skill.slot)).toEqual(['author', 'pacing', 'style', 'media']);
    expect(capa.skills.map(skill => skill.authoring)).toEqual([true, true, true, false]);
    expect(CAPA_SCHEMA.map(slot => slot.id)).toEqual(['author', 'pacing', 'continuity', 'style', 'accessibility', 'translation', 'media']);
    const headers = capa.text.match(/^CAPA SKILL \[[^\]]+\]/gm);
    expect(headers).toEqual(['CAPA SKILL [Author]', 'CAPA SKILL [Pacing]', 'CAPA SKILL [Style]']);
    expect(capa.text.split(SEN_LIGHT_NOVEL_AUTHOR_INSTRUCTIONS.trim())).toHaveLength(2);
    expect(capa.text).not.toContain('Night Soundscape');
    expect(capa.text.endsWith(HARNESS_OFFICIAL_OUTPUT_REQUIREMENTS)).toBe(true);
    expect(capa.text.split('HARNESS OFFICIAL OUTPUT REQUIREMENTS')).toHaveLength(2);
    expect(capa.text.indexOf('CAPA SKILL [Style]')).toBeLessThan(capa.text.indexOf('HARNESS OFFICIAL OUTPUT REQUIREMENTS'));
    expect(capa.skills).toHaveLength(4);
    expect(capa.estimatedTokens).toBeGreaterThan(0);
  });

  it('refuses to assemble a CAPA Prompt without an Author skill or beyond the CAPA budget', () => {
    expect(() => assembleCapaPrompt({ capturedAt: 'now', skills: [pacingSkill()] })).toThrow('Author skill');
    const long = { ...pacingSkill(), instructions: 'x'.repeat(16_000) };
    expect(() => assembleCapaPrompt({ capturedAt: 'now', skills: [SEN_NOVEL_AUTHOR_SKILL, long, { ...long, id: 'b', slot: 'style' }] })).toThrow('CAPA Prompt budget');
  });
});
