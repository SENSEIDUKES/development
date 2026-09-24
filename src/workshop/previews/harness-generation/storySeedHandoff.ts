import { createHarnessFoundationFromStorySeed } from '@seihouse/library/story-seed';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { IndexedDbHarnessGenerationRepository } from '../../../host/generation/indexedDbRepository';
import { HarnessGenerationHttpClient } from '../../../host/generation/httpClient';
import type { InitialStoryGenerationPayload } from '@seihouse/sen/story-seed';
import { STORY_SEED_SCHEMA_VERSION } from '@seihouse/sen/story-seed';
import type {
  HarnessStorySeedOption,
  HarnessStorySeedSource,
} from '@seihouse/sen/harness-generation';
import { type StorySeedRecord } from '@seihouse/sen/story-seed';
import type { HarnessSkillReference, HarnessSkillSlotId } from '@seihouse/sen/harness-generation';
import { listWorkshopStorySeeds, LOCAL_WORKSHOP_STORY_SEED_OWNER_ID } from '../story-seed/storySeedStorage';
import {
  installOfficialCapaSkills,
  OFFICIAL_CAPA_DEFAULT_REFERENCES,
  OFFICIAL_STYLE_REFERENCES,
} from './officialCapaSkills';

// The Seed -> Foundation translation is Library-owned so the novel page's
// Blueprint editor saves through the same mapping as story creation.
export { createHarnessFoundationFromStorySeed };

type HarnessSkillLoadout = Partial<Record<HarnessSkillSlotId, HarnessSkillReference>>;

/** A deliberate Story Seed style change replaces only the Style slot. */
export const updateOfficialCapaStyle = (
  loadout: HarnessSkillLoadout,
  style: StorySeedRecord['seed']['story']['required']['style'],
): HarnessSkillLoadout => {
  const { style: _previousStyle, ...unchangedSlots } = loadout;
  return {
    ...unchangedSlots,
    ...(style ? { style: OFFICIAL_STYLE_REFERENCES[style] } : {}),
  };
};

/** Official defaults for a newly created story. No unprovided slot is invented. */
export const createOfficialCapaDefaultLoadout = (
  style: StorySeedRecord['seed']['story']['required']['style'],
): HarnessSkillLoadout => updateOfficialCapaStyle(OFFICIAL_CAPA_DEFAULT_REFERENCES, style);

export const createWorkshopStorySeedSource = (): HarnessStorySeedSource => ({
  manageHref: '?preview=story-seed',
  async list(): Promise<HarnessStorySeedOption[]> {
    const records = await listWorkshopStorySeeds(LOCAL_WORKSHOP_STORY_SEED_OWNER_ID);
    return records.map(record => ({
      id: record.id,
      title: record.title,
      updatedAt: record.updatedAt,
      hasBlueprint: Boolean(record.blueprint),
      // Each option carries its own seed's language, never the last one opened.
      originalLanguage: record.originalLanguage,
      initialSkillLoadout: createOfficialCapaDefaultLoadout(record.seed.story.required.style),
      foundation: createHarnessFoundationFromStorySeed(record),
    }));
  },
});


export async function startWorkshopHarnessStory(payload: InitialStoryGenerationPayload) {
  const { installed } = await installOfficialCapaSkills(localStorage);
  const controller = new HarnessGenerationController({
    repository: new IndexedDbHarnessGenerationRepository(),
    modelAdapter: new HarnessGenerationHttpClient(),
    installedSkills: installed,
  });
  await controller.hydrate();
  const foundation = createHarnessFoundationFromStorySeed({
    id: payload.administrative.sourceSeedId, userId: payload.administrative.creatorId,
    createdAt: payload.administrative.createdAt, updatedAt: payload.administrative.updatedAt,
    schemaVersion: STORY_SEED_SCHEMA_VERSION, title: payload.blueprint.title,
    originalLanguage: payload.administrative.originalLanguage,
    seed: payload.storySeed, blueprint: payload.blueprint,
  });
  // Original Language is story identity, so it crosses the boundary as its own
  // argument rather than hiding inside the neutral Foundation.
  return controller.createStory(
    foundation,
    payload.administrative.originalLanguage,
    createOfficialCapaDefaultLoadout(payload.storySeed.story.required.style),
    { visibility: payload.administrative.visibility === 'PUBLIC' ? 'public' : payload.administrative.visibility === 'SHARED' ? 'shared' : 'private' },
  );
}
