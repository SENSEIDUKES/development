import { describe, expect, it, vi } from "vitest";
import { type StorySeedInput } from '@seihouse/sen/story-seed';
import { createStorySeedExport, parseStorySeedJson, STORY_SEED_SCHEMA_VERSION } from "@seihouse/sen/story-seed";
import { type WorldBlueprint } from '@seihouse/sen/story-seed';
import { createHarnessFoundationFromStorySeed } from "../../workshop/previews/harness-generation/storySeedHandoff";
import { handleStorySeedBlueprintHttp } from "./http";
import { resolveStorySeedBlueprintConfig } from "./config";
import { BlueprintOutputLimitError, arcRoadmapExtensionArcLimit, blueprintRoadmapArcLimit } from "./generate";
import type {
  WorldBlueprintModelProvider,
  WorldBlueprintModelRequest,
} from "./generate";

const environment = {
  GEMINI_API_KEY: "server-only-gemini-key",
  STORY_SEED_BLUEPRINT_ACCESS_TOKEN: "development-access-token",
  STORY_SEED_BLUEPRINT_MODEL: "google/gemini-test",
};

const canonicalSeed = (): StorySeedInput => ({
  creator: {},
  story: {
    required: {
      storyTags: ["court intrigue", "fate survival", "mystery"],
      premise: "A banished prince remembers the seven hearings in which the empire fell.",
      genre: "Xianxia political mystery",
      style: "chinese",
    },
    optional: {
      intendedForMatureAudiences: true,
      fateSurvival: { enabled: true, visibility: "partial", pressure: "heaven" },
      funSettings: {
        faceSlap: "low",
        plotArmor: "medium",
        recognition: "high",
      },
      makeItWorkInstruction: "The prince's laziness is a disciplined defense against prophetic surveillance.",
    },
  },
  world: {
    required: {},
    optional: {
      worldIdentity: {
        title: "The Seventh Oath",
        worldType: "A cultivation empire suspended beneath a dead, oath-recording heaven.",
        societyStructure: "Nine imperial clans share power with witness sects.",
        startingLocation: "The rain court beneath Vermilion Palace.",
      },
      worldFoundations: {
        mainCharacter: {
          name: "Jin Rui",
          startingIdentity: "Banished seventh prince",
          personality: "Measured, observant, and protective beneath studied indifference",
          mainFlaw: "He withholds trust until it becomes dangerous.",
          secretAdvantage: "Memories of seven failed succession hearings",
          startingWeakness: "A shattered oath meridian",
          moralAlignment: "Pragmatic compassion",
          bio: "Raised as a disposable imperial witness before his exile.",
        },
        additionalCharacters: [{
          id: "seed-character-minister-sui",
          name: "Minister Sui",
          aliases: ["The Rain Witness"],
          age: "52",
          skinTone: "warm brown",
          eyeColor: "silver",
          powerType: "oath sight",
          rankLevel: "Seal Heart",
          role: "reluctant witness",
          connectionToMC: "former tutor",
          bio: "The only minister whose testimony changed between timelines.",
        }],
        factions: [{
          id: "seed-faction-tribunal",
          name: "Vermilion Tribunal",
          aliases: ["The Nine Seats"],
          role: "succession court",
          powerLevel: "imperial",
          alignment: "lawful divided",
          connectionToMC: "judges his claim",
          description: "Nine seats bound by visible blood oaths.",
        }],
        abilities: {
          startingPowerConcept: "Oath-sight",
          uniquePath: "Read fractures left by promises broken in other timelines",
        },
        powerSystem: {
          flavor: "Cultivation through witnessed promises and their consequences",
          knownRanks: "Oath Spark → Seal Heart → Crown Soul",
        },
        destinedEnding: "Jin Rui must accept or destroy the seventh crown.",
      },
    },
  },
});

const generatedBlueprint = (): Record<string, unknown> & { arcPlans?: unknown[] } => ({
  title: "Gemini Tried To Rename It",
  logline: "Gemini tried to replace the creator's direction.",
  worldOverview: "A different world.",
  startingLocation: "A different opening city.",
  societyStructure: "A different social order.",
  powerSystemOutline: "Oaths harden into meridians and broken vows become weapons.",
  mainCharacter: {
    name: "Wrong Name",
    age: "Twenty-three",
    personality: "Wrong personality",
    appearance: "Black court robes stitched with a severed seventh sun.",
    backgroundProfile: "A survivor of repeated imperial collapses.",
  },
  mcProfile: "A survivor of repeated imperial collapses.",
  majorFactions: [
    "The Vermilion Tribunal (Nine Seats) — a completely contradictory generated description",
    "Regent's Bronze Guard — the palace's private army",
  ],
  initialCharacters: [
    "The witness Minister Sui (Rain Witness) — a contradictory generated description",
    "Regent Zhao — the architect of the hearing",
  ],
  majorMysteries: ["Who taught the dead heaven to remember broken oaths?"],
  arcPlans: [
    { arcNumber: 1, goals: [{ id: "arc-1-hearing", text: "Survive the hearing.", chapters: 40 }, { id: "arc-1-regent", text: "Expose the regent's forged decree.", chapters: 60 }] },
    { arcNumber: 2, goals: [{ id: "arc-2-tribunal", text: "Win a seat on the Vermilion Tribunal.", chapters: 100 }] },
    { arcNumber: 3, goals: [{ id: "arc-3-oath", text: "Break the seventh oath.", chapters: 50 }, { id: "arc-3-ending", text: "Fulfil the Destined Ending.", chapters: 50 }] },
  ],
  firstArcPromise: "A different first conflict.",
  tropeRules: "Foreknowledge creates costly choices rather than automatic victories.",
  styleBible: "Restrained court tension, exact ritual detail, and sudden spectacle.",
  destinedEnding: "A different ending.",
  estimatedArcs: 3,
  unresolvedPlotThreads: ["The regent recognizes a gesture from another timeline."],
});

class RecordingProvider implements WorldBlueprintModelProvider {
  readonly requests: WorldBlueprintModelRequest[] = [];

  constructor(private readonly output: unknown = generatedBlueprint()) {}

  async generate(request: WorldBlueprintModelRequest): Promise<unknown> {
    this.requests.push(request);
    return structuredClone(this.output);
  }
}

const manifest = async (provider: RecordingProvider) => handleStorySeedBlueprintHttp({
  method: "POST",
  headers: { Authorization: "Bearer development-access-token" },
  body: { storySeed: canonicalSeed() },
}, {
  environment,
  providerFactory: () => provider,
});

describe("protected Story Seed World Blueprint generation", () => {
  it('requests a complete arc roadmap toward the ending and retains author-owned Hard Pins, Fun Settings and the opening goal', async () => {
    const seed = canonicalSeed();
    seed.story.optional.hardPins = [{ text: 'Keep the master alive.' }];
    seed.story.optional.activeArcGoal = { id: 'arc-1-author', text: 'Reach the hearing.', chapters: 100 };
    const provider = new RecordingProvider({ ...generatedBlueprint(), hardPins: [{ text: 'Unwanted model goal.' }], funSettings: { faceSlap: 'high' } });
    const response = await handleStorySeedBlueprintHttp({ method: 'POST', headers: { Authorization: 'Bearer development-access-token' }, body: { storySeed: seed } }, { environment, providerFactory: () => provider });
    expect(response.status).toBe(200);
    const blueprint = response.body as WorldBlueprint;
    expect(blueprint.hardPins).toEqual(seed.story.optional.hardPins);
    expect(blueprint.funSettings).toEqual(seed.story.optional.funSettings);
    // Every arc is saved; Arc 1 opens with the creator's own goal, allocations and later goals intact.
    expect(blueprint.estimatedArcs).toBe(3);
    expect(blueprint.arcPlans?.map(plan => plan.arcNumber)).toEqual([1, 2, 3]);
    expect(blueprint.arcPlans?.[0].goals).toEqual([
      { id: 'arc-1-hearing', text: 'Reach the hearing.', chapters: 40 },
      { id: 'arc-1-regent', text: "Expose the regent's forged decree.", chapters: 60 },
    ]);
    const schema = provider.requests[0].responseJsonSchema;
    expect(schema.required).toContain('arcPlans');
    expect(schema.properties.arcPlans.items.properties.goals).toMatchObject({ minItems: 1, maxItems: 5 });
    // The default 8,192-token budget bounds the arc count instead of truncating the roadmap.
    expect(blueprintRoadmapArcLimit(8_192)).toBe(14);
    expect(schema.properties.estimatedArcs.maximum).toBe(14);
    expect(schema.properties.arcPlans.maxItems).toBe(14);
    expect(provider.requests[0].userPrompt).toContain('final arc\'s final goal is the story reaching its Destined Ending');
    expect(provider.requests[0].userPrompt).toContain('use its text verbatim as Arc 1\'s first goal');
    expect(provider.requests[0].userPrompt).not.toMatch(/firstMajorConflict|additionalStoryDirection|plotAndTropeSettings/);
  });

  it('fails loudly instead of shortening a roadmap that plans fewer arcs than it counts', async () => {
    const provider = new RecordingProvider({ ...generatedBlueprint(), arcPlans: generatedBlueprint().arcPlans!.slice(0, 2) } as Record<string, unknown>);
    const response = await manifest(provider);
    expect(response.status).toBe(502);
    expect((response.body as { error: string }).error).toContain('planned 2 of its 3 arcs. Nothing was shortened or saved');
  });

  it('reports the model output limit when the roadmap is cut off', async () => {
    const provider: RecordingProvider = Object.assign(new RecordingProvider(), {
      generate: async () => { throw new BlueprintOutputLimitError(8_192); },
    });
    const response = await manifest(provider);
    expect(response.status).toBe(502);
    expect((response.body as { error: string }).error).toContain("8,192-token output limit before its arc roadmap was complete");
    expect(blueprintRoadmapArcLimit(32_768)).toBe(100);
  });

  it.each([false, true])("accepts empty Fate Survival arrays when enabled=%s", async enabled => {
    const seed = canonicalSeed();
    seed.story.optional.fateSurvival.enabled = enabled;
    const provider = new RecordingProvider({ ...generatedBlueprint(), majorMysteries: [], unresolvedPlotThreads: [] });
    const response = await handleStorySeedBlueprintHttp({
      method: 'POST', headers: { Authorization: 'Bearer development-access-token' }, body: { storySeed: seed },
    }, { environment, providerFactory: () => provider });
    expect(response.status).toBe(200);
    expect(provider.requests[0].responseJsonSchema.properties.majorMysteries).not.toHaveProperty('minItems');
    expect(provider.requests[0].responseJsonSchema.properties.unresolvedPlotThreads).not.toHaveProperty('minItems');
    expect(provider.requests[0].userPrompt).toContain(enabled
      ? 'You may create majorMysteries and unresolvedPlotThreads for the Fate Survival experience.'
      : 'Return empty arrays for majorMysteries and unresolvedPlotThreads.');
    expect(JSON.stringify(response.body)).toContain('"majorMysteries":[]');
    expect(JSON.stringify(response.body)).toContain('"unresolvedPlotThreads":[]');
  });

  it("sends the complete canonical seed and preserves creator-authored canon", async () => {
    const provider = new RecordingProvider();
    const response = await manifest(provider);

    expect(response.status).toBe(200);
    expect(provider.requests).toHaveLength(1);
    const request = provider.requests[0];
    expect(request.responseJsonSchema.required).toContain("mainCharacter");
    expect(request.userPrompt).toContain(canonicalSeed().story.required.premise);
    expect(request.userPrompt).toContain(canonicalSeed().story.optional.makeItWorkInstruction!);
    expect(request.userPrompt).toContain(canonicalSeed().world.optional.worldFoundations.destinedEnding!);
    expect(request.userPrompt).toContain('"fateSurvival"');
    expect(request.userPrompt).toContain('"faceSlap": "low"');
    expect(request.userPrompt).toContain('"recognition": "high"');
    expect(request.userPrompt).toContain("Minister Sui");
    expect(request.userPrompt).toContain("Vermilion Tribunal");
    expect(request.userPrompt).toContain("Oath Spark → Seal Heart → Crown Soul");

    const blueprint = response.body as WorldBlueprint;
    const seed = canonicalSeed();
    expect(blueprint.blueprintVersion).toBe("v1.0");
    expect(blueprint.originSnapshot).toEqual(seed.story.required);
    expect(blueprint.title).toBe(seed.world.optional.worldIdentity.title);
    expect(blueprint.logline).toBe(generatedBlueprint().logline);
    expect(blueprint.worldOverview).toBe(seed.world.optional.worldIdentity.worldType);
    expect(blueprint.startingLocation).toBe(seed.world.optional.worldIdentity.startingLocation);
    expect(blueprint.societyStructure).toBe(seed.world.optional.worldIdentity.societyStructure);
    expect(blueprint.mainCharacter).toMatchObject({
      name: "Jin Rui",
      age: "Twenty-three",
      personality: seed.world.optional.worldFoundations.mainCharacter?.personality,
      appearance: "Black court robes stitched with a severed seventh sun.",
    });
    // Structured Seed details stay in their Seed fields, never copied into Blueprint prose.
    expect(blueprint.mcProfile).toBe((generatedBlueprint().mainCharacter as WorldBlueprint["mainCharacter"])?.backgroundProfile);
    expect(blueprint.mcProfile).not.toContain("Secret advantage:");
    expect(blueprint.powerSystemOutline).toBe(generatedBlueprint().powerSystemOutline);
    expect(blueprint.initialCharacters[0]).toContain("Minister Sui");
    expect(blueprint.initialCharacters[0]).toContain("age: 52");
    expect(blueprint.initialCharacters.filter(entry => entry.toLocaleLowerCase().includes("minister sui")))
      .toHaveLength(1);
    expect(blueprint.initialCharacters).toContain("Regent Zhao — the architect of the hearing");
    expect(blueprint.majorFactions[0]).toContain("Vermilion Tribunal");
    expect(blueprint.majorFactions[0]).toContain("Nine seats bound by visible blood oaths.");
    expect(blueprint.majorFactions.filter(entry => entry.toLocaleLowerCase().includes("vermilion tribunal")))
      .toHaveLength(1);
    expect(blueprint.majorFactions).toContain("Regent's Bronze Guard — the palace's private army");
    expect(blueprint.firstArcPromise).toBe(generatedBlueprint().firstArcPromise);
    expect(blueprint.destinedEnding).toBe(seed.world.optional.worldFoundations.destinedEnding);
  });

  it("requires the Development token without exposing server secrets", async () => {
    const providerFactory = vi.fn(() => new RecordingProvider());
    const info = await handleStorySeedBlueprintHttp({ method: "GET" }, {
      environment,
      providerFactory,
    });
    const missing = await handleStorySeedBlueprintHttp({
      method: "POST",
      body: { storySeed: canonicalSeed() },
    }, { environment, providerFactory });
    const wrong = await handleStorySeedBlueprintHttp({
      method: "POST",
      headers: { Authorization: "Bearer wrong-token" },
      body: { storySeed: canonicalSeed() },
    }, { environment, providerFactory });

    expect(info.status).toBe(200);
    expect(info.body).toMatchObject({ provider: "gemini", configured: true, model: "google/gemini-test" });
    expect(JSON.stringify(info.body)).not.toContain(environment.GEMINI_API_KEY);
    expect(JSON.stringify(info.body)).not.toContain(environment.STORY_SEED_BLUEPRINT_ACCESS_TOKEN);
    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(providerFactory).not.toHaveBeenCalled();
  });

  it("rejects an incomplete model result instead of normalizing it into false success", async () => {
    const onError = vi.fn();
    const provider = new RecordingProvider({
      title: "Partial",
      logline: "",
      majorFactions: [],
      initialCharacters: [],
      majorMysteries: [],
      unresolvedPlotThreads: [],
      estimatedArcs: 0,
    });
    const response = await handleStorySeedBlueprintHttp({
      method: "POST",
      headers: { Authorization: "Bearer development-access-token" },
      body: { storySeed: canonicalSeed() },
    }, {
      environment,
      providerFactory: () => provider,
      onError,
    });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: "Gemini could not produce a complete World Blueprint. No Story Seed data was changed; please retry.",
    });
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toEqual(new Error(
      "Gemini returned an incomplete World Blueprint: logline, firstArcPromise, tropeRules, styleBible, "
      + "mainCharacter.age, mainCharacter.appearance.",
    ));
  });

  it("rejects an invalid configured model before calling the provider", async () => {
    const onError = vi.fn();
    const providerFactory = vi.fn(() => new RecordingProvider());
    const response = await handleStorySeedBlueprintHttp({
      method: "POST",
      headers: { Authorization: "Bearer development-access-token" },
      body: { storySeed: canonicalSeed() },
    }, {
      environment: { ...environment, STORY_SEED_BLUEPRINT_MODEL: "gpt-4o" },
      providerFactory,
      onError,
    });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: "World Blueprint model configuration is invalid." });
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toEqual(new Error(
      "STORY_SEED_BLUEPRINT_MODEL does not contain a valid text model.",
    ));
    expect(providerFactory).not.toHaveBeenCalled();
  });

  it("defaults blank numeric settings, preserves zero, and caps output tokens", () => {
    expect(resolveStorySeedBlueprintConfig({
      STORY_SEED_BLUEPRINT_TEMPERATURE: "   ",
      STORY_SEED_BLUEPRINT_MAX_OUTPUT_TOKENS: "99999999",
    })).toMatchObject({ temperature: 1, maxOutputTokens: 32_768 });
    expect(resolveStorySeedBlueprintConfig({
      STORY_SEED_BLUEPRINT_TEMPERATURE: "0",
    }).temperature).toBe(0);
  });

  it("exports a paired artifact that loads through the HARNESS handoff with no fixture fallback", async () => {
    const response = await manifest(new RecordingProvider());
    expect(response.status).toBe(200);
    const exported = createStorySeedExport(canonicalSeed(), response.body as WorldBlueprint);
    const [uploaded] = parseStorySeedJson(JSON.stringify(exported), { normalizeBlueprint: false });

    const blueprint = uploaded.blueprint as WorldBlueprint;
    const foundation = createHarnessFoundationFromStorySeed({
      id: "exported-seed", userId: "author", createdAt: "2026-09-23T00:00:00.000Z", updatedAt: "2026-09-23T00:00:00.000Z",
      schemaVersion: STORY_SEED_SCHEMA_VERSION, title: blueprint.title, originalLanguage: "en",
      seed: uploaded.seed, blueprint,
    });

    expect(foundation.title).toBe("The Seventh Oath");
    expect(foundation.sourceSnapshot?.seed).toEqual(uploaded.seed);
    const minister = foundation.identities?.filter(identity => identity.name === "Minister Sui");
    expect(minister).toHaveLength(1);
    expect(minister?.[0].evidence).toContain("former tutor");
    expect(minister?.[0].evidence).toContain("The only minister whose testimony changed between timelines.");
    expect(JSON.stringify(foundation)).not.toContain("workshop-fixture");
  });
});

const post = (body: Record<string, unknown>, provider: WorldBlueprintModelProvider, overrides: Record<string, string> = {}) => handleStorySeedBlueprintHttp({
  method: "POST",
  headers: { Authorization: "Bearer development-access-token" },
  body,
}, { environment: { ...environment, ...overrides }, providerFactory: () => provider });

const errorOf = (response: { body: unknown }) => (response.body as { error: string }).error;

describe("Blueprint arc count and added arcs", () => {
  it("regenerates with the arc count the author chose, as an exact schema and prompt instruction", async () => {
    const provider = new RecordingProvider();
    const response = await post({ storySeed: canonicalSeed(), arcCount: 3 }, provider);
    expect(response.status).toBe(200);
    expect((response.body as WorldBlueprint).arcPlans).toHaveLength(3);
    const schema = provider.requests[0].responseJsonSchema;
    expect(schema.properties.estimatedArcs).toMatchObject({ minimum: 3, maximum: 3 });
    expect(schema.properties.arcPlans).toMatchObject({ minItems: 3, maxItems: 3 });
    expect(provider.requests[0].userPrompt).toContain("The author chose the story's length: estimatedArcs is exactly 3.");
    expect(provider.requests[0].userPrompt).not.toContain("a realistic estimatedArcs");
  });

  it("refuses a chosen arc count the output budget cannot hold, before calling the model", async () => {
    const provider = new RecordingProvider();
    const response = await post({ storySeed: canonicalSeed(), arcCount: 20 }, provider);
    expect(response.status).toBe(400);
    expect(errorOf(response)).toContain("at most 14 arcs within the model's 8,192-token output limit, and 20 were requested. Nothing was generated.");
    expect(provider.requests).toHaveLength(0);
    expect(errorOf(await post({ storySeed: canonicalSeed(), arcCount: 2.5 }, provider))).toContain("whole number from 1 to 100");
  });

  it("fails loudly when the model plans a different length than the author chose", async () => {
    const response = await post({ storySeed: canonicalSeed(), arcCount: 4 }, new RecordingProvider());
    expect(response.status).toBe(502);
    expect(errorOf(response)).toContain("planned 3 arcs instead of the 4 requested. Nothing was shortened or saved");
  });

  const reviewed = async () => (await manifest(new RecordingProvider())).body as WorldBlueprint;
  const addedArcs = (...ids: string[][]) => ({ arcPlans: ids.map((goalIds, index) => ({
    arcNumber: 3 + index,
    goals: goalIds.map((id, goalIndex) => ({ id, text: `New goal ${id}.`, chapters: goalIndex ? 1 : 101 - goalIds.length })),
  })) });

  it("plans only the new arcs, with the saved roadmap as context, and returns them numbered before the final arc", async () => {
    const blueprint = await reviewed();
    // The model reuses a saved goal identity; the new goal is given a unique one.
    const provider = new RecordingProvider(addedArcs(["arc-3-oath", "arc-3-siege"], ["arc-4-return"]));
    const response = await post({ operation: "extend-arc-roadmap", storySeed: canonicalSeed(), blueprint, arcCount: 5 }, provider);
    expect(response.status).toBe(200);
    const added = (response.body as { addedArcPlans: Array<{ arcNumber: number; goals: Array<{ id: string }> }> }).addedArcPlans;
    expect(added.map(plan => plan.arcNumber)).toEqual([3, 4]);
    expect(added[0].goals.map(goal => goal.id)).toEqual(["arc-3-oath-2", "arc-3-siege"]);
    const request = provider.requests[0];
    expect(request.systemInstruction).toContain("plan only the new arcs the author asked for, and never restate, rewrite, renumber, or contradict a saved arc");
    expect(request.userPrompt).toContain("from 3 to 5 arcs. Plan only the 2 new arcs.");
    expect(request.userPrompt).toContain("between Arc 2 and the final arc");
    expect(request.userPrompt).toContain("the current final arc becomes Arc 5 and keeps its goals unchanged");
    expect(request.userPrompt).toContain("[arc-2-tribunal] Win a seat on the Vermilion Tribunal. (100 chapters)");
    expect(request.userPrompt).toContain("Arc 3 (final arc; reaches the Destined Ending):");
    expect(request.userPrompt).toContain("lead into the final arc's first goal, \"Break the seventh oath.\"");
    expect(request.userPrompt).toContain("Destined Ending (the fixed destination): Jin Rui must accept or destroy the seventh crown.");
    const schema = request.responseJsonSchema as unknown as { required: string[]; properties: { arcPlans: { minItems: number; maxItems: number } } };
    expect(schema.required).toEqual(["arcPlans"]);
    expect(schema.properties.arcPlans).toMatchObject({ minItems: 2, maxItems: 2 });
  });

  it("adds nothing when the model plans the wrong number of arcs or invalid ones", async () => {
    const blueprint = await reviewed();
    const short = await post({ operation: "extend-arc-roadmap", storySeed: canonicalSeed(), blueprint, arcCount: 5 }, new RecordingProvider(addedArcs(["arc-3-only"])));
    expect(short.status).toBe(502);
    expect(errorOf(short)).toBe("The model planned 1 of the 2 new arcs. Nothing was added; try again.");
    const invalid = await post({ operation: "extend-arc-roadmap", storySeed: canonicalSeed(), blueprint, arcCount: 4 }, new RecordingProvider({ arcPlans: [{ arcNumber: 3, goals: [{ id: "arc-3-short", text: "Too short.", chapters: 40 }] }] }));
    expect(invalid.status).toBe(502);
    expect(errorOf(invalid)).toContain("The new arcs are invalid: Goal allocations must total 100 chapters. Nothing was added");
  });

  it("refuses requests that would re-plan a saved arc or exceed one call's budget, without calling the model", async () => {
    const blueprint = await reviewed();
    const provider = new RecordingProvider(addedArcs(["unused"]));
    const oneArc = { ...blueprint, estimatedArcs: 1, arcPlans: blueprint.arcPlans!.slice(0, 1) };
    const single = await post({ operation: "extend-arc-roadmap", storySeed: canonicalSeed(), blueprint: oneArc, arcCount: 3 }, provider);
    expect(single.status).toBe(400);
    expect(errorOf(single)).toContain("plans the whole story as one arc");
    const notLonger = await post({ operation: "extend-arc-roadmap", storySeed: canonicalSeed(), blueprint, arcCount: 3 }, provider);
    expect(notLonger.status).toBe(400);
    expect(errorOf(notLonger)).toContain("already plans 3 arcs");
    const tooMany = await post({ operation: "extend-arc-roadmap", storySeed: canonicalSeed(), blueprint, arcCount: 18 }, provider, { STORY_SEED_BLUEPRINT_MAX_OUTPUT_TOKENS: "4096" });
    expect(tooMany.status).toBe(400);
    expect(errorOf(tooMany)).toContain("One request can add at most 14 arcs within the model's 4,096-token output limit, and 15 were requested. Nothing was generated.");
    expect(provider.requests).toHaveLength(0);
    expect(arcRoadmapExtensionArcLimit(8_192)).toBe(30);
    expect(errorOf(await post({ operation: "rewrite-everything", storySeed: canonicalSeed() }, provider))).toBe("Unknown Blueprint operation.");
  });
});
