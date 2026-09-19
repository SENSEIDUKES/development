import { beforeEach, describe, expect, it } from 'vitest';
import { type WorldBlueprint } from '@seihouse/sen/story-seed';
import { applyInferredStoryTags, buildBlueprintGenerationPayload, buildInitialStoryGenerationPayload, createBlueprintDraftFromSeed, createBlueprintOriginSnapshot, createEmptyStorySeedInput, normalizeStorySeedInput, normalizeWorldBlueprint, STORY_PREMISE_MAX_LENGTH, validateStorySeedDraft, validateStorySeedInput, type StorySeedInput } from '@seihouse/sen/story-seed';
import { createStorySeedCollectionExport, createStorySeedExport, parseStorySeedJson } from '@seihouse/sen/story-seed';
import { createStorySeed, listStorySeeds, resetStorySeedRepository, setStorySeedRepository, updateStorySeed } from '../../../workshop/previews/story-seed/storySeedStorage';
import { type StorySeedRecord, type StorySeedRepository } from '@seihouse/sen/story-seed';
import { createStoryAdministrativeMetadata, validateStoryAdministrativeMetadata } from '@seihouse/sen/story-seed';

const blueprint: WorldBlueprint = {
  title: 'Ashes of the Ninth Meridian',
  logline: 'Seven doomed timelines. One chance to break fate.',
  worldOverview: 'A shattered celestial court rules the sects through fate ledgers.',
  startingLocation: 'Outer sect quarry',
  societyStructure: 'Sect-led feudal hierarchy',
  powerSystemOutline: 'Cultivation advances by severing imposed destinies.',
  mcProfile: 'Ye Chen is a fallen heir with memories of seven failures.',
  majorFactions: ['Heavenly Sword Sect', 'Celestial Court'],
  initialCharacters: ['Elder Qin (Protector)', 'Ninth Prince'],
  majorMysteries: ['Who wrote the fate ledgers?'],
  firstArcPromise: 'The first assassination attempt begins at the tournament.',
  tropeRules: 'Consequences before triumph.',
  styleBible: 'korean',
  destinedEnding: 'The prince survives and severs the court from fate.',
  estimatedArcs: 7,
  unresolvedPlotThreads: ['Identify the court infiltrator'],
};

const completeSeed = (): StorySeedInput => ({
  creator: {},
  story: {
    required: {
      storyTags: ['death flags', 'foreknowledge'],
      premise: 'A prince must survive the seven timelines that say he dies.',
      genre: 'Xianxia',
      style: 'chinese',
    },
    optional: {
      intendedForMatureAudiences: true,
      fateSurvival: { enabled: true, visibility: 'partial', pressure: 'immortal' },
      plotAndTropeSettings: {
        faceSlap: 'low',
        plotArmor: 'high',
        recognition: 'medium',
        firstMajorConflict: 'The sect tournament',
        mainAntagonistPressure: 'The celestial court',
      },
      additionalStoryDirection: 'Escalating court intrigue.',
      makeItWorkInstruction: 'The weakest bloodline is secretly the only one heaven fears.',
    },
  },
  world: {
    required: {},
    optional: {
      worldIdentity: {
        title: 'Ashes of the Ninth Meridian',
        worldType: 'Ancient sect world',
        societyStructure: 'Sect-led feudal hierarchy',
        startingLocation: 'Outer sect quarry',
      },
      worldFoundations: {
        mainCharacter: { name: 'Ye Chen', personality: 'Protective and ruthless' },
        additionalCharacters: [{ id: 'character-1', name: 'Elder Qin' }],
        factions: [{ id: 'faction-1', name: 'Heavenly Sword Sect' }],
        abilities: { startingPowerConcept: 'Qi Condensation', uniquePath: 'Fate severing' },
        powerSystem: { flavor: 'Daoist martial arts', knownRanks: 'Qi Condensation > Foundation' },
        destinedEnding: 'The prince survives and severs the court from fate.',
      },
    },
  },
});

const administrative = () => createStoryAdministrativeMetadata({
  storyId: 'story-1',
  creatorId: 'creator-1',
  sourceSeedId: 'seed-1',
  originalLanguage: 'en',
});

describe('Story Seed creator/story/world contract', () => {
  beforeEach(() => resetStorySeedRepository());

  it('exposes exactly the approved hierarchy and nothing else', () => {
    const seed = normalizeStorySeedInput(completeSeed());

    expect(Object.keys(seed).sort()).toEqual(['creator', 'story', 'world']);
    expect(Object.keys(seed.story).sort()).toEqual(['optional', 'required']);
    expect(Object.keys(seed.world).sort()).toEqual(['optional', 'required']);
    expect(Object.keys(seed.story.required).sort()).toEqual(['genre', 'premise', 'storyTags', 'style']);
    expect(Object.keys(seed.story.optional).sort()).toEqual([
      'additionalStoryDirection',
      'fateSurvival',
      'intendedForMatureAudiences',
      'makeItWorkInstruction',
      'plotAndTropeSettings',
    ]);
    expect(seed.story.optional.plotAndTropeSettings).toMatchObject({
      faceSlap: 'low',
      plotArmor: 'high',
      recognition: 'medium',
    });
    expect(Object.keys(seed.world.optional).sort()).toEqual(['worldFoundations', 'worldIdentity']);
    // World has no required creator inputs, but the family still exists.
    expect(seed.world.required).toEqual({});
  });

  it('lets a draft save with no creative data at all, and with an empty World', () => {
    const empty = createEmptyStorySeedInput();
    expect(validateStorySeedDraft(empty)).toEqual({ valid: true, errors: [] });
    expect(empty.story.required).toEqual({ storyTags: [], premise: '', genre: '', style: '' });
    expect(empty.story.optional.fateSurvival).toEqual({
      enabled: false,
      visibility: 'partial',
      pressure: 'immortal',
    });
    expect(empty.story.optional.plotAndTropeSettings).toEqual({
      faceSlap: 'medium',
      plotArmor: 'medium',
      recognition: 'medium',
    });
    expect(empty.story.optional.intendedForMatureAudiences).toBe(false);
    expect(empty.story.optional.makeItWorkInstruction).toBeUndefined();
    expect(empty.world).toEqual({ required: {}, optional: { worldIdentity: {}, worldFoundations: {} } });

    // A generation-ready Story with a completely empty World is valid.
    const worldless: StorySeedInput = {
      ...empty,
      story: {
        required: {
          storyTags: ['death flags'],
          premise: 'A doomed prince gets one final timeline.',
          genre: 'Xianxia',
          style: 'korean',
        },
        optional: { intendedForMatureAudiences: false, fateSurvival: { enabled: false, visibility: 'partial', pressure: 'immortal' }, plotAndTropeSettings: {} },
      },
    };
    expect(validateStorySeedInput(worldless)).toEqual({ valid: true, errors: [] });
    expect(buildBlueprintGenerationPayload(worldless).storySeed.world.optional).toEqual({
      worldIdentity: {},
      worldFoundations: {},
    });
  });

  it('keeps canonical Origin provenance separate from generated Blueprint direction', () => {
    const seed = completeSeed();
    const generated: WorldBlueprint = {
      ...blueprint,
      title: 'A Generated Replacement Title',
      logline: 'Generated direction that deliberately differs from the premise.',
      styleBible: 'Generated prose guidance, not a Novel Tradition value.',
      creator: 'Model-Invented Creator',
      status: 'Model-Invented Status',
      createdAt: 'Model-Invented Date',
      originSnapshot: {
        premise: 'Incorrect model-authored premise',
        genre: 'Incorrect genre',
        style: 'japanese',
        storyTags: ['incorrect tag'],
      },
    };

    expect(createBlueprintOriginSnapshot(seed)).toEqual({
      premise: 'A prince must survive the seven timelines that say he dies.',
      genre: 'Xianxia',
      style: 'chinese',
      storyTags: ['death flags', 'foreknowledge'],
    });

    const normalized = normalizeWorldBlueprint(generated, seed, {
      creator: 'SENSEI',
      createdAt: '2026-08-06T00:00:00.000Z',
      updatedAt: '2026-08-06T01:00:00.000Z',
      preserveSourceMetadata: false,
    });
    expect(normalized.originSnapshot).toEqual(createBlueprintOriginSnapshot(seed));
    expect(normalized.title).toBe('Ashes of the Ninth Meridian');
    expect(normalized.logline).toBe('Generated direction that deliberately differs from the premise.');
    expect(normalized.styleBible).toBe('Generated prose guidance, not a Novel Tradition value.');
    expect(normalized.creator).toBe('SENSEI');
    expect(normalized.status).toBeUndefined();
    expect(normalized.createdAt).toBe('2026-08-06T00:00:00.000Z');
    expect(normalized.updatedAt).toBe('2026-08-06T01:00:00.000Z');
    expect(normalized.blueprintVersion).toBe('v1.0');
  });

  it('builds a seed-only Blueprint draft without disguising Origin as generated direction', () => {
    const draft = createBlueprintDraftFromSeed(completeSeed());

    expect(draft.originSnapshot?.premise).toBe('A prince must survive the seven timelines that say he dies.');
    expect(draft.logline).toBe('Escalating court intrigue.');
    expect(draft.logline).not.toBe(draft.originSnapshot?.premise);
    expect(draft.styleBible).toBe('');
    expect(draft.mainCharacter).toMatchObject({
      name: 'Ye Chen',
      age: '',
      personality: 'Protective and ruthless',
      appearance: '',
    });
  });

  it('normalizes an older Blueprint without losing any established generated field', () => {
    const normalized = normalizeWorldBlueprint(blueprint);

    expect(normalized).toMatchObject(blueprint);
    expect(normalized.blueprintVersion).toBe('v1.0');
    expect(normalized.creator).toBeUndefined();
    expect(normalized.originSnapshot).toEqual({ premise: '', genre: '', style: '', storyTags: [] });
    expect(normalized.mainCharacter).toEqual({
      name: '',
      age: '',
      personality: '',
      appearance: '',
      backgroundProfile: blueprint.mcProfile,
    });
    expect(normalized.majorFactions).toEqual(blueprint.majorFactions);
    expect(normalized.initialCharacters).toEqual(blueprint.initialCharacters);
    expect(normalized.majorMysteries).toEqual(blueprint.majorMysteries);
    expect(normalized.unresolvedPlotThreads).toEqual(blueprint.unresolvedPlotThreads);
  });

  it('preserves deliberately cleared editable fields instead of restoring seed fallbacks', () => {
    const seed = completeSeed();
    seed.world.optional.worldIdentity.title = '';
    const cleared = normalizeWorldBlueprint({
      ...blueprint,
      title: '',
      startingLocation: '',
      societyStructure: '',
      powerSystemOutline: '',
      firstArcPromise: '',
      mainCharacter: {
        name: '',
        age: '',
        personality: '',
        appearance: '',
        backgroundProfile: '',
      },
      mcProfile: 'Legacy profile that must not override the structured edit.',
    }, seed);

    expect(cleared).toMatchObject({
      title: '',
      startingLocation: '',
      societyStructure: '',
      powerSystemOutline: '',
      firstArcPromise: '',
      mcProfile: '',
      mainCharacter: {
        name: '',
        age: '',
        personality: '',
        appearance: '',
        backgroundProfile: '',
      },
    });
  });

  it('treats Story Tags, Premise, Genre, and Style as the required Story inputs', () => {
    expect(validateStorySeedInput(createEmptyStorySeedInput())).toEqual({
      valid: false,
      errors: [
        'Style is required.',
        'Genre is required.',
        'Premise is required.',
        'Story Tags are required.',
      ],
    });
  });

  it('enforces the same Origin premise and Story Tag limits at generation boundaries', () => {
    const oversized = completeSeed();
    oversized.story.required.premise = 'x'.repeat(3_001);
    oversized.story.required.storyTags = Array.from({ length: 13 }, (_, index) => `tag ${index + 1}`);

    expect(validateStorySeedInput(oversized).errors).toEqual([
      `Premise cannot exceed ${STORY_PREMISE_MAX_LENGTH.toLocaleString('en-US')} characters.`,
      'Story Tags cannot exceed 12.',
    ]);
  });

  it('accepts only the three novel traditions as Style', () => {
    const withStyle = (style: string): unknown => ({
      ...completeSeed(),
      story: { ...completeSeed().story, required: { ...completeSeed().story.required, style } },
    });
    for (const tradition of ['chinese', 'korean', 'japanese']) {
      expect(validateStorySeedInput(withStyle(tradition)).valid).toBe(true);
      expect(normalizeStorySeedInput(withStyle(tradition)).story.required.style).toBe(tradition);
    }
    // Labels normalize to the stable value; freeform prose never counts.
    expect(normalizeStorySeedInput(withStyle('Japanese')).story.required.style).toBe('japanese');
    expect(validateStorySeedInput(withStyle('Lush, poetic narration')).errors).toEqual(['Style is required.']);
    expect(normalizeStorySeedInput(withStyle('Lush, poetic narration')).story.required.style).toBe('');
  });

  it('normalizes missing and legacy story-sauce values to medium', () => {
    const missing = normalizeStorySeedInput({
      ...completeSeed(),
      story: {
        ...completeSeed().story,
        optional: { intendedForMatureAudiences: false, fateSurvival: { enabled: false, visibility: 'partial', pressure: 'immortal' }, plotAndTropeSettings: {} },
      },
    });
    expect(missing.story.optional.plotAndTropeSettings).toEqual({
      faceSlap: 'medium',
      plotArmor: 'medium',
      recognition: 'medium',
    });
    expect(missing.story.optional.intendedForMatureAudiences).toBe(false);

    const legacy = normalizeStorySeedInput({
      ...completeSeed(),
      story: {
        ...completeSeed().story,
        optional: {
          plotAndTropeSettings: {
            faceSlap: 'HIGH',
            plotArmor: 'extreme',
            recognition: null,
          },
        },
      },
    });
    expect(legacy.story.optional.plotAndTropeSettings).toEqual({
      faceSlap: 'high',
      plotArmor: 'medium',
      recognition: 'medium',
    });
  });

  it('keeps Make It Work optional and normalizes missing or blank values to empty', () => {
    const missing = normalizeStorySeedInput({
      ...completeSeed(),
      story: {
        ...completeSeed().story,
        optional: { plotAndTropeSettings: {} },
      },
    });
    expect(missing.story.optional.makeItWorkInstruction).toBeUndefined();
    expect(validateStorySeedInput(missing)).toEqual({ valid: true, errors: [] });

    const blank = normalizeStorySeedInput({
      ...completeSeed(),
      story: {
        ...completeSeed().story,
        optional: {
          ...completeSeed().story.optional,
          makeItWorkInstruction: '   ',
        },
      },
    });
    expect(blank.story.optional.makeItWorkInstruction).toBeUndefined();
    expect(validateStorySeedInput(blank)).toEqual({ valid: true, errors: [] });
  });

  it('infers Story Tags from Premise, Genre, and Style so they never block generation', () => {
    const untagged = normalizeStorySeedInput({
      ...completeSeed(),
      story: { ...completeSeed().story, required: { ...completeSeed().story.required, storyTags: [] } },
    });
    expect(untagged.story.required.storyTags).toEqual([]);

    const inferred = applyInferredStoryTags(untagged).story.required.storyTags;
    expect(inferred.length).toBeGreaterThan(0);
    expect(inferred).toContain('cultivation realms');
    expect(inferred).toContain('destined death');

    // The inferred set reaches both generation entry points despite Story Tags
    // being a required field.
    expect(buildBlueprintGenerationPayload(untagged).storySeed.story.required.storyTags).toEqual(inferred);
    expect(
      buildInitialStoryGenerationPayload(untagged, administrative(), blueprint, 10)
        .storySeed.story.required.storyTags,
    ).toEqual(inferred);
  });

  it('preserves manually chosen Story Tags untouched', () => {
    const seed = completeSeed();
    expect(applyInferredStoryTags(seed).story.required.storyTags).toEqual(['death flags', 'foreknowledge']);
    expect(buildBlueprintGenerationPayload(seed).storySeed.story.required.storyTags)
      .toEqual(['death flags', 'foreknowledge']);
  });

  it('keeps current Fate Survival settings while dropping legacy experience dials and Blueprint output', () => {
    const seed = normalizeStorySeedInput({
      ...completeSeed(),
      story: {
        required: { ...completeSeed().story.required, hardcoreFateMode: true, fatePressure: 'Hardcore' },
        optional: {
          ...completeSeed().story.optional,
          fateSurvival: { enabled: true, visibility: 'full', pressure: 'heaven' },
          hardcoreFateMode: true,
          fatePressure: 'Hardcore',
          romanceLevel: 'Single heroine',
          faceSlappingLevel: 'High',
          comedyLevel: 'Dry',
          haremPreference: 'None',
          betrayalLevel: 'Moderate',
          dangerLevel: 'Relentless',
          generalAtmosphere: 'Ominous',
          powerPace: 'Slow burn',
          logline: blueprint.logline,
          firstArcPromise: blueprint.firstArcPromise,
          tropeRules: blueprint.tropeRules,
          unresolvedPlotThreads: blueprint.unresolvedPlotThreads,
          estimatedArcs: 7,
        },
      },
      world: {
        required: {},
        optional: {
          worldIdentity: { ...completeSeed().world.optional.worldIdentity, universe: blueprint.worldOverview },
          worldFoundations: {
            ...completeSeed().world.optional.worldFoundations,
            majorMysteries: blueprint.majorMysteries,
          },
        },
      },
    });

    const serialized = JSON.stringify(seed);
    expect(seed.story.optional.fateSurvival).toEqual({ enabled: true, visibility: 'full', pressure: 'heaven' });

    for (const removed of [
      'hardcoreFateMode', 'fatePressure', 'romanceLevel', 'faceSlappingLevel', 'comedyLevel',
      'haremPreference', 'betrayalLevel', 'dangerLevel', 'generalAtmosphere', 'powerPace',
      'logline', 'firstArcPromise', 'tropeRules', 'unresolvedPlotThreads', 'estimatedArcs',
      'universe', 'majorMysteries',
    ]) {
      expect(serialized).not.toContain(removed);
    }
  });

  it('serializes only creator/story/world and round-trips portable files', () => {
    const seed = completeSeed();
    const exported = createStorySeedExport(seed);
    expect(exported).toMatchObject({ format: 'seihouse-story-seed', version: 4 });
    expect(Object.keys(exported.seed).sort()).toEqual(['creator', 'story', 'world']);
    expect(exported.seed).not.toHaveProperty('intake');
    expect(exported.seed).not.toHaveProperty('blueprint');
    // Local entity ids never leave the account.
    expect(JSON.stringify(exported)).not.toContain('character-1');

    const [{ seed: roundTripped }] = parseStorySeedJson(JSON.stringify(exported));
    expect(roundTripped.story.required).toEqual(seed.story.required);
    expect(roundTripped.story.optional.intendedForMatureAudiences).toBe(true);
    expect(roundTripped.story.optional.fateSurvival)
      .toEqual({ enabled: true, visibility: 'partial', pressure: 'immortal' });
    expect(roundTripped.story.optional.plotAndTropeSettings)
      .toEqual(seed.story.optional.plotAndTropeSettings);
    expect(roundTripped.story.optional.makeItWorkInstruction)
      .toBe('The weakest bloodline is secretly the only one heaven fears.');
    expect(roundTripped.world.optional.worldIdentity).toEqual(seed.world.optional.worldIdentity);
    expect(createStorySeedCollectionExport([seed]).seeds).toHaveLength(1);

    const reviewedBlueprint = {
      ...normalizeWorldBlueprint({
        ...blueprint,
        logline: 'Creator-approved direction that must survive portability.',
        mainCharacter: {
          name: 'Ye Chen',
          age: '19',
          personality: 'Protective and ruthless',
          appearance: 'Silver eyes and a broken jade ring.',
          backgroundProfile: blueprint.mcProfile,
        },
      }, seed, { creator: 'SENSEI' }),
      // Pre-current artifacts could edit this without synchronizing the seed.
      title: 'Ashes of the Ninth Meridian — Reviewed',
    };
    const artifactExport = createStorySeedExport(seed, reviewedBlueprint);
    const [artifactRoundTrip] = parseStorySeedJson(JSON.stringify(artifactExport));
    expect(artifactRoundTrip.blueprint).toMatchObject({
      title: 'Ashes of the Ninth Meridian — Reviewed',
      logline: 'Creator-approved direction that must survive portability.',
      mainCharacter: { age: '19', appearance: 'Silver eyes and a broken jade ring.' },
    });
    expect(artifactRoundTrip.seed.world.optional.worldIdentity.title)
      .toBe('Ashes of the Ninth Meridian — Reviewed');
    const collectionExport = createStorySeedCollectionExport([
      { seed, blueprint: reviewedBlueprint },
      { seed },
    ]);
    expect(collectionExport.seeds).toHaveLength(2);
    expect(collectionExport.blueprints).toHaveLength(2);
    const collectionRoundTrip = parseStorySeedJson(JSON.stringify(collectionExport));
    expect(collectionRoundTrip[0].blueprint?.logline)
      .toBe('Creator-approved direction that must survive portability.');
    expect(collectionRoundTrip[1].blueprint).toBeUndefined();
  });

  it('imports a pre-hierarchy file through the isolated legacy adapter', () => {
    const legacy = {
      intake: {
        novelTitle: 'Ashes of the Ninth Meridian',
        mcName: 'Ye Chen',
        genrePath: 'Xianxia',
        corePremise: 'A prince must survive the seven timelines that say he dies.',
        proseStyle: 'chinese',
        storyTags: ['death flags'],
        desiredPlotDirection: 'Escalating court intrigue.',
        makeItWorkInstruction: 'Never erase the cost of changing fate.',
        worldType: 'Ancient sect world',
        startingPowerConcept: 'Qi Condensation',
        powerFlavor: 'Daoist martial arts',
        customFactions: [{ id: 'faction-1', name: 'Heavenly Sword Sect' }],
        destinedEnding: 'The prince survives.',
        // Everything below must be dropped on the way in.
        hardcoreFateMode: true,
        fatePressure: 'Hardcore',
        romanceLevel: 'Single heroine',
        dangerLevel: 'Relentless',
      },
      blueprint: { ...blueprint, title: 'Ashes of the Ninth Meridian — Reviewed Legacy Blueprint' },
    };

    const [{ seed: migrated, blueprint: migratedBlueprint }] = parseStorySeedJson(JSON.stringify(legacy));
    expect(migrated.story.required).toEqual({
      storyTags: ['death flags'],
      premise: 'A prince must survive the seven timelines that say he dies.',
      genre: 'Xianxia',
      style: 'chinese',
    });
    // General direction consolidates, while Make It Work keeps its own path.
    expect(migrated.story.optional.additionalStoryDirection)
      .toBe('Escalating court intrigue.');
    expect(migrated.story.optional.makeItWorkInstruction)
      .toBe('Never erase the cost of changing fate.');
    expect(migrated.story.optional.plotAndTropeSettings).toEqual({
      faceSlap: 'medium',
      plotArmor: 'medium',
      recognition: 'medium',
    });
    expect(migrated.world.optional.worldIdentity.title)
      .toBe('Ashes of the Ninth Meridian — Reviewed Legacy Blueprint');
    expect(migrated.world.optional.worldFoundations.mainCharacter).toEqual({ name: 'Ye Chen' });
    expect(migrated.world.optional.worldFoundations.factions?.[0].name).toBe('Heavenly Sword Sect');
    expect(migratedBlueprint).toMatchObject({
      title: 'Ashes of the Ninth Meridian — Reviewed Legacy Blueprint',
      logline: blueprint.logline,
      firstArcPromise: blueprint.firstArcPromise,
      tropeRules: blueprint.tropeRules,
      estimatedArcs: blueprint.estimatedArcs,
      majorMysteries: blueprint.majorMysteries,
      unresolvedPlotThreads: blueprint.unresolvedPlotThreads,
    });
    expect(JSON.stringify(migrated)).not.toContain('fatePressure');
    expect(JSON.stringify(migrated)).not.toContain('Relentless');
  });

  it('persists an incomplete draft and reloads it', async () => {
    const draft: StorySeedInput = {
      ...createEmptyStorySeedInput(),
      story: {
        required: { storyTags: [], premise: 'Only the premise so far.', genre: '', style: '' },
        optional: { intendedForMatureAudiences: true, fateSurvival: { enabled: false, visibility: 'partial', pressure: 'immortal' }, plotAndTropeSettings: {} },
      },
    };
    const saved = await createStorySeed('creator-1', draft, undefined, 'en');
    expect(saved.seed.story.required).toEqual({
      storyTags: [], premise: 'Only the premise so far.', genre: '', style: '',
    });

    const [reloaded] = await listStorySeeds('creator-1');
    expect(reloaded.seed.story.required.premise).toBe('Only the premise so far.');
    expect(reloaded.seed.story.optional.intendedForMatureAudiences).toBe(true);
    expect(reloaded.seed.story.optional.fateSurvival)
      .toEqual({ enabled: false, visibility: 'partial', pressure: 'immortal' });
    expect(reloaded.seed.story.optional.plotAndTropeSettings).toEqual({
      faceSlap: 'medium',
      plotArmor: 'medium',
      recognition: 'medium',
    });
    expect(reloaded.seed.world.optional).toEqual({ worldIdentity: {}, worldFoundations: {} });
  });

  it('saves, loads, and updates an account-owned record without touching the seed families', async () => {
    const seed = completeSeed();
    const created = await createStorySeed('creator-1', seed, undefined, 'en');
    expect(await listStorySeeds('creator-1')).toEqual([created]);
    expect(created.seed.story.optional.plotAndTropeSettings).toMatchObject({
      faceSlap: 'low',
      plotArmor: 'high',
      recognition: 'medium',
    });
    expect(created.seed.story.optional.makeItWorkInstruction)
      .toBe('The weakest bloodline is secretly the only one heaven fears.');
    expect(await listStorySeeds('creator-2')).toEqual([]);

    // Account metadata lives on the record, never inside creator/story/world.
    expect(Object.keys(created.seed).sort()).toEqual(['creator', 'story', 'world']);
    expect(created).toMatchObject({ id: expect.any(String), userId: 'creator-1', schemaVersion: 4 });

    const changed: StorySeedInput = {
      ...seed,
      story: { ...seed.story, required: { ...seed.story.required, premise: 'The updated required premise.' } },
    };
    const updated = await updateStorySeed('creator-1', created, changed, undefined, 'en');
    expect((await listStorySeeds('creator-1'))[0].seed.story.required.premise)
      .toBe('The updated required premise.');
    await expect(updateStorySeed('creator-2', updated, changed, undefined, 'en')).rejects.toThrow('another account');
  });

  it('round-trips an edited Blueprint as an optional sibling artifact', async () => {
    const seed = completeSeed();
    const generated = normalizeWorldBlueprint(blueprint, seed, { creator: 'SENSEI' });
    const created = await createStorySeed('creator-1', seed, generated, 'en');

    expect(created.seed).not.toHaveProperty('blueprint');
    expect((await listStorySeeds('creator-1'))[0].blueprint).toEqual(generated);

    const edited = {
      ...generated,
      logline: 'The creator-approved overall direction.',
      mainCharacter: {
        ...generated.mainCharacter!,
        age: '19',
        appearance: 'Silver eyes, weathered sect robes, and a broken jade ring.',
      },
    };
    const updated = await updateStorySeed('creator-1', created, seed, edited, 'en');
    expect((await listStorySeeds('creator-1'))[0].blueprint).toMatchObject({
      logline: 'The creator-approved overall direction.',
      mainCharacter: { age: '19', appearance: 'Silver eyes, weathered sect robes, and a broken jade ring.' },
    });

    await updateStorySeed('creator-1', updated, seed, undefined, 'en');
    expect((await listStorySeeds('creator-1'))[0].blueprint).toMatchObject({
      logline: 'The creator-approved overall direction.',
      mainCharacter: { age: '19', appearance: 'Silver eyes, weathered sect robes, and a broken jade ring.' },
    });

    const oldRecord = await createStorySeed('creator-1', seed, undefined, 'en');
    expect(oldRecord.blueprint).toBeUndefined();
    expect(() => normalizeWorldBlueprint(oldRecord.blueprint, oldRecord.seed)).not.toThrow();
    expect(createBlueprintDraftFromSeed(oldRecord.seed).blueprintVersion).toBe('v1.0');
  });

  it('omits malformed saved Blueprint siblings instead of fabricating an artifact', async () => {
    const created = await createStorySeed('creator-1', completeSeed(), undefined, 'en');
    resetStorySeedRepository([{
      ...created,
      blueprint: null,
    } as unknown as StorySeedRecord]);

    const [reloaded] = await listStorySeeds('creator-1');
    expect(reloaded.blueprint).toBeUndefined();
  });

  it('resets stale Story Seed schema records instead of reading the removed long-term goal shape', async () => {
    const created = await createStorySeed('creator-1', completeSeed(), undefined, 'en');
    resetStorySeedRepository([{ ...created, schemaVersion: 3 } as unknown as StorySeedRecord]);
    expect(await listStorySeeds('creator-1')).toEqual([]);
  });

  it('restores the Workshop repository after an injected preview adapter', async () => {
    const injectedRepository: StorySeedRepository = {
      async create() { throw new Error('Preview adapter is read-only.'); },
      async update() { throw new Error('Preview adapter is read-only.'); },
      async list() { return []; },
      async importMany() { throw new Error('Preview adapter is read-only.'); },
    };
    setStorySeedRepository(injectedRepository);
    expect(await listStorySeeds('creator-1')).toEqual([]);

    resetStorySeedRepository();
    const restored = await createStorySeed('creator-1', completeSeed(), undefined, 'en');
    expect((await listStorySeeds('creator-1')).map(record => record.id)).toEqual([restored.id]);
  });

  it('keeps the minimal administrative spine separate from Creator / Story / World', () => {
    const metadata = createStoryAdministrativeMetadata({
      storyId: 'story-1',
      creatorId: 'creator-1',
      sourceSeedId: 'seed-1',
      originalLanguage: 'en',
      now: '2026-08-01T00:00:00.000Z',
    });

    expect(metadata).toEqual({
      storyId: 'story-1',
      creatorId: 'creator-1',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      schemaVersion: 2,
      contentVersion: 1,
      storyStatus: 'DRAFT',
      generationStatus: 'QUEUED',
      visibility: 'PRIVATE',
      publishingState: 'UNPUBLISHED',
      originalLanguage: 'en',
      sourceSeedId: 'seed-1',
      currentChapterId: null,
      coverAssetId: null,
    });
    expect(validateStoryAdministrativeMetadata(metadata)).toEqual({ valid: true, errors: [] });
    expect(completeSeed()).not.toHaveProperty('administrative');
  });

  it('records the selected Original Language instead of hardcoding English', () => {
    const metadata = createStoryAdministrativeMetadata({
      storyId: 'story-1',
      creatorId: 'creator-1',
      sourceSeedId: 'seed-1',
      originalLanguage: 'ja',
    });

    expect(metadata.originalLanguage).toBe('ja');
    expect(validateStoryAdministrativeMetadata(metadata)).toEqual({ valid: true, errors: [] });
    // Reader display language is not story identity and has no field here.
    expect(metadata).not.toHaveProperty('currentLanguage');
  });

  it('resolves a concrete English value when Story Seed supplies no language', () => {
    const metadata = createStoryAdministrativeMetadata({
      storyId: 'story-1',
      creatorId: 'creator-1',
      sourceSeedId: 'seed-1',
    });

    expect(metadata.originalLanguage).toBe('en');
  });

  it('rejects administrative metadata carrying an unsupported or stale language value', () => {
    const stale = { ...administrative(), originalLanguage: 'English' };
    const result = validateStoryAdministrativeMetadata(stale);

    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('originalLanguage');
  });

  it('rejects administrative metadata saved at an earlier schema version', () => {
    const stale = { ...administrative(), schemaVersion: 1 };

    expect(validateStoryAdministrativeMetadata(stale).valid).toBe(false);
  });

  it('carries the resolved Original Language through the story-start payload', () => {
    const payload = buildInitialStoryGenerationPayload(
      completeSeed(),
      createStoryAdministrativeMetadata({
        storyId: 'story-1',
        creatorId: 'creator-1',
        sourceSeedId: 'seed-1',
        originalLanguage: 'ko',
      }),
      blueprint,
      10,
    );

    expect(payload.administrative.originalLanguage).toBe('ko');
    // Original Language is system-owned; it never enters creative seed content.
    expect(JSON.stringify(payload.storySeed)).not.toContain('originalLanguage');
  });

  it('hands generation payload builders the canonical structure', () => {
    const seed = completeSeed();
    const blueprintRequest = buildBlueprintGenerationPayload(seed);
    const storyRequest = buildInitialStoryGenerationPayload(seed, administrative(), blueprint, 10);

    for (const request of [blueprintRequest, storyRequest]) {
      expect(Object.keys(request.storySeed).sort()).toEqual(['creator', 'story', 'world']);
      expect(request.storySeed.story.required.storyTags).toEqual(['death flags', 'foreknowledge']);
      expect(request.storySeed.story.optional.intendedForMatureAudiences).toBe(true);
      expect(request.storySeed.story.optional.plotAndTropeSettings).toMatchObject({
        faceSlap: 'low',
        plotArmor: 'high',
        recognition: 'medium',
      });
      expect(request.storySeed.story.optional.makeItWorkInstruction)
        .toBe('The weakest bloodline is secretly the only one heaven fears.');
      expect(request.storySeed).not.toHaveProperty('intake');
      expect(request.storySeed).not.toHaveProperty('administrative');
    }
    expect(storyRequest).toMatchObject({
      chapterCount: 10,
      administrative: { storyId: 'story-1', creatorId: 'creator-1', sourceSeedId: 'seed-1' },
    });
  });
});
