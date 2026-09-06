/** Run explicitly with a configured environment. No automatic provider calls in tests. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parseEnv } from 'node:util';
import { HarnessGenerationController } from '../src/components/harness-generation/shared/controller';
import { HarnessCapabilityRegistry, type HarnessCapabilityContext } from '../src/components/harness-generation/shared/capabilities';
import { createEmptyHarnessWorkspaceState, migrateHarnessWorkspaceState } from '../src/components/harness-generation/shared/repository';
import { createHarnessSenStory } from '../src/components/harness-generation/shared/senAdapter';
import { resolveHarnessGenerationConfig, harnessGenerationServerInfo } from '../src/server/harness-generation/config';
import { executeHarnessGeneration } from '../src/server/harness-generation/execute';
import type { HarnessWorkspaceState } from '../src/components/harness-generation/shared/types';

const output = resolve(process.argv[2] ?? 'seiv-0/harness-continuation/state.json');
const environmentFile = process.argv[3];
const environment = { ...(environmentFile ? parseEnv(readFileSync(environmentFile, 'utf8')) : {}), ...process.env };
const config = resolveHarnessGenerationConfig(environment);
if (!config.apiKey) throw new Error('Configure GEMINI_API_KEY before explicitly running this evaluation.');
mkdirSync(dirname(output), { recursive: true });
const repository = {
  load: async () => existsSync(output) ? migrateHarnessWorkspaceState(JSON.parse(readFileSync(output, 'utf8'))) : createEmptyHarnessWorkspaceState(),
  save: async (state: HarnessWorkspaceState) => { writeFileSync(output, JSON.stringify(state)); },
};
let injectFailure = true;
class EvaluationRegistry extends HarnessCapabilityRegistry {
  override processEvent(context: HarnessCapabilityContext) {
    if (injectFailure && context.event.chapterNumber === 7) throw new Error('Evaluation: simulated enhancement failure');
    return super.processEvent(context);
  }
}
const controller = new HarnessGenerationController({ repository, capabilityRegistry: new EvaluationRegistry(), modelAdapter: {
  getServerInfo: async () => harnessGenerationServerInfo(environment),
  generate: request => executeHarnessGeneration(request, config),
} });
await controller.hydrate();
const story = controller.snapshot().stories[0] ?? await controller.createStory({
  title: 'The Bridge of Cinders', genre: 'Fantasy',
  premise: 'Mara, a courier, must get refugees across a storm-struck archipelago. Captain Iven burned the bridge that stranded her family. A submerged bell can open the sea gates, but each use costs precisely counted sparks.',
  characters: 'Mara is the main character, a courier. Iven is a captain and initially her enemy. Sel is a named healer, not the narrator.',
  cast: [{ name: 'Mara', role: 'Courier', isMainCharacter: true, relationshipToMC: 'Self' },
    { name: 'Iven', role: 'Captain', relationshipToMC: 'Enemy' }, { name: 'Sel', role: 'Healer', relationshipToMC: 'Ally' }],
  intendedDirection: 'The initial outline proposes Iven as the eventual final enemy. Mara plans revenge and the bell is to be destroyed.',
  permanentInstructions: 'Write a complete compact chapter of 400-600 words, with dialogue and a consequential change. Keep at most six concise semantic events per chapter. Preserve important relationships and open consequences in events. Preserve the main character identity and speaker roles. When introducing mechanics, include their exact current value in the prose and semantic mechanics. Mara begins with 17 sparks. No stat change is mandatory. Never invent an intervening chapter.',
});
const directions: Record<number, { direction: string; mode?: 'revise-history' }> = {
  2: { direction: 'Make Iven a committed ally starting now, not the final enemy. Let Mara work with him. His burning of the bridge and the stranded families must still have consequences; do not undo that history.' },
  11: { direction: 'Mara chooses mercy toward prisoners. Keep Iven an ally; their next plan should be a rescue, not revenge. Sel must negotiate with the harbor council.' },
  23: { direction: 'Explicit history revision: the bridge was ignited by a lightning strike, not by Iven. He took blame to protect Sel. Keep the bridge destroyed and the families stranded, but revise who caused the fire.', mode: 'revise-history' },
  36: { direction: 'Keep the bell intact and use it to evacuate the islands. Iven leads the rescue as an ally, Mara negotiates the passage, and Sel treats the survivors. Do not return to the original revenge or final-enemy outline.' },
};
// A resumed evaluation may predate the explicit cast contract. These names and
// roles come from this evaluation's authored Foundation, not generated guesses.
const activeFoundation = controller.snapshot().foundations.find(item => item.id === story.activeFoundationRevisionId)!;
if (!activeFoundation.input.cast) {
  await controller.saveFoundationRevision(story.id, { ...activeFoundation.input, cast: [
    { name: 'Mara', role: 'Courier', isMainCharacter: true, relationshipToMC: 'Self' },
    { name: 'Iven', role: 'Captain', relationshipToMC: 'Enemy' }, { name: 'Sel', role: 'Healer', relationshipToMC: 'Ally' },
  ] });
  injectFailure = false;
  await controller.replayStory(story.id);
}
if (controller.snapshot().chapters.length >= 12) injectFailure = false;
const interrupted = controller.snapshot().attempts.find(attempt => attempt.stage === 'provider_outcome_unknown');
if (interrupted && process.argv.includes('--retry-unknown')) await controller.retryModelRequest(interrupted.id);
if (process.argv.includes('--repair')) await controller.replayStory(story.id);
for (let number = controller.snapshot().stories[0].head.nextChapterNumber; number <= 50; number++) {
  const direction = directions[number];
  if (direction && !controller.snapshot().stories[0].steering?.some(item => item.effectiveChapter === number)) {
    await controller.steerStory(story.id, direction.direction, direction.mode);
  }
  await controller.generateNextChapter(story.id, config.defaultModel);
  const state = controller.snapshot();
  const attempt = state.attempts.at(-1)!;
  if (attempt.stage !== 'committed') {
    console.log(JSON.stringify({ chapter: number, stage: attempt.stage, failure: attempt.failure?.stage }));
    process.exitCode = 1;
    break;
  }
  console.log(JSON.stringify({ chapter: number, words: state.chapters.at(-1)!.prose.split(/\s+/).length,
    events: state.chapters.at(-1)!.eventIds.length, processing: attempt.postCommitProcessing,
    contextTokens: attempt.contextSnapshot.selectionAudit?.totalEstimatedTokens,
    directions: attempt.contextSnapshot.steering?.length, developments: attempt.contextSnapshot.developments?.length }));
  if (number === 12) {
    injectFailure = false;
    const before = state.chapters[6].prose;
    await controller.hydrate();
    await controller.replayStory(story.id, state.chapters[6].id);
    if (controller.snapshot().chapters[6].prose !== before) throw new Error('Repair changed accepted prose.');
  }
}
const final = controller.snapshot();
writeFileSync(output.replace(/\.json$/, '-sen.json'), JSON.stringify(createHarnessSenStory(final, story.id)));
writeFileSync(output.replace(/\.json$/, '-metrics.json'), JSON.stringify({
  model: config.defaultModel, chapters: final.chapters.length, steering: final.stories[0].steering,
  reportedInputTokens: final.attempts.reduce((sum, attempt) => sum + (attempt.providerReceipt?.usage.inputTokens ?? 0), 0),
  reportedOutputTokens: final.attempts.reduce((sum, attempt) => sum + (attempt.providerReceipt?.usage.outputTokens ?? 0), 0),
  processing: final.attempts.map(attempt => ({ chapter: attempt.chapterNumber, status: attempt.postCommitProcessing })),
}, null, 2));
