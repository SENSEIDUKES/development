import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createPack } from 'seihouse-productions-package';
import { HarnessGenerationController } from '../../../components/harness-generation/shared/controller';
import { InMemoryHarnessGenerationRepository } from '../../../components/harness-generation/shared/repository';
import type { HarnessGenerationResponse } from '../../../components/harness-generation/shared/types';
import { handleHarnessGenerationHttp } from '../../../server/harness-generation/http';
import { createHarnessSppSkill, inspectHarnessSpp, loadHarnessSppSkills, readHarnessSppText, saveHarnessSppSkill, SPP_SKILL_STORAGE_KEY } from './sppSkills';

const authorBytes = () => new Uint8Array(readFileSync(new URL('./fixtures/SEN-AUTHOR.spp', import.meta.url)));
const storage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
};

const rejectedStaleMediaSkill = {
  id: 'spp:stale:media',
  version: '1.0.0',
  name: 'Stale Media',
  description: 'Old local data.',
  slot: 'media',
  applications: ['generation'],
  instructions: 'Old instructions.',
};

describe('SPP intake through Harness skills', () => {
  it('ignores the stale pre-separation inventory instead of migrating Media-era saved skills', () => {
    const stale = {
      getItem: (key: string) => key === 'seihouse.harness.imported-skills.v2'
        ? JSON.stringify([rejectedStaleMediaSkill])
        : null,
    };
    expect(SPP_SKILL_STORAGE_KEY).toBe('seihouse.harness.imported-skills.v3');
    expect(loadHarnessSppSkills(stale)).toEqual([]);
  });

  it('passes the real author package through saved inventory, story slot, HTTP request and provider prompt into a committed chapter', async () => {
    const content = await inspectHarnessSpp(authorBytes());
    const path = content.manifest.files[0].path;
    const text = readHarnessSppText(content, path);
    const skill = createHarnessSppSkill(content, path, 'author');
    const saved = storage();
    saveHarnessSppSkill(saved, [], skill);
    const repository = new InMemoryHarnessGenerationRepository();
    let calls = 0;
    const controller = new HarnessGenerationController({ repository, installedSkills: loadHarnessSppSkills(saved), modelAdapter: {
      getServerInfo: async () => { throw new Error('Not used'); },
      arcOperation: async request => ({ rawProviderResponse: JSON.stringify({ plan: { arcNumber: Math.floor((request.storyInformation.chapterNumber - 1) / 100) + 1, goals: [{ id: `arc-${request.storyInformation.chapterNumber}-goal`, text: 'Carry the story through its opening arc.', chapters: 100 }] }, destinedEnding: 'Bring the story to its true conclusion.' }), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: new Date().toISOString(), usage: { source: 'unavailable' } } }),
      generate: async request => {
        const response = await handleHarnessGenerationHttp({ method: 'POST', body: JSON.stringify(request) }, {
          environment: { GEMINI_API_KEY: 'fixture-key' },
          providerFactory: () => ({ provider: 'gemini', model: request.model, generate: async prompt => {
            calls++;
            expect(prompt.systemInstruction).toContain(text.trim());
            expect(prompt.userPrompt).not.toContain(text.trim());
            expect(request.capaPrompt.skills[0].source).toMatchObject({ packageId: content.manifest.id, path });
            expect(JSON.stringify(request.storyInformation)).not.toContain(content.manifest.id);
            return { rawProviderResponse: JSON.stringify({ prose: 'The courier caught the falling jade token before it struck the rain-soaked steps.' }),
              providerReceipt: { provider: 'gemini', model: request.model, generatedAt: new Date().toISOString(), durationMs: 1, usage: { source: 'unavailable' } } };
          } }),
        });
        expect(response.status).toBe(200);
        return response.body as HarnessGenerationResponse;
      },
    } });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'A courier arrives at a mountain school with a damaged invitation.' });
    await controller.setSkillSlot(story.id, 'author', skill);
    await controller.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');
    expect(calls).toBe(1);
    expect(repository.snapshot().chapters).toHaveLength(1);
    expect(repository.snapshot().attempts[0].capaPrompt.skills[0].source).toEqual(skill.source);
  });

  it('handles a generic author-instructions path without package-name or package-type behavior', async () => {
    const input = await createPack({ name: 'Different package', description: 'Generic test', files: [
      { path: 'assets/author-instructions.md', data: new TextEncoder().encode('Use short sentences.') },
      { path: 'assets/image.bin', data: new Uint8Array([0, 255]) },
    ] });
    const content = await inspectHarnessSpp(new Blob([new Uint8Array(input)]));
    expect(createHarnessSppSkill(content, 'assets/author-instructions.md', 'accessibility')).toMatchObject({ slot: 'accessibility', instructions: 'Use short sentences.' });
    expect(() => createHarnessSppSkill(
      content,
      'assets/author-instructions.md',
      'media' as Parameters<typeof createHarnessSppSkill>[2],
    )).toThrow('unsupported slot');
    expect(() => readHarnessSppText(content, 'assets/image.bin')).toThrow('Only plain text');
    expect(() => readHarnessSppText(content, 'missing.md')).toThrow('Select a file');
  });

  it('blocks corrupt packages before instruction access', async () => {
    const input = authorBytes();
    input[0] = 0;
    await expect(inspectHarnessSpp(input)).rejects.toThrow();
    await expect(inspectHarnessSpp(new Uint8Array(8 * 1024 * 1024 + 1))).rejects.toThrow('archive size limit');
  });

  it('rejects malformed UTF-8, empty instructions and oversized text without truncation', async () => {
    for (const data of [new Uint8Array([255]), new TextEncoder().encode('  '), new TextEncoder().encode('x'.repeat(16_001))]) {
      const content = await inspectHarnessSpp(await createPack({ name: 'Text test', description: 'Limits', files: [{ path: 'assets/text.md', data }] }));
      expect(() => createHarnessSppSkill(content, 'assets/text.md', 'style')).toThrow();
    }
  });

  it('keeps repeated installs idempotent, rejects changed versions and reports storage failures', async () => {
    const content = await inspectHarnessSpp(authorBytes());
    const skill = createHarnessSppSkill(content, content.manifest.files[0].path, 'style');
    const saved = storage();
    const first = saveHarnessSppSkill(saved, [], skill);
    expect(saveHarnessSppSkill(saved, first, skill)).toHaveLength(1);
    expect(() => saveHarnessSppSkill(saved, first, { ...skill, instructions: 'Changed' })).toThrow('different content');
    expect(() => saveHarnessSppSkill({ setItem: () => { throw new Error('Quota exceeded'); } }, [], skill)).toThrow('Quota exceeded');
  });

  it('updates a live controller inventory without losing stories and blocks excessive equipped context before a provider call', async () => {
    const content = await inspectHarnessSpp(authorBytes());
    const skill = createHarnessSppSkill(content, content.manifest.files[0].path, 'style');
    const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(), modelAdapter: {
      getServerInfo: async () => { throw new Error('Not used'); },
      arcOperation: async request => ({ rawProviderResponse: JSON.stringify({ plan: { arcNumber: Math.floor((request.storyInformation.chapterNumber - 1) / 100) + 1, goals: [{ id: `arc-${request.storyInformation.chapterNumber}-goal`, text: 'Carry the story through its opening arc.', chapters: 100 }] }, destinedEnding: 'Bring the story to its true conclusion.' }), providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: new Date().toISOString(), usage: { source: 'unavailable' } } }),
      generate: async () => { throw new Error('Provider must not be called'); },
    } });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'A courier waits.' });
    controller.setInstalledSkills([skill]);
    await controller.setSkillSlot(story.id, 'style', skill);
    expect(controller.snapshot().stories[0].id).toBe(story.id);
    const long = { ...skill, instructions: 'x'.repeat(16_000) };
    const second = { ...long, id: 'another', slot: 'pacing' as const };
    controller.setInstalledSkills([long, second]);
    await controller.setSkillSlot(story.id, 'pacing', second);
    await expect(controller.generateNextChapter(story.id, 'fixture')).rejects.toThrow('CAPA Prompt budget');
    expect(controller.snapshot().attempts).toHaveLength(0);
  });
});
