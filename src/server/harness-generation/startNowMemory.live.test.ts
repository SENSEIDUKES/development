import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { HarnessGenerationController, exportHarnessStory } from '../../components/harness-generation/shared/controller';
import { InMemoryHarnessGenerationRepository, createEmptyHarnessWorkspaceState } from '../../components/harness-generation/shared/repository';
import { buildCanonicalStoryView } from '../../components/harness-generation/shared/canonicalState';
import type { HarnessGenerationResponse, HarnessStory, HarnessWorkspaceState } from '../../components/harness-generation/shared/types';
import { handleHarnessGenerationHttp } from './http';

// Opt-in: reads an existing author export and an existing server environment.
// Never creates chapter prose, changes credentials, or writes the input export.
it.runIf(Boolean(process.env.HARNESS_MEMORY_EXPORT && process.env.HARNESS_MEMORY_ENV))('recovers Start Now memory from the real saved chapter with Gemini', async () => {
  const archive = JSON.parse(readFileSync(process.env.HARNESS_MEMORY_EXPORT!, 'utf8')) as HarnessWorkspaceState & { story: HarnessStory };
  const state = { ...createEmptyHarnessWorkspaceState(), ...archive, stories: [archive.story] };
  const repository = new InMemoryHarnessGenerationRepository(state);
  const environment = parseEnv(readFileSync(process.env.HARNESS_MEMORY_ENV!, 'utf8'));
  const controller = new HarnessGenerationController({ repository, modelAdapter: {
    getServerInfo: async () => { throw new Error('This test uses the saved model selection.'); },
    generate: async () => { throw new Error('Memory recovery must not generate chapter prose.'); },
    recoverMemory: async request => {
      let diagnostic = '';
      const result = await handleHarnessGenerationHttp({ method: 'POST', body: JSON.stringify(request) }, { environment,
        onError: error => { diagnostic = String(error).replaceAll(environment.GEMINI_API_KEY ?? 'NO_KEY', '[redacted]'); },
      });
      if (result.status !== 200) throw new Error(`Memory extraction failed: HTTP ${result.status} ${diagnostic}`);
      return result.body as HarnessGenerationResponse;
    },
  } });
  await controller.hydrate();
  const chapter = state.chapters[0];
  if (process.env.HARNESS_MEMORY_REPLAY === '1') await controller.replayStory(archive.story.id);
  else await controller.recoverChapterMemory(chapter.id, state.attempts[0].model);
  const recovered = controller.snapshot();
  const view = buildCanonicalStoryView(recovered, archive.story.id);
  const output = process.env.HARNESS_MEMORY_OUTPUT;
  if (output) {
    mkdirSync(output, { recursive: true });
    writeFileSync(join(output, 'recovered-story.json'), JSON.stringify(exportHarnessStory(recovered, archive.story.id), null, 2));
    writeFileSync(join(output, 'memory-report.json'), JSON.stringify({
      title: archive.story.title, proseUnchanged: recovered.chapters[0].prose === chapter.prose,
      originalEventCount: recovered.events.filter(event => !event.recoveryId).length,
      recoveredEventCount: recovered.events.filter(event => event.recoveryId).length,
      status: recovered.attempts[0].postCommitProcessing, records: view.records,
      receipt: recovered.memoryRecoveries?.at(-1)?.providerReceipt,
    }, null, 2));
  }
  expect(recovered.chapters[0].prose).toBe(chapter.prose);
  expect(recovered.stories[0].head).toEqual(archive.story.head);
  expect(view.characters.some(record => record.confidence === 'resolved' && record.label === 'Aria' && /AI|synthetic|System/i.test(record.evidence))).toBe(true);
  expect(view.characters.some(record => record.confidence === 'resolved' && record.label === 'Xie Jin' && /bypass|grid|reckless|arrested/i.test(record.evidence))).toBe(true);
  expect(view.timeline.some(record => record.confidence === 'resolved' && /forty-eight hours/i.test(record.evidence))).toBe(true);
  expect(view.locations.some(record => record.confidence === 'resolved' && /F-Tier|Foundation Layer Initialized/i.test(record.evidence))).toBe(true);
  expect(view.records.some(record => /0\.04%/.test(record.evidence))).toBe(true);
  expect(view.threads.length).toBeGreaterThan(0);
  for (const name of ['Aria', 'Xie Jin']) {
    expect(new Set(view.characters.filter(record => record.label === name).map(record => record.entityId)).size).toBe(1);
  }
}, 180_000);
