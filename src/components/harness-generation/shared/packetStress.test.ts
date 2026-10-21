import { seedLegacyChapterEvents } from '../../../test-utils/seedLegacyChapterEvents';
import { describe, expect, it } from 'vitest';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapter } from '../../../test-utils/writtenChapter';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';
import { GENERATION_PACKET_BUDGET } from '@seihouse/sen/harness-generation';
import type { HarnessChapterPlanRequest, HarnessGenerationModelAdapter, HarnessGenerationRequest, HarnessGenerationResponse } from '@seihouse/sen/harness-generation';
import { planEveryChapter } from '../../../test-utils/chapterPlan';
import { buildChapterPlannerPrompt } from '../../../server/harness-generation/chapterPlanner';

// FIXTURE-START
const receipt = { provider: 'fixture', model: 'fixture', generatedAt: '2026-09-20T12:00:00.000Z', usage: { source: 'unavailable' as const } };
const response = (body: unknown): HarnessGenerationResponse => ({ rawProviderResponse: JSON.stringify(body), providerReceipt: receipt });
const FUNCTIONS = ['progression', 'worldBuilding', 'conflict'] as const;

/** A 50-chapter story whose memory keeps adding places, relics, and updated balances. */
const stressChapter = (n: number) => {
  const paragraphs = [
    `Yi Chen advanced to Realm ${n} at the Azure Sect, carrying ${100 + n * 10} qi in his dantian while the mountain wind cut across the training terraces and the disciples of the outer court watched him climb.`,
    `They reached Location ${n}, a ruin of black stone where the sect once buried its failures, and Elder Mu spoke of the founder's oath while the mist gathered along the broken stairs.`,
    n % 5 === 0 ? `Yi Chen claimed Relic ${n}, a jade seal holding ${n} charges, and the Azure Sect's standing rose to Standing ${n} across the seven peaks.` : `The Azure Sect's standing rose to Standing ${n} across the seven peaks as rival sects sent envoys to test the new disciple's resolve.`,
    `Rival ${n} of the Crimson Hall arrived at dusk, a sword cultivator with a grudge against the Azure Sect, and swore to face Yi Chen at the next tournament.`,
  ];
  return {
    title: `Chapter ${n}: The ${n}th Step`,
    paragraphs,
    recap: `Recap ${n}: Yi Chen reached Realm ${n}, explored Location ${n}, and the Azure Sect stood at Standing ${n} while Elder Mu warned of rivals.`,
    chapterFunction: FUNCTIONS[n % 3],
    nextProgression: `Progression option ${n}`, nextWorldBuilding: `World-building option ${n}`, nextConflict: `Conflict option ${n}`,
  };
};

const stressMemory = (prose: string) => {
  const n = Number(/Realm (\d+)/.exec(prose)![1]);
  const events: unknown[] = [
    { description: `Yi Chen reached Realm ${n}.`, category: 'character', subjects: ['Yi Chen'], evidence: `Yi Chen advanced to Realm ${n} at the Azure Sect`, details: { character: { name: 'Yi Chen', role: 'Disciple', isMainCharacter: true } }, facts: { realm: `Realm ${n}` } },
    { description: `Yi Chen holds ${100 + n * 10} qi.`, category: 'progression', subjects: ['Yi Chen'], evidence: `carrying ${100 + n * 10} qi`, details: { mechanics: { subject: 'Yi Chen', name: 'Qi', value: String(100 + n * 10), unit: 'qi' } } },
    { description: `Location ${n} is a ruin of black stone.`, category: 'location', subjects: [{ name: `Location ${n}`, kind: 'location-world' }], evidence: `They reached Location ${n}, a ruin of black stone`, facts: { condition: 'ruined black stone' } },
    { description: `Elder Mu recalls the founder's oath.`, category: 'character', subjects: ['Elder Mu'], evidence: `Elder Mu spoke of the founder's oath`, details: { character: { name: 'Elder Mu', role: 'Elder' } } },
    { description: `The Azure Sect stands at Standing ${n}.`, category: 'faction', subjects: [{ name: 'Azure Sect', kind: 'faction' }], evidence: `standing rose to Standing ${n}`, facts: { standing: `Standing ${n}` } },
    { description: `Yi Chen and Elder Mu grow closer.`, category: 'relationship', subjects: ['Yi Chen', 'Elder Mu'], evidence: `Elder Mu spoke of the founder's oath`, facts: { bond: 'mentor and disciple' } },
  ];
  events.push({ description: `Rival ${n} swears to face Yi Chen.`, category: 'character', subjects: [`Rival ${n}`], evidence: `Rival ${n} of the Crimson Hall arrived at dusk`, details: { character: { name: `Rival ${n}`, role: 'Sword cultivator of the Crimson Hall', relationshipToMC: 'Rival' } } });
  if (n % 5 === 0) events.push({ description: `Relic ${n} holds ${n} charges.`, category: 'artifact', subjects: [{ name: `Relic ${n}`, kind: 'artifact' }], evidence: `Relic ${n}, a jade seal holding ${n} charges`, details: { mechanics: { subject: `Relic ${n}`, name: 'Charges', value: String(n), unit: 'charges' } } });
  return { events };
};

export const runPacketStress = async (chapterCount: number) => {
  const requests: HarnessGenerationRequest[] = [];
  const planRequests: HarnessChapterPlanRequest[] = [];
  let chapter = 0;
  const adapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ configured: true, provider: 'gemini', defaultModel: 'fixture', models: [] }),
    generate: async request => { requests.push(structuredClone(request)); chapter += 1; return response(writtenChapter(stressChapter(chapter))); },
    planChapter: async request => { planRequests.push(structuredClone(request)); return planEveryChapter()(); },
    arcOperation: async () => response({ plan: { arcNumber: 1, goals: [{ id: 'arc-1-goal', text: 'Carry Yi Chen through the outer court.', chapters: 30 }] }, destinedEnding: 'Yi Chen leads the Azure Sect to glory.' }),
  };
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter: adapter });
  await controller.hydrate();
  const story = await controller.createStory({
    title: 'Azure Ascent', premise: 'Yi Chen joins the Azure Sect.', destinedEnding: 'Yi Chen leads the Azure Sect to glory.', fatePressure: 'immortal',
    cast: [{ name: 'Yi Chen', role: 'Disciple', isMainCharacter: true }], openingSituation: 'Yi Chen waits at the outer gate.',
  });
  if ('setHardPins' in controller) await (controller as HarnessGenerationController).setHardPins(story.id, [{ text: 'Make Yi Chen take the Azure Sect to glory throughout the entire story.' }]);
  for (let n = 1; n <= chapterCount; n += 1) {
    await controller.generateNextChapter(story.id, 'fixture');
    await seedLegacyChapterEvents(controller, repository, stressMemory(controller.snapshot().chapters.at(-1)!.prose));
  }
  const measure = (prompt: { systemInstruction: string; userPrompt: string; responseJsonSchema: unknown }) => ({
    system: prompt.systemInstruction.length, user: prompt.userPrompt.length, schema: JSON.stringify(prompt.responseJsonSchema).length,
    total: prompt.systemInstruction.length + prompt.userPrompt.length + JSON.stringify(prompt.responseJsonSchema).length,
  });
  /** Each of a chapter's two calls, as sent: the planner's, then the writer's. */
  const size = (request: HarnessGenerationRequest) => measure(buildHarnessGenerationPrompt(request));
  const plannerSize = (request: HarnessChapterPlanRequest) => measure(buildChapterPlannerPrompt(request));
  return { controller, story, requests, planRequests, size, plannerSize, state: controller.snapshot() };
};
// FIXTURE-END

describe('50-chapter packet stress', () => {
  it('keeps the model-facing packet compact while stored history keeps growing', async () => {
    const run = await runPacketStress(50);
    const at = (chapter: number) => run.size(run.requests[chapter - 1]);
    const sizes = { chapter2: at(2), chapter10: at(10), chapter25: at(25), chapter50: at(50) };
    const plannedAt = (chapter: number) => run.plannerSize(run.planRequests[chapter - 1]);
    const plannerSizes = { chapter2: plannedAt(2), chapter10: plannedAt(10), chapter25: plannedAt(25), chapter50: plannedAt(50) };
    console.log(`PACKET_SIZES ${JSON.stringify({ writer: sizes, planner: plannerSizes })}`);

    // Storage keeps growing.
    const packet = (chapter: number) => run.requests[chapter - 1].storyInformation;
    expect(run.state.chapters).toHaveLength(50);
    expect(packet(50).diagnostics.storage.canonicalRecords).toBeGreaterThan(packet(25).diagnostics.storage.canonicalRecords);
    expect(packet(25).diagnostics.storage.canonicalRecords).toBeGreaterThan(packet(10).diagnostics.storage.canonicalRecords);
    expect(run.state.canonicalRecords.filter(record => record.label === 'Yi Chen' && record.kind === 'character').length).toBeGreaterThanOrEqual(49);

    // The packet does not grow linearly with the story: once the canonical
    // allocation is reached, older entities compact and then drop out while
    // storage keeps every record.
    const earlyGrowth = (sizes.chapter25.user - sizes.chapter2.user) / 23;
    const lateGrowth = (sizes.chapter50.user - sizes.chapter25.user) / 25;
    expect(lateGrowth).toBeLessThan(earlyGrowth / 2);
    expect(sizes.chapter50.user).toBeLessThan(sizes.chapter25.user * 1.35);
    expect(sizes.chapter50.total / GENERATION_PACKET_BUDGET.charactersPerToken).toBeLessThan(GENERATION_PACKET_BUDGET.requestTokens);
    // The planner reads the same compact sections, with the author's direction and the Codex beside them.
    expect((plannerSizes.chapter50.user - plannerSizes.chapter25.user) / 25).toBeLessThan((plannerSizes.chapter25.user - plannerSizes.chapter2.user) / 23 / 2);
    expect(plannerSizes.chapter50.total / GENERATION_PACKET_BUDGET.charactersPerToken).toBeLessThan(GENERATION_PACKET_BUDGET.requestTokens);
    const canonical50 = packet(50).diagnostics.sections.find(section => section.section === 'canonicalState')!;
    expect(canonical50.estimatedTokens).toBeLessThanOrEqual(GENERATION_PACKET_BUDGET.sections.canonicalState.tokens);
    expect(packet(50).diagnostics.omitted.filter(item => item.section === 'canonicalState' && /Compacted|Omitted/.test(item.reason)).length).toBeGreaterThan(0);

    // Only the latest five recaps, in order.
    expect(packet(50).previouslyOn.map(entry => entry.chapterNumber)).toEqual([45, 46, 47, 48, 49]);
    expect(packet(10).previouslyOn.map(entry => entry.chapterNumber)).toEqual([5, 6, 7, 8, 9]);
    expect(packet(50).diagnostics.omitted.filter(item => item.section === 'previouslyOn')).toHaveLength(44);

    // Superseded states stay out: one Yi Chen with the latest realm and balance.
    const prompt50 = buildHarnessGenerationPrompt(run.requests[49]);
    const yiChen = packet(50).canonicalState.characters.filter(character => character.name === 'Yi Chen');
    expect(yiChen).toHaveLength(1);
    expect(yiChen[0]).toMatchObject({ asOfChapter: 49, facts: expect.objectContaining({ realm: 'Realm 49' }) });
    expect(packet(50).canonicalState.resources.find(resource => resource.owner === 'Yi Chen')).toMatchObject({ value: '590', asOfChapter: 49 });
    expect(packet(50).canonicalState.factions).toEqual([expect.objectContaining({ name: 'Azure Sect', facts: expect.objectContaining({ standing: 'Standing 49' }) })]);
    expect(prompt50.userPrompt).not.toContain('Realm 10');
    expect(prompt50.userPrompt).not.toContain('Standing 25');
    expect(prompt50.userPrompt).not.toContain('"value": "200"');
    expect(prompt50.userPrompt).not.toContain('training terraces');
    expect(packet(50).diagnostics.identityAmbiguities).toEqual([]);

    // Protected direction always reaches the planner, which decides what happens; the writer always gets its request and reminder.
    for (const chapter of [2, 10, 25, 50]) {
      const planner = buildChapterPlannerPrompt(run.planRequests[chapter - 1]);
      expect(planner.userPrompt).toContain('Yi Chen leads the Azure Sect to glory.');
      expect(planner.userPrompt).toContain('Make Yi Chen take the Azure Sect to glory throughout the entire story.');
      expect(planner.userPrompt).toContain('ACTIVE ARC GOAL');
      expect(planner.userPrompt).toContain('"recommendedFunction"');
      expect(planner.userPrompt).toContain(`Chapter ${chapter}, chapter ${chapter > 30 ? chapter - 30 : chapter} of 30`);
      const prompt = buildHarnessGenerationPrompt(run.requests[chapter - 1]);
      expect(prompt.userPrompt).toContain('# MISSION REMINDER');
      expect(prompt.userPrompt).toContain(`Write Chapter ${chapter}`);
      const sections = packet(chapter).diagnostics.sections;
      for (const protectedSection of ['storyDirection', 'arc', 'rhythm']) expect(sections.find(section => section.section === protectedSection)?.estimatedTokens).toBeGreaterThan(0);
      expect(sections.find(section => section.section === 'canonicalState')!.overBudget).toBe(false);
    }
  }, 120_000);
});
