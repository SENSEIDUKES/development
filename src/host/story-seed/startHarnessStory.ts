import type { HarnessGenerationController, HarnessStory } from '@seihouse/sen/harness-generation';
import type { InitialStoryGenerationPayload } from '@seihouse/sen/story-seed';
import { harnessStoryStartFromSeed } from '@seihouse/library/story-seed';
import { createOfficialCapaDefaultLoadout } from '../generation/capa/officialCapaSkills';

/**
 * Creates the HARNESS story a Story Seed's Start Story begins, equipped with
 * the official CAPA defaults for its story tradition. The controller must be
 * hydrated and have the official skills installed.
 */
export function startHarnessStoryFromSeed(controller: HarnessGenerationController, payload: InitialStoryGenerationPayload): Promise<HarnessStory> {
  const start = harnessStoryStartFromSeed(payload);
  return controller.createStory(start.foundation, start.originalLanguage, createOfficialCapaDefaultLoadout(start.style), {
    visibility: start.visibility,
    chapterWritingStyle: start.chapterWritingStyle,
  });
}
