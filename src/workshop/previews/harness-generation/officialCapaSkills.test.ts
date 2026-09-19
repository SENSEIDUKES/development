import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController, harnessSkillKey } from '@seihouse/sen/harness-generation';
import type { HarnessGenerationRequest, HarnessGenerationResponse } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import {
  installOfficialCapaSkills,
  OFFICIAL_CAPA_PACKAGES,
  OFFICIAL_STYLE_REFERENCES,
  type OfficialCapaArchiveLoader,
} from './officialCapaSkills';
import { createOfficialCapaDefaultLoadout } from './storySeedHandoff';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const loadFixture: OfficialCapaArchiveLoader = definition => readFile(
  new URL(`./official-capa/${definition.archiveFile}`, import.meta.url),
);

const adapter = (requests: HarnessGenerationRequest[] = []) => ({
  getServerInfo: async () => ({ provider: 'fixture', configured: true, models: [], defaultModel: 'fixture-model' }),
  arcOperation: async () => ({
    rawProviderResponse: JSON.stringify({
      plan: { arcNumber: 1, goals: [{ id: 'opening', text: 'Enter the mountain school.', chapters: 100 }] },
      destinedEnding: 'Enter the mountain school.',
    }),
    providerReceipt: { provider: 'fixture', model: 'fixture-model', generatedAt: '2026-09-19T12:00:00.000Z', usage: { source: 'unavailable' as const } },
  }),
  generate: async (request: HarnessGenerationRequest): Promise<HarnessGenerationResponse> => {
    requests.push(structuredClone(request));
    return {
      rawProviderResponse: JSON.stringify({ prose: 'The courier waits beneath the rain-dark gate.' }),
      providerReceipt: { provider: 'fixture', model: request.model, generatedAt: '2026-09-19T12:00:00.000Z', usage: { source: 'unavailable' } },
    };
  },
});

describe('official CAPA SPP defaults', () => {
  it('validates and installs every supplied package once, preserving exact provenance on reload', async () => {
    const storage = new MemoryStorage();
    const first = await installOfficialCapaSkills(storage, loadFixture);
    const second = await installOfficialCapaSkills(storage, loadFixture);

    expect(first.official).toHaveLength(6);
    expect(second.installed).toHaveLength(6);
    expect(new Set(second.installed.map(harnessSkillKey)).size).toBe(6);
    expect(second.installed).toEqual(first.installed);
    for (const definition of OFFICIAL_CAPA_PACKAGES) {
      const skill = second.installed.find(candidate => candidate.source?.path === definition.instructionPath)!;
      expect(skill.slot).toBe(definition.slot);
      expect(skill.version).toBe(definition.packageVersion);
      expect(skill.source).toEqual({
        packageId: definition.packageId,
        packageVersion: definition.packageVersion,
        path: definition.instructionPath,
        sha256: definition.resources[1].sha256,
        archiveSha256: definition.archiveSha256,
        resources: definition.resources,
      });
      expect(skill.instructions?.trim().length).toBeGreaterThan(0);
    }
  });

  it('reports missing or altered official packages instead of inventing replacements', async () => {
    const missing = vi.fn<OfficialCapaArchiveLoader>(async definition => {
      if (definition.key === 'continuity') throw new Error('fixture missing');
      return loadFixture(definition);
    });
    await expect(installOfficialCapaSkills(new MemoryStorage(), missing)).rejects.toThrow('fixture missing');

    const altered: OfficialCapaArchiveLoader = async definition => {
      const bytes = await loadFixture(definition);
      if (definition.key !== 'author') return bytes;
      const changed = new Uint8Array(bytes);
      changed[changed.length - 1] ^= 1;
      return changed;
    };
    await expect(installOfficialCapaSkills(new MemoryStorage(), altered)).rejects.toThrow('archive digest');
  });

  it('maps only supplied defaults and each Story Style through explicit package identity', () => {
    for (const style of ['chinese', 'japanese', 'korean'] as const) {
      const loadout = createOfficialCapaDefaultLoadout(style);
      expect(loadout.style).toEqual(OFFICIAL_STYLE_REFERENCES[style]);
      expect(loadout.author).toBeDefined();
      expect(loadout.pacing).toBeDefined();
      expect(loadout.continuity).toBeDefined();
      expect(loadout.accessibility).toBeUndefined();
      expect(loadout.translation).toBeUndefined();
    }
    expect(OFFICIAL_CAPA_PACKAGES.every(definition => definition.slot !== 'accessibility' && definition.slot !== 'translation')).toBe(true);
  });

  it('persists a story loadout, preserves a manual replacement on reload, and freezes exact versions in CAPA order', async () => {
    const { installed } = await installOfficialCapaSkills(new MemoryStorage(), loadFixture);
    const repository = new InMemoryHarnessGenerationRepository();
    const requests: HarnessGenerationRequest[] = [];
    const controller = new HarnessGenerationController({ repository, modelAdapter: adapter(requests), installedSkills: installed });
    await controller.hydrate();
    const story = await controller.createStory({
      premise: 'A courier reaches a sealed mountain gate.',
      initialArcPlan: { arcNumber: 1, goals: [{ id: 'opening', text: 'Enter the mountain school.', chapters: 100 }] },
    }, 'en', createOfficialCapaDefaultLoadout('chinese'));

    await controller.setSkillSlot(story.id, 'style', OFFICIAL_STYLE_REFERENCES.japanese);
    const reloaded = new HarnessGenerationController({ repository, modelAdapter: adapter(requests), installedSkills: installed });
    await reloaded.hydrate();
    expect(reloaded.snapshot().stories[0].skillLoadout?.style).toEqual(OFFICIAL_STYLE_REFERENCES.japanese);

    await reloaded.generateNextChapter(story.id, 'fixture-model');
    expect(requests).toHaveLength(1);
    expect(requests[0].capaPrompt.skills.map(skill => [skill.slot, skill.id, skill.version])).toEqual([
      ['author', createOfficialCapaDefaultLoadout('chinese').author!.id, '1.0.1'],
      ['pacing', createOfficialCapaDefaultLoadout('chinese').pacing!.id, '1.0.1'],
      ['continuity', createOfficialCapaDefaultLoadout('chinese').continuity!.id, '1.0.1'],
      ['style', OFFICIAL_STYLE_REFERENCES.japanese.id, '1.0.0'],
    ]);
    expect(requests[0].capaPrompt.skills.every(skill => skill.source?.archiveSha256)).toBe(true);
    expect(reloaded.snapshot().attempts[0].capaPrompt).toEqual(requests[0].capaPrompt);
  });
});
