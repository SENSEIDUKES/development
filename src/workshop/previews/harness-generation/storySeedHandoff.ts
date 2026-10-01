import { createHarnessFoundationFromStorySeed } from '@seihouse/library/story-seed';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { IndexedDbHarnessGenerationRepository } from '../../../host/generation/indexedDbRepository';
import { HarnessGenerationHttpClient } from '../../../host/generation/httpClient';
import type { InitialStoryGenerationPayload } from '@seihouse/sen/story-seed';
import { normalizeChapterWritingStyle } from '@seihouse/sen/contracts';
import type {
  HarnessStorySeedOption,
  HarnessStorySeedSource,
} from '@seihouse/sen/harness-generation';
import { listWorkshopStorySeeds, LOCAL_WORKSHOP_STORY_SEED_OWNER_ID } from '../story-seed/storySeedStorage';
import { createOfficialCapaDefaultLoadout, installOfficialCapaSkills } from '../../../host/generation/capa/officialCapaSkills';
import { startHarnessStoryFromSeed } from '../../../host/story-seed/startHarnessStory';

// The Seed -> Foundation translation is Library-owned so the novel page's
// Blueprint editor saves through the same mapping as story creation.
export { createHarnessFoundationFromStorySeed };

export const createWorkshopStorySeedSource = (): HarnessStorySeedSource => ({
  manageHref: '?preview=story-seed',
  async list(): Promise<HarnessStorySeedOption[]> {
    const records = await listWorkshopStorySeeds(LOCAL_WORKSHOP_STORY_SEED_OWNER_ID);
    return records.map(record => ({
      id: record.id,
      title: record.title,
      updatedAt: record.updatedAt,
      hasBlueprint: Boolean(record.blueprint),
      // Each option carries its own seed's language and Reading Mode, never the last one opened.
      originalLanguage: record.originalLanguage,
      chapterWritingStyle: normalizeChapterWritingStyle(record.seed.story.optional.chapterWritingStyle),
      initialSkillLoadout: createOfficialCapaDefaultLoadout(record.seed.story.required.style),
      foundation: createHarnessFoundationFromStorySeed(record),
    }));
  },
});

/** The Workshop's Start Story: a separate controller over the Workshop's stories, then the shared start. */
export async function startWorkshopHarnessStory(payload: InitialStoryGenerationPayload) {
  const { installed } = await installOfficialCapaSkills(localStorage);
  const controller = new HarnessGenerationController({
    repository: new IndexedDbHarnessGenerationRepository(),
    modelAdapter: new HarnessGenerationHttpClient(),
    installedSkills: installed,
  });
  await controller.hydrate();
  return startHarnessStoryFromSeed(controller, payload);
}
