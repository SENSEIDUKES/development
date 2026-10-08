import type { HarnessGenerationController, HarnessSkillReference, HarnessStory } from '@seihouse/sen/harness-generation';
import type { InitialStoryGenerationPayload } from '@seihouse/sen/story-seed';
import { harnessStoryStartFromSeed } from '@seihouse/library/story-seed';
import { applyStorySettingsDraft, type StorySettingsDraft } from '@seihouse/library/stories';
import { createOfficialCapaDefaultLoadout } from '../generation/capa/officialCapaSkills';

/**
 * Creates the HARNESS story a Story Seed's Start Story begins, equipped with
 * the official CAPA defaults for its story tradition and the Story Settings
 * the reader chose in Create, when there are any: their skills, and the Media
 * Packs they equipped (a pack no longer unlocked is left out, and the story
 * plays the Library's own). The controller must be hydrated and have the
 * official skills installed.
 */
export async function startHarnessStoryFromSeed(
  controller: HarnessGenerationController,
  payload: InitialStoryGenerationPayload,
  settings?: { draft: StorySettingsDraft; installedSkills: readonly HarnessSkillReference[] },
): Promise<HarnessStory> {
  const start = harnessStoryStartFromSeed(payload);
  const defaults = createOfficialCapaDefaultLoadout(start.style);
  let story = await controller.createStory(start.foundation, start.originalLanguage,
    settings ? applyStorySettingsDraft(defaults, settings.draft, settings.installedSkills) : defaults, {
      visibility: start.visibility,
      chapterWritingStyle: start.chapterWritingStyle,
    });
  for (const [slot, reference] of Object.entries(settings?.draft.media ?? {}) as [keyof NonNullable<StorySettingsDraft['media']>, { id: string; version: string }][]) {
    try { story = await controller.setMediaSelection(story.id, slot, reference); } catch { /* No longer unlocked: the Library's own plays. */ }
  }
  return story;
}
