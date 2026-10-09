import type { HarnessStory, StoryFoundationInput } from '@seihouse/sen/harness-generation';
import type { WorldBlueprint } from '@seihouse/sen/story-seed';
import type { NovelBlueprintSnapshot } from '../../components/story-seed/development/NovelBlueprintEditor';
import { createHarnessFoundationFromStorySeed } from './harnessFoundation';

/**
 * Builds the next Foundation revision from an edited Blueprint through the same
 * Story Seed mapping story creation uses. Values fixed once a novel begins
 * (its destination, arc count and the creation-only initial direction) are
 * carried from the current Foundation, never from the edit.
 */
export const foundationFromNovelBlueprint = (
  current: StoryFoundationInput,
  next: NovelBlueprintSnapshot,
  story: HarnessStory,
): StoryFoundationInput => {
  const source = current.sourceSnapshot;
  const blueprint: WorldBlueprint = {
    ...next.blueprint,
    // The story's saved plans are the arcs' authority; a revision never carries them.
    updatedAt: new Date().toISOString(),
  };
  const mapped = createHarnessFoundationFromStorySeed({
    id: source?.sourceId ?? story.id,
    userId: '',
    title: story.title,
    createdAt: story.createdAt,
    updatedAt: blueprint.updatedAt!,
    schemaVersion: source?.schemaVersion ?? 1,
    originalLanguage: story.originalLanguage,
    seed: next.seed,
    blueprint,
  } as Parameters<typeof createHarnessFoundationFromStorySeed>[0]);
  const { initialArcLookahead: _lookahead, initialArcPlan: _initialPlan, initialHardPins: _pins, plannedArcCount: _count, destinedEnding: _ending, fateSurvival: _mode, ...editable } = mapped;
  return {
    ...editable,
    ...(current.destinedEnding ? { destinedEnding: current.destinedEnding } : {}),
    ...(current.plannedArcCount ? { plannedArcCount: current.plannedArcCount } : {}),
    // Fate Pressure and the Fate mode are story settings, not Blueprint fields.
    ...(current.fatePressure ? { fatePressure: current.fatePressure } : {}),
    ...(current.fateSurvival ? { fateSurvival: { enabled: current.fateSurvival.enabled } } : {}),
  };
};
