import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController, exportHarnessStory, readHarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';
import { acceptHarnessModelResponse } from './responseAcceptance';
import { FATE_PRESSURE_RHYTHM_CONFIG, buildRhythmRecommendation, recommendNextChapterFunction } from './rhythm';
import { MISSION_REMINDER_OPENING, MISSION_REMINDER_TEXT_LIMIT, buildMissionReminder } from './missionReminder';
import { assembleCapaPrompt, SEN_NOVEL_AUTHOR_SKILL, harnessArcContext } from '@seihouse/sen/harness-generation';
import { CHAPTER_FUNCTIONS, HARD_PIN_LIMIT, validateHardPinInputs, type ChapterFunction, type HarnessArcRequest, type HarnessGenerationModelAdapter, type HarnessGenerationRequest, type HarnessGenerationResponse } from '@seihouse/sen/harness-generation';
import type { HarnessRuntime } from './ids';
import { type ArcPlan } from '@seihouse/sen/arc-goals';

const runtime = (): HarnessRuntime => {
  let id = 0;
  let tick = 0;
  return {
    createId: prefix => `${prefix}_sd_${++id}`,
    now: () => `2026-09-20T12:${String(Math.floor(tick / 60)).padStart(2, '0')}:${String(tick++ % 60).padStart(2, '0')}.000Z`,
  };
};

const response = (reply: unknown): HarnessGenerationResponse => ({
  rawProviderResponse: typeof reply === 'string' ? reply : JSON.stringify(reply),
  providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: '2026-09-20T12:00:00.000Z', usage: { source: 'unavailable' } },
});

const plan: ArcPlan = { arcNumber: 1, goals: [
  { id: 'arc-1-gate', text: 'Reach the mountain gate.', chapters: 10 },
  { id: 'arc-1-trial', text: 'Pass the sect trial.', chapters: 90 },
] };

const chapterReply = (overrides: Record<string, unknown> = {}) => ({
  title: 'Ashes',
  paragraphs: ['Yi Chen climbed the mountain path toward the Azure Sect gate.', 'The gate opened at dusk.'],
  arcCompletion: { goalId: 'arc-1-gate', completed: false, evidence: '' },
  recap: 'Yi Chen reached the gate at dusk.',
  chapterFunction: 'progression',
  nextProgression: 'Yi Chen enters the outer court.',
  nextWorldBuilding: 'The sect archives reveal the founder’s oath.',
  nextConflict: 'A rival disciple challenges Yi Chen.',
  ...overrides,
});

const setup = async () => {
  const outputs: unknown[] = [];
  const requests: HarnessGenerationRequest[] = [];
  const arcRequests: HarnessArcRequest[] = [];
  let arcReply: Record<string, unknown> = { plan, destinedEnding: 'Yi Chen leads the Azure Sect to glory.' };
  const adapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ configured: true, provider: 'gemini', defaultModel: 'fixture', models: [] }),
    generate: vi.fn(async request => { requests.push(request); return response(outputs.shift() ?? chapterReply()); }),
    arcOperation: vi.fn(async request => { arcRequests.push(request); return response(arcReply); }),
  };
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter: adapter, runtime: runtime() });
  await controller.hydrate();
  return {
    controller, repository, adapter, requests, arcRequests,
    queue: (...replies: unknown[]) => outputs.push(...replies),
    setArcReply: (reply: Record<string, unknown>) => { arcReply = reply; },
    reload: async () => {
      const reloaded = new HarnessGenerationController({ repository, modelAdapter: adapter, runtime: runtime() });
      return { controller: reloaded, state: await reloaded.hydrate() };
    },
  };
};

describe('Hard Pins', () => {
  it('validates the shared contract: at most three single-line intentions and never a weight', () => {
    expect(HARD_PIN_LIMIT).toBe(3);
    expect(validateHardPinInputs([{ text: ' Make Yi Chen take the Azure Sect to glory. ' }])).toEqual([{ text: 'Make Yi Chen take the Azure Sect to glory.' }]);
    expect(() => validateHardPinInputs([{ text: 'a' }, { text: 'b' }, { text: 'c' }, { text: 'd' }])).toThrow('at most 3');
    expect(() => validateHardPinInputs([{ text: '' }])).toThrow('needs its intention');
    expect(() => validateHardPinInputs([{ text: 'two\nlines' }])).toThrow('single line');
    expect(() => validateHardPinInputs([{ text: 'weighted', weight: 5 } as never])).toThrow('"weight" is not a Hard Pin field');
    expect(() => validateHardPinInputs([{ text: 'weighted', importance: 'high' } as never])).toThrow('not a Hard Pin field');
  });

  it('lets only the user create, edit, reorder, and remove them, and refuses a fourth', async () => {
    const run = await setup();
    const story = await run.controller.createStory({ premise: 'Yi Chen joins the Azure Sect.', destinedEnding: 'Glory.', initialArcPlan: plan });
    const saved = await run.controller.setHardPins(story.id, [
      { text: 'Make Yi Chen take the Azure Sect to glory throughout the entire story.' },
      { text: 'Never kill Yi Chen’s master.' },
    ]);
    expect(saved).toHaveLength(2);
    expect(saved.map(pin => Object.keys(pin).sort())).toEqual([['createdAt', 'id', 'text', 'updatedAt'], ['createdAt', 'id', 'text', 'updatedAt']]);

    // Reorder and edit keep identities; a new pin gets a fresh one.
    const reordered = await run.controller.setHardPins(story.id, [
      { id: saved[1].id, text: 'Never kill Yi Chen’s master, even in the final arc.' },
      { id: saved[0].id, text: saved[0].text },
      { text: 'The Azure Sect never bows to the Empire.' },
    ]);
    expect(reordered.map(pin => pin.id)).toEqual([saved[1].id, saved[0].id, expect.stringMatching(/^hpin_/)]);
    expect(reordered[0]).toMatchObject({ createdAt: saved[1].createdAt, text: 'Never kill Yi Chen’s master, even in the final arc.' });
    expect(reordered[0].updatedAt > saved[1].updatedAt).toBe(true);
    expect(reordered[1]).toEqual(saved[0]);

    await expect(run.controller.setHardPins(story.id, [...reordered, { text: 'A fourth intention.' }])).rejects.toThrow('at most 3');
    expect(run.repository.snapshot().stories[0].hardPins).toHaveLength(3);

    // Removal is a shorter ordered list.
    await run.controller.setHardPins(story.id, [{ id: reordered[2].id, text: reordered[2].text }]);
    expect(run.repository.snapshot().stories[0].hardPins?.map(pin => pin.text)).toEqual(['The Azure Sect never bows to the Empire.']);
    await expect(run.controller.setHardPins(story.id, [{ id: 'hpin_unknown', text: 'x' }])).rejects.toThrow('did not match this story');
  });

  it('survives arcs, reload, checkpoints, and export without a weighting field', async () => {
    const run = await setup();
    const story = await run.controller.createStory({ premise: 'Yi Chen joins the Azure Sect.', destinedEnding: 'Glory.', initialArcPlan: plan });
    await run.controller.setHardPins(story.id, [{ text: 'Make Yi Chen take the Azure Sect to glory throughout the entire story.' }]);
    await run.controller.generateNextChapter(story.id, 'fixture');
    await run.controller.generateNextChapter(story.id, 'fixture');

    const { state } = await run.reload();
    expect(state.stories[0].hardPins).toEqual([{ id: expect.stringMatching(/^hpin_/), text: 'Make Yi Chen take the Azure Sect to glory throughout the entire story.', createdAt: expect.any(String), updatedAt: expect.any(String) }]);
    expect(JSON.stringify(state.stories[0].hardPins)).not.toMatch(/weight|priority|importance/i);
    const exported = exportHarnessStory(state, story.id);
    expect(exported.story.hardPins).toEqual(state.stories[0].hardPins);
    // Chapter checkpoints commit around the pins without touching them.
    expect(state.chapters).toHaveLength(2);
  });

  it('cannot be created or mutated by the chapter writer or the arc planner', async () => {
    const run = await setup();
    const story = await run.controller.createStory({ premise: 'Yi Chen joins the Azure Sect.' });
    const pins = await run.controller.setHardPins(story.id, [{ text: 'Never kill Yi Chen’s master.' }]);
    run.setArcReply({ plan, destinedEnding: 'Glory.', hardPins: [{ text: 'Planner pin.' }], fatePressure: 'heaven' });
    run.queue(chapterReply({ hardPins: [{ id: pins[0].id, text: 'Kill the master.' }, { text: 'Writer pin.' }], fatePressure: 'heaven', destinedEnding: 'Writer ending.' }));
    const state = await run.controller.generateNextChapter(story.id, 'fixture');
    expect(state.chapters).toHaveLength(1);
    expect(state.stories[0].hardPins).toEqual(pins);
    expect(state.foundations.at(-1)?.input.fatePressure).toBeUndefined();
    expect(state.foundations.at(-1)?.input.destinedEnding).toBe('Glory.');
    expect(state.attempts[0].warnings).toContainEqual({ code: 'ignored_model_story_direction', message: expect.stringContaining('hardPins, fatePressure, destinedEnding') });
  });
});

describe('Previously On recaps and rhythm metadata', () => {
  it('reads the shallow optional fields and saves them only with the committed chapter', async () => {
    const run = await setup();
    const story = await run.controller.createStory({ premise: 'Yi Chen joins the Azure Sect.', destinedEnding: 'Glory.', initialArcPlan: plan });
    const state = await run.controller.generateNextChapter(story.id, 'fixture');
    const chapter = state.chapters[0];
    expect(chapter.recap).toEqual({ text: 'Yi Chen reached the gate at dusk.', source: 'model', updatedAt: chapter.committedAt });
    expect(chapter.rhythm).toEqual({
      chapterFunction: 'progression',
      nextChapterSuggestions: {
        progression: 'Yi Chen enters the outer court.',
        worldBuilding: 'The sect archives reveal the founder’s oath.',
        conflict: 'A rival disciple challenges Yi Chen.',
      },
    });
    expect(state.attempts[0].acceptedDraft?.recap).toBe('Yi Chen reached the gate at dusk.');
    // One provider call wrote the chapter, its recap, and its rhythm metadata.
    expect(run.adapter.generate).toHaveBeenCalledTimes(1);
  });

  it('warns about missing or malformed optional metadata without rejecting valid prose', () => {
    const missing = acceptHarnessModelResponse(JSON.stringify({ paragraphs: ['Valid prose remains.'], arcCompletion: { goalId: 'g', completed: false, evidence: '' } }), 1);
    expect(missing.accepted).toBe(true);
    if (!missing.accepted) return;
    expect(missing.draft.prose).toBe('Valid prose remains.');
    expect(missing.draft.recap).toBeUndefined();
    expect(missing.draft.rhythm).toBeUndefined();
    expect(missing.warnings.map(warning => warning.code)).toEqual(expect.arrayContaining(['optional_recap_omitted', 'optional_rhythm_metadata_omitted']));

    const malformed = acceptHarnessModelResponse(JSON.stringify({
      paragraphs: ['Valid prose remains.'], recap: 42, chapterFunction: 'romance',
      nextProgression: ['not', 'a', 'string'], nextWorldBuilding: 'Kept: the archives open.', nextConflict: 'two\nlines',
    }), 1);
    expect(malformed.accepted).toBe(true);
    if (!malformed.accepted) return;
    expect(malformed.draft.prose).toBe('Valid prose remains.');
    expect(malformed.draft.recap).toBeUndefined();
    // Each piece is validated on its own: the one readable suggestion survives.
    expect(malformed.draft.rhythm).toEqual({ nextChapterSuggestions: { worldBuilding: 'Kept: the archives open.' } });
    expect(malformed.warnings.filter(warning => warning.code === 'optional_rhythm_metadata_omitted')).toHaveLength(3);
    expect(malformed.warnings.filter(warning => warning.code === 'optional_recap_omitted')).toHaveLength(1);

    const plain = acceptHarnessModelResponse('Plain prose only.\n\nStill a chapter.', 1);
    expect(plain.accepted).toBe(true);
    if (!plain.accepted) return;
    expect(plain.draft.recap).toBeUndefined();
    expect(plain.warnings.map(warning => warning.code)).toEqual(expect.arrayContaining(['optional_recap_omitted', 'optional_rhythm_metadata_omitted']));
  });

  it('never regenerates a committed recap during later chapters, and keeps author edits through reload, replay, retry, and export', async () => {
    const run = await setup();
    const story = await run.controller.createStory({ premise: 'Yi Chen joins the Azure Sect.', destinedEnding: 'Glory.', initialArcPlan: plan });
    await run.controller.generateNextChapter(story.id, 'fixture');
    const first = run.controller.snapshot().chapters[0];
    await run.controller.editChapterRecap(first.id, 'Author recap: the gate opened for Yi Chen.');
    const edited = run.controller.snapshot().chapters[0];
    expect(edited.recap).toMatchObject({ text: 'Author recap: the gate opened for Yi Chen.', source: 'author' });
    expect(edited.prose).toBe(first.prose);

    run.queue(chapterReply({ recap: 'Chapter two recap.', paragraphs: ['Yi Chen entered the outer court.'] }));
    await run.controller.generateNextChapter(story.id, 'fixture');
    // A later chapter's request never asked for, and never touched, the earlier recap.
    expect(run.adapter.generate).toHaveBeenCalledTimes(2);
    let state = run.controller.snapshot();
    expect(state.chapters[0].recap).toEqual(edited.recap);
    expect(state.chapters[1].recap?.text).toBe('Chapter two recap.');

    state = await run.controller.replayStory(story.id);
    expect(state.chapters[0].recap).toEqual(edited.recap);
    expect(state.chapters[0].rhythm).toEqual(first.rhythm);

    const reloaded = await run.reload();
    expect(reloaded.state.chapters[0].recap).toEqual(edited.recap);
    expect(reloaded.state.chapters[1].rhythm?.chapterFunction).toBe('progression');
    const exported = exportHarnessStory(reloaded.state, story.id);
    expect(exported.chapters.map(chapter => chapter.recap?.text)).toEqual(['Author recap: the gate opened for Yi Chen.', 'Chapter two recap.']);
    expect(exported.chapters[0].rhythm).toEqual(first.rhythm);

    // Clearing is an explicit author choice; prose is untouched.
    await reloaded.controller.editChapterRecap(first.id, '   ');
    expect(reloaded.controller.snapshot().chapters[0].recap).toBeUndefined();
    expect(reloaded.controller.snapshot().chapters[0].prose).toBe(first.prose);
    await expect(reloaded.controller.editChapterRecap(first.id, 'x'.repeat(1_201))).rejects.toThrow('1200 characters');
  });

  it('accepts a retried model request into the same recap and rhythm shape', async () => {
    const run = await setup();
    const story = await run.controller.createStory({ premise: 'Yi Chen joins the Azure Sect.', destinedEnding: 'Glory.', initialArcPlan: plan });
    run.queue('   ');
    await run.controller.generateNextChapter(story.id, 'fixture');
    const failed = run.controller.snapshot().attempts.at(-1)!;
    expect(failed.stage).toBe('generation_failed');
    const retried = await run.controller.retryModelRequest(failed.id);
    expect(retried.chapters[0].recap?.text).toBe('Yi Chen reached the gate at dusk.');
    expect(retried.chapters[0].rhythm?.chapterFunction).toBe('progression');
  });
});

describe('Fate Pressure rhythm recommendation', () => {
  it('centralizes every tuning value in one Development-default configuration', () => {
    expect(FATE_PRESSURE_RHYTHM_CONFIG.source).toBe('development-default');
    expect(Object.keys(FATE_PRESSURE_RHYTHM_CONFIG.tiers)).toEqual(['mortal', 'immortal', 'heaven']);
    for (const tier of Object.values(FATE_PRESSURE_RHYTHM_CONFIG.tiers)) {
      expect(Object.keys(tier.weights).sort()).toEqual([...CHAPTER_FUNCTIONS].sort());
      expect(Object.keys(tier.streakLimits).sort()).toEqual([...CHAPTER_FUNCTIONS].sort());
    }
    // Mortal tolerates longer world-building streaks than Heaven.
    expect(FATE_PRESSURE_RHYTHM_CONFIG.tiers.mortal.streakLimits.worldBuilding).toBeGreaterThan(FATE_PRESSURE_RHYTHM_CONFIG.tiers.heaven.streakLimits.worldBuilding);
    // No rhythm number lives in the controller or the acceptance path.
    for (const file of ['controller.ts', 'responseAcceptance.ts']) {
      expect(readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')).not.toMatch(/streakLimits|maxOccurrencesInWindow|windowSize/);
    }
  });

  it('is deterministic from saved chapter functions and the configuration alone', () => {
    const history: ChapterFunction[] = ['worldBuilding', 'worldBuilding'];
    const mortal = recommendNextChapterFunction('mortal', history);
    const heaven = recommendNextChapterFunction('heaven', history);
    expect(recommendNextChapterFunction('mortal', history)).toEqual(mortal);
    expect(mortal.recommendedFunction).toBe('worldBuilding');
    expect(mortal.blocked).toEqual([]);
    // Heaven blocks the same streak sooner and favors conflict.
    expect(heaven.blocked).toEqual(['worldBuilding']);
    expect(heaven.recommendedFunction).toBe('conflict');
    expect(heaven.reason).toContain('Heaven pressure');

    // Even Mortal ends a world-building streak at its cap, then falls to the next weight.
    const longStreak = recommendNextChapterFunction('mortal', ['worldBuilding', 'worldBuilding', 'worldBuilding', 'worldBuilding']);
    expect(longStreak.blocked).toEqual(['worldBuilding']);
    expect(longStreak.recommendedFunction).toBe('progression');

    // Balanced ties break by the longest-unused function, then the fixed order.
    expect(recommendNextChapterFunction('immortal', []).recommendedFunction).toBe('progression');
    expect(recommendNextChapterFunction('immortal', ['progression', 'worldBuilding']).recommendedFunction).toBe('conflict');
    expect(recommendNextChapterFunction('immortal', ['progression', 'conflict', 'worldBuilding']).recommendedFunction).toBe('progression');

    const built = buildRhythmRecommendation({ forChapterNumber: 3, history: [{ chapterNumber: 2, chapterFunction: 'conflict' }, { chapterNumber: 1, chapterFunction: 'progression' }], computedAt: 'now' });
    expect(built).toMatchObject({ fatePressure: FATE_PRESSURE_RHYTHM_CONFIG.defaultFatePressure, fatePressureSource: 'development-default', forChapterNumber: 3, recommendedFunction: 'worldBuilding' });
    expect(built.recentFunctions.map(entry => entry.chapterNumber)).toEqual([1, 2]);
  });

  it('does not depend on Story Seed labels or interface placement', () => {
    const source = readFileSync(new URL('./rhythm.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/story-seed|StorySeed|Survival Pressure|Core Premise|Synopsis|fateSurvival/);
    expect(readFileSync(new URL('../../../narrative/storyDirection.ts', import.meta.url), 'utf8')).not.toMatch(/import .* from '.*story-seed/);
  });

  it('preserves each story’s own Fate Pressure, persists the recommendation at commit, and lets no model reply override it', async () => {
    const run = await setup();
    const heaven = await run.controller.createStory({ premise: 'Yi Chen joins the Azure Sect.', destinedEnding: 'Glory.', initialArcPlan: plan, fatePressure: 'heaven' });
    const mortal = await run.controller.createStory({ premise: 'Lin tends the garden.', destinedEnding: 'Peace.', initialArcPlan: plan, fatePressure: 'mortal' });
    const unset = await run.controller.createStory({ premise: 'A courier waits.', destinedEnding: 'Arrival.', initialArcPlan: plan });
    await expect(run.controller.createStory({ premise: 'Bad tier.', fatePressure: 'Hardcore' as never })).rejects.toThrow('mortal, immortal, heaven');

    expect(run.controller.snapshot().stories.map(story => story.rhythmRecommendation?.fatePressure)).toEqual(['heaven', 'mortal', 'immortal']);
    expect(run.controller.snapshot().stories[2].rhythmRecommendation?.fatePressureSource).toBe('development-default');

    for (const reply of ['worldBuilding', 'worldBuilding'] as const) {
      run.queue(chapterReply({ chapterFunction: reply, fatePressure: 'mortal' }));
      await run.controller.generateNextChapter(heaven.id, 'fixture');
    }
    let state = run.controller.snapshot();
    const heavenStory = state.stories.find(story => story.id === heaven.id)!;
    expect(state.foundations.filter(foundation => foundation.storyId === heaven.id).at(-1)?.input.fatePressure).toBe('heaven');
    expect(heavenStory.rhythmRecommendation).toMatchObject({
      fatePressure: 'heaven', fatePressureSource: 'story', forChapterNumber: 3, recommendedFunction: 'conflict', blocked: ['worldBuilding'],
      recentFunctions: [{ chapterNumber: 1, chapterFunction: 'worldBuilding' }, { chapterNumber: 2, chapterFunction: 'worldBuilding' }],
    });
    expect(heavenStory.rhythmRecommendation?.computedAt).toBe(state.chapters.at(-1)?.committedAt);
    // The same saved history under the other story's tier is a separate, unaffected value.
    expect(state.stories.find(story => story.id === mortal.id)?.rhythmRecommendation).toMatchObject({ fatePressure: 'mortal', forChapterNumber: 1, recentFunctions: [] });
    expect(buildRhythmRecommendation({ fatePressure: 'mortal', forChapterNumber: 3, history: heavenStory.rhythmRecommendation!.recentFunctions, computedAt: 'x' }).recommendedFunction).toBe('worldBuilding');

    // The arc planner's own reply cannot rewrite a story's Fate Pressure either,
    // including when it legitimately supplies the missing Destined Ending.
    run.setArcReply({ plan: { ...plan, arcNumber: 1 }, destinedEnding: 'Arrival.', fatePressure: 'heaven' });
    await run.controller.generateNextChapter(unset.id, 'fixture');
    state = run.controller.snapshot();
    expect(state.foundations.filter(foundation => foundation.storyId === unset.id).at(-1)?.input.fatePressure).toBeUndefined();
    const planned = await run.controller.createStory({ premise: 'A planner supplies the ending.', fatePressure: 'mortal' });
    run.setArcReply({ plan, destinedEnding: 'Planner ending.', fatePressure: 'heaven' });
    await run.controller.generateNextChapter(planned.id, 'fixture');
    const plannedFoundation = run.controller.snapshot().foundations.filter(foundation => foundation.storyId === planned.id).at(-1)!;
    expect(plannedFoundation.input).toMatchObject({ destinedEnding: 'Planner ending.', fatePressure: 'mortal' });

    // A user Foundation revision is the only way to change it, and the recommendation follows.
    const foundation = state.foundations.filter(item => item.storyId === heaven.id).at(-1)!;
    await run.controller.saveFoundationRevision(heaven.id, { ...foundation.input, fatePressure: 'mortal' });
    const revised = run.controller.snapshot().stories.find(story => story.id === heaven.id)!;
    expect(revised.rhythmRecommendation).toMatchObject({ fatePressure: 'mortal', recommendedFunction: 'worldBuilding', blocked: [] });

    const { state: reloadedState } = await run.reload();
    expect(reloadedState.stories.find(story => story.id === heaven.id)?.rhythmRecommendation).toEqual(revised.rhythmRecommendation);
    expect(exportHarnessStory(reloadedState, heaven.id).story.rhythmRecommendation).toEqual(revised.rhythmRecommendation);
  });
});

describe('Active Arc Goal source', () => {
  it('reads every displayed value from the existing Arc Plan authority', async () => {
    const run = await setup();
    const story = await run.controller.createStory({ premise: 'Yi Chen joins the Azure Sect.', destinedEnding: 'Glory.', initialArcPlan: plan });
    await run.controller.generateNextChapter(story.id, 'fixture');
    const state = run.controller.snapshot();
    const saved = state.stories[0];
    const foundation = state.foundations.find(item => item.id === saved.activeFoundationRevisionId)!;
    const context = harnessArcContext(saved, foundation.input, saved.head.nextChapterNumber)!;
    expect(context).toMatchObject({ arcNumber: 1, chapterInArc: 2, activeGoal: { id: 'arc-1-gate', text: 'Reach the mountain gate.', startChapter: 1, endChapter: 10 }, completionDeadline: 10, positionInSegment: 2, completionConfirmed: false });
    expect(context.plan).toEqual(run.requests[0].storyInformation.arc?.plan);
    expect(context.plan.goals.findIndex(goal => goal.id === context.activeGoal.id) + 1).toBe(1);
    expect(context.plan.goals).toHaveLength(2);
  });
});

describe('Mission Reminder', () => {
  it('is short, sourced from the Author portion of the CAPA Prompt, and performs no story analysis or model call', () => {
    const capaPrompt = assembleCapaPrompt({ capturedAt: '2026-09-20T12:00:00.000Z', skills: [
      { id: 'seihouse.pacing', version: '2.0.0', name: 'Patient Siege', description: 'Pacing.', slot: 'pacing', applications: ['generation'], instructions: 'PACING SECRET: never resolve the siege early.' },
      SEN_NOVEL_AUTHOR_SKILL,
    ] });
    const reminder = buildMissionReminder(capaPrompt);
    expect(reminder.text.startsWith(MISSION_REMINDER_OPENING)).toBe(true);
    expect(reminder.text.length).toBeLessThanOrEqual(MISSION_REMINDER_TEXT_LIMIT);
    expect(reminder.text.split('\n')).toHaveLength(2);
    expect(reminder.text).toContain('elite Eastern fantasy web-novel author');
    expect(reminder.text).not.toContain('PACING SECRET');
    expect(reminder.text).not.toContain('HARNESS OFFICIAL OUTPUT REQUIREMENTS');
    expect(reminder.sourceSkill).toEqual({ id: SEN_NOVEL_AUTHOR_SKILL.id, version: SEN_NOVEL_AUTHOR_SKILL.version, name: SEN_NOVEL_AUTHOR_SKILL.name });
    // Deterministic and pure: the same prompt yields the same reminder, and the builder takes no story state.
    expect(buildMissionReminder(capaPrompt)).toEqual(reminder);
    expect(buildMissionReminder.length).toBe(1);
    expect(() => buildMissionReminder({ text: 'No author section.', skills: [] })).toThrow('equipped Author skill');
  });

  it('is frozen on each attempt and travels as its own request field, presented once as section 8', async () => {
    const run = await setup();
    const story = await run.controller.createStory({ premise: 'Yi Chen joins the Azure Sect.', destinedEnding: 'Glory.', initialArcPlan: plan });
    const preview = run.controller.describeMissionReminder(story.id);
    await run.controller.generateNextChapter(story.id, 'fixture');
    const attempt = run.controller.snapshot().attempts[0];
    expect(attempt.missionReminder).toEqual(preview);
    expect(run.adapter.generate).toHaveBeenCalledTimes(1);
    expect(run.requests[0].missionReminder).toEqual(preview);
    // It never hides inside the CAPA Prompt or the Story Information Packet.
    expect(run.requests[0].capaPrompt.text).not.toContain('MISSION REMINDER');
    expect(JSON.stringify(run.requests[0].storyInformation)).not.toContain('MISSION REMINDER');
    const prompt = buildHarnessGenerationPrompt(run.requests[0]);
    expect(prompt.systemInstruction).not.toContain('MISSION REMINDER');
    expect(prompt.userPrompt.split('MISSION REMINDER:')).toHaveLength(2);
  });
});

describe('persistence boundary', () => {
  it('resets stale Development data at the previous schema version instead of migrating it', async () => {
    const run = await setup();
    await run.controller.createStory({ premise: 'Yi Chen joins the Azure Sect.' });
    const stale = { ...run.repository.snapshot(), schemaVersion: 14 };
    expect(readHarnessWorkspaceState(stale).stories).toHaveLength(0);
  });
});
