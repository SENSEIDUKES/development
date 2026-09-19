import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { HarnessGenerationController } from '../../../components/harness-generation/shared/controller';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import type { HarnessGenerationResponse } from '../../../narrative/generation';
import { handleHarnessGenerationHttp } from '../../../server/harness-generation/http';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';
import { createHarnessSppSkill, inspectHarnessSpp } from './sppSkills';

// Explicit opt-in only: uses an existing server credential for two isolated chapters.
it.runIf(Boolean(process.env.HARNESS_SPP_ENV))('generates real baseline and equipped chapters through the existing Harness endpoint', async () => {
  const configured = parseEnv(readFileSync(process.env.HARNESS_SPP_ENV!, 'utf8'));
  const environment = { GEMINI_API_KEY: configured.GEMINI_API_KEY, HARNESS_GENERATION_TEMPERATURE: '0', HARNESS_GENERATION_MAX_OUTPUT_TOKENS: '8192' };
  const content = await inspectHarnessSpp(new Uint8Array(readFileSync(new URL('./fixtures/SEN-AUTHOR.spp', import.meta.url))));
  const skill = createHarnessSppSkill(content, content.manifest.files[0].path, 'author');
  for (const equipped of [false, true]) {
    const repository = new InMemoryHarnessGenerationRepository();
    const controller = new HarnessGenerationController({ repository, installedSkills: [skill], modelAdapter: {
      getServerInfo: async () => { throw new Error('Not needed'); },
      generate: async request => {
        const prompt = buildHarnessGenerationPrompt(request);
        expect(request.capaPrompt.skills.length).toBe(1);
        if (equipped) expect(request.capaPrompt.text).toContain(skill.instructions!);
        if (equipped) expect(prompt.systemInstruction).toContain(skill.instructions!);
        let diagnostic = '';
        const result = await handleHarnessGenerationHttp({ method: 'POST', body: JSON.stringify(request) }, { environment,
          onError: error => { diagnostic = String(error).replaceAll(environment.GEMINI_API_KEY ?? 'NO_KEY', '[redacted]'); },
        });
        expect(result.status, diagnostic || JSON.stringify(result.body)).toBe(200);
        const output = process.env.HARNESS_SPP_OUTPUT;
        if (output) {
          mkdirSync(output, { recursive: true });
          writeFileSync(join(output, `${equipped ? 'equipped' : 'baseline'}-request.json`), JSON.stringify({ request, prompt }, null, 2));
        }
        return result.body as HarnessGenerationResponse;
      },
    } });
    await controller.hydrate();
    const story = await controller.createStory({ title: 'The Rain Gate', premise: 'Lin, a young courier, reaches a remote mountain school during a rainstorm. Her invitation is damaged. She must persuade the gatekeeper to let her wait inside until morning.', permanentInstructions: 'Write a complete chapter of about 700 words. Keep the damaged invitation unresolved at the end; Lin may obtain shelter but no breakthrough, combat, or major revelation occurs.' });
    if (equipped) await controller.setSkillSlot(story.id, 'author', skill);
    await controller.generateNextChapter(story.id, 'google/gemini-3.1-flash-lite');
    const state = repository.snapshot();
    expect(state.chapters, JSON.stringify(state.attempts[0].failure)).toHaveLength(1);
    expect(state.attempts[0].stage).toBe('committed');
    if (process.env.HARNESS_SPP_OUTPUT) writeFileSync(join(process.env.HARNESS_SPP_OUTPUT, `${equipped ? 'equipped' : 'baseline'}-story.json`), JSON.stringify(state, null, 2));
  }
}, 300_000);
