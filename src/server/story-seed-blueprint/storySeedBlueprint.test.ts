import { describe, expect, it, vi } from "vitest";
import { type StorySeedInput } from '@seihouse/sen/story-seed';
import { createStorySeedExport, fillBlankSeedSlots, parseStorySeedJson, STORY_SEED_SCHEMA_VERSION, type GeneratedWorldBlueprint } from "@seihouse/sen/story-seed";
import { type WorldBlueprint } from '@seihouse/sen/story-seed';
import { createHarnessFoundationFromStorySeed } from "../../workshop/previews/harness-generation/storySeedHandoff";
import { handleStorySeedBlueprintHttp } from "./http";
import { resolveStorySeedBlueprintConfig } from "./config";
import { BlueprintOutputLimitError } from "./generate";
import { ModelRouterError } from "@seihouse/library/model-router-server";
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
      fateSurvival: { enabled: true, pressure: "heaven" },
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

const generatedBlueprint = (): Record<string, unknown> & { arcOne?: unknown; arcLookahead?: unknown[] } => ({
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
    startingIdentity: "A contradictory identity",
    secretAdvantage: "A contradictory advantage",
    startingWeakness: "A contradictory weakness",
    mainFlaw: "A contradictory flaw",
    moralAlignment: "A contradictory alignment",
    bio: "A contradictory bio",
  },
  // The creator's own cards come back by name with contradictions the Seed never takes; the new ones fill out the cast.
  characters: [
    { name: "The witness Minister Sui", role: "contradictory role", age: "99", skinTone: "contradictory", eyeColor: "contradictory", powerType: "contradictory", rankLevel: "contradictory", connectionToMC: "contradictory", bio: "A contradictory generated description" },
    { name: "Regent Zhao", role: "antagonist", age: "Sixty", skinTone: "Ivory", eyeColor: "Black", powerType: "Decree craft", rankLevel: "Crown Soul", connectionToMC: "Architect of the hearing", bio: "The architect of the hearing." },
  ],
  factions: [
    { name: "The Vermilion Tribunal", role: "contradictory", powerLevel: "contradictory", alignment: "contradictory", connectionToMC: "contradictory", description: "A completely contradictory generated description" },
    { name: "Regent's Bronze Guard", role: "palace army", powerLevel: "regional", alignment: "loyal to the regent", connectionToMC: "guards his hearing", description: "The palace's private army." },
  ],
  abilities: { startingPowerConcept: "contradictory", uniquePath: "contradictory" },
  powerSystem: { flavor: "contradictory", knownRanks: "contradictory" },
  mainOpposition: "Regent Zhao and the forged succession decree",
  // Arc 1's goals only; the server gives them their identities.
  arcOne: { goals: [{ text: "Survive the hearing.", chapters: 12 }, { text: "Expose the regent's forged decree.", chapters: 18 }] },
  arcLookahead: [
    { arcNumber: 2, direction: "LOOKAHEAD_A2 Win a seat on the Vermilion Tribunal." },
    { arcNumber: 3, direction: "LOOKAHEAD_A3 Break the seventh oath and reach the crown." },
  ],
  firstArcPromise: "A different first conflict.",
  tropeRules: "Foreknowledge creates costly choices rather than automatic victories.",
  styleBible: "Restrained court tension, exact ritual detail, and sudden spectacle.",
  destinedEnding: "A different ending.",
  estimatedArcs: 12,
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
  it('plans only Arc 1 with a hidden look-ahead, and retains author-owned Hard Pins, Fun Settings and the opening goal', async () => {
    const seed = canonicalSeed();
    seed.story.optional.hardPins = [{ text: 'Keep the master alive.' }];
    seed.story.optional.activeArcGoal = { id: 'arc-1-author', text: 'Reach the hearing.', chapters: 30 };
    const provider = new RecordingProvider({ ...generatedBlueprint(), hardPins: [{ text: 'Unwanted model goal.' }], funSettings: { faceSlap: 'high' } });
    const response = await handleStorySeedBlueprintHttp({ method: 'POST', headers: { Authorization: 'Bearer development-access-token' }, body: { storySeed: seed } }, { environment, providerFactory: () => provider });
    expect(response.status).toBe(200);
    const blueprint = response.body as WorldBlueprint;
    expect(blueprint.hardPins).toEqual(seed.story.optional.hardPins);
    expect(blueprint.funSettings).toEqual(seed.story.optional.funSettings);
    // Only Arc 1 is saved; it opens with the creator's own goal, and the server assigns its identities.
    expect(blueprint.estimatedArcs).toBe(12);
    expect(blueprint.arcPlans).toEqual([{ arcNumber: 1, goals: [
      { id: 'arc-1-1', text: 'Reach the hearing.', chapters: 12 },
      { id: 'arc-1-2', text: "Expose the regent's forged decree.", chapters: 18 },
    ] }]);
    expect(blueprint.arcLookahead?.map(entry => entry.arcNumber)).toEqual([2, 3]);
    const schema = provider.requests[0].responseJsonSchema;
    expect(schema.required).toEqual(expect.arrayContaining(['arcOne', 'arcLookahead', 'estimatedArcs']));
    expect(schema.required).not.toContain('arcPlans');
    expect(schema.properties.arcOne.properties.goals).toMatchObject({ minItems: 1, maxItems: 5 });
    expect(JSON.stringify(schema.properties.arcOne)).not.toContain('"id"');
    expect(schema.properties.arcLookahead.maxItems).toBe(2);
    // The story's length is no longer bounded by how many arcs one answer can hold.
    expect(schema.properties.estimatedArcs).toMatchObject({ minimum: 10, maximum: 40 });
    const prompt = provider.requests[0].userPrompt;
    expect(prompt).toContain('Plan only Arc 1, in arcOne');
    expect(prompt).toContain('Every later arc is planned when the story reaches it');
    expect(prompt).toContain('Write arcLookahead: private direction for the arcs after Arc 1');
    expect(prompt).toContain('use its text verbatim as Arc 1\'s first goal');
    expect(prompt).not.toMatch(/firstMajorConflict|additionalStoryDirection|plotAndTropeSettings|arcPlans/);
  });

  it('fails loudly instead of padding an Arc 1 that does not fill its thirty chapters', async () => {
    const provider = new RecordingProvider({ ...generatedBlueprint(), arcOne: { goals: [{ text: 'Survive the hearing.', chapters: 12 }] } });
    const response = await manifest(provider);
    expect(response.status).toBe(502);
    expect((response.body as { error: string }).error).toBe('The generated Arc 1 is invalid: Goal allocations must total 30 chapters. Nothing was saved; generate again.');
  });

  it('reports the model output limit when the answer is cut off', async () => {
    const provider: RecordingProvider = Object.assign(new RecordingProvider(), {
      generate: async () => { throw new BlueprintOutputLimitError(8_192); },
    });
    const response = await manifest(provider);
    expect(response.status).toBe(502);
    expect((response.body as { error: string }).error).toContain("8,192-token output limit before it was complete");
  });

  it.each([false, true])("never asks for Fate Survival mysteries or threads when Survival is %s", async enabled => {
    const seed = canonicalSeed();
    seed.story.optional.fateSurvival.enabled = enabled;
    // A model that still volunteers the retired lists has them dropped.
    const provider = new RecordingProvider({ ...generatedBlueprint(), majorMysteries: ["A volunteered mystery"], unresolvedPlotThreads: ["A volunteered thread"] } as ReturnType<typeof generatedBlueprint>);
    const response = await handleStorySeedBlueprintHttp({
      method: 'POST', headers: { Authorization: 'Bearer development-access-token' }, body: { storySeed: seed },
    }, { environment, providerFactory: () => provider });
    expect(response.status).toBe(200);
    expect(Object.keys(provider.requests[0].responseJsonSchema.properties)).not.toContain('majorMysteries');
    expect(Object.keys(provider.requests[0].responseJsonSchema.properties)).not.toContain('unresolvedPlotThreads');
    expect(provider.requests[0].userPrompt).not.toMatch(/majorMysteries|unresolvedPlotThreads/);
    expect(JSON.stringify(response.body)).not.toMatch(/majorMysteries|unresolvedPlotThreads|volunteered/);
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
    // The cast lists show the cast the Seed will hold: the creator's cards exactly, then the new ones.
    expect(blueprint.initialCharacters[0]).toContain("Minister Sui");
    expect(blueprint.initialCharacters[0]).toContain("age: 52");
    expect(blueprint.initialCharacters.join("\n")).not.toContain("contradictory");
    expect(blueprint.initialCharacters.filter(entry => entry.toLocaleLowerCase().includes("minister sui"))).toHaveLength(1);
    expect(blueprint.initialCharacters[1]).toBe("Regent Zhao — age: Sixty; skin tone: Ivory; eyes: Black; role: antagonist; connection to main character: Architect of the hearing; power: Decree craft; rank: Crown Soul; profile: The architect of the hearing.");
    expect(blueprint.majorFactions[0]).toContain("Vermilion Tribunal");
    expect(blueprint.majorFactions[0]).toContain("Nine seats bound by visible blood oaths.");
    expect(blueprint.majorFactions.join("\n")).not.toContain("contradictory");
    expect(blueprint.majorFactions.filter(entry => entry.toLocaleLowerCase().includes("vermilion tribunal"))).toHaveLength(1);
    expect(blueprint.majorFactions[1]).toContain("Regent's Bronze Guard");
    // The proposed slot values travel with the reply, for the creator's blanks only.
    const slots = (response.body as GeneratedWorldBlueprint).generatedSeedSlots!;
    expect(slots.mainOpposition).toBe("Regent Zhao and the forged succession decree");
    expect(slots.characters?.map(entry => entry.name)).toEqual(["The witness Minister Sui", "Regent Zhao"]);
    expect(JSON.stringify(slots)).not.toContain("aliases");
    const filled = fillBlankSeedSlots(seed, slots).world.optional.worldFoundations;
    expect(filled.mainCharacter).toEqual({ ...seed.world.optional.worldFoundations.mainCharacter });
    expect(filled.additionalCharacters![0]).toEqual(seed.world.optional.worldFoundations.additionalCharacters![0]);
    expect(filled.additionalCharacters![1]).toMatchObject({ name: "Regent Zhao", age: "Sixty", connectionToMC: "Architect of the hearing" });
    expect(filled.factions![0]).toEqual(seed.world.optional.worldFoundations.factions![0]);
    expect(filled.abilities).toEqual(seed.world.optional.worldFoundations.abilities);
    expect(filled.mainOpposition).toBe("Regent Zhao and the forged succession decree");
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
      error: "The model could not produce a complete World Blueprint. No Story Seed data was changed; please retry.",
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

  it("gives the Blueprint a chapter's deadline: 170 seconds by default and at most", () => {
    expect(resolveStorySeedBlueprintConfig({}).timeoutMs).toBe(170_000);
    expect(resolveStorySeedBlueprintConfig({ STORY_SEED_BLUEPRINT_TIMEOUT_MS: "999999" }).timeoutMs).toBe(170_000);
    expect(resolveStorySeedBlueprintConfig({ STORY_SEED_BLUEPRINT_TIMEOUT_MS: "60000" }).timeoutMs).toBe(60_000);
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

describe("Blueprint model: the chapter model the reader chose", () => {
  const withRouter = { ...environment, OPENROUTER_API_KEY: "server-only-router-key" };
  const send = (body: Record<string, unknown>, env: Record<string, string> = withRouter) => {
    const provider = new RecordingProvider();
    const providerFactory = vi.fn((_apiKey: string, _model: string) => provider);
    return handleStorySeedBlueprintHttp({ method: "POST", headers: { Authorization: "Bearer development-access-token" }, body }, { environment: env, providerFactory })
      .then(response => ({ response, provider, providerFactory }));
  };

  it("writes the Blueprint with the chapter model sent, at its reasoning level, and keeps the server's model when none is sent", async () => {
    const chosen = await send({ storySeed: canonicalSeed(), model: "openrouter/openai/gpt-6-luna", reasoningLevel: "high" });
    expect(chosen.response.status).toBe(200);
    expect(chosen.providerFactory).toHaveBeenCalledWith("server-only-router-key", "openrouter/openai/gpt-6-luna");
    expect(chosen.provider.requests[0].reasoningLevel).toBe("high");
    // A model whose own default thinks too long gets the level chapters send it.
    const glm = await send({ storySeed: canonicalSeed(), model: "openrouter/z-ai/glm-5.3-flash" });
    expect(glm.provider.requests[0].reasoningLevel).toBe("low");
    // No model sent: the server's Blueprint model, as before, with no reasoning level.
    const fallback = await send({ storySeed: canonicalSeed() });
    expect(fallback.providerFactory).toHaveBeenCalledWith("server-only-gemini-key", "google/gemini-test");
    expect(fallback.provider.requests[0]).not.toHaveProperty("reasoningLevel");
  });

  it("refuses a model chapters cannot use, before any model call, and needs only the chosen model's key", async () => {
    const unknown = await send({ storySeed: canonicalSeed(), model: "openrouter/someone/unlisted-model" });
    expect(unknown.response.status).toBe(400);
    expect((unknown.response.body as { error: string }).error).toBe("Model 'openrouter/someone/unlisted-model' is not configured for chapter generation.");
    expect(unknown.providerFactory).not.toHaveBeenCalled();
    // The server's own Blueprint model has no key here; the chosen OpenRouter model does.
    const { GEMINI_API_KEY: _gemini, ...routerOnly } = withRouter;
    const chosen = await send({ storySeed: canonicalSeed(), model: "openrouter/openai/gpt-6-luna" }, routerOnly);
    expect(chosen.response.status).toBe(200);
    const fallback = await send({ storySeed: canonicalSeed() }, routerOnly);
    expect(fallback.response.status).toBe(503);
  });

  it("says a Blueprint stopped at its deadline was still being written, and reports which model wrote each one", async () => {
    const request = { method: "POST", headers: { Authorization: "Bearer development-access-token" }, body: { storySeed: canonicalSeed(), model: "openrouter/z-ai/glm-5.3-flash" } };
    const onAnswer = vi.fn();
    const answered = await handleStorySeedBlueprintHttp(request, { environment: withRouter, providerFactory: () => new RecordingProvider(), onAnswer });
    expect(answered.status).toBe(200);
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith({ model: "openrouter/z-ai/glm-5.3-flash", durationMs: expect.any(Number) });
    const stillWriting: WorldBlueprintModelProvider = {
      generate: async () => { throw new ModelRouterError("timeout", "The provider exceeded the 170 second deadline."); },
    };
    const unanswered = vi.fn();
    const stopped = await handleStorySeedBlueprintHttp(request, { environment: withRouter, providerFactory: () => stillWriting, onAnswer: unanswered });
    expect(stopped.status).toBe(502);
    expect(errorOf(stopped)).toBe("The model was still writing after 170 seconds, so it was stopped. Choose a lower reasoning level or a faster model in the Model Router. No Story Seed data was changed.");
    expect(unanswered).not.toHaveBeenCalled();
    // Any other provider failure keeps the plain retry message.
    const failing: WorldBlueprintModelProvider = {
      generate: async () => { throw new ModelRouterError("provider-error", "OpenRouter 500: upstream"); },
    };
    const failed = await handleStorySeedBlueprintHttp(request, { environment: withRouter, providerFactory: () => failing });
    expect(errorOf(failed)).toBe("The model could not produce a complete World Blueprint. No Story Seed data was changed; please retry.");
  });
});

describe("Blueprint story length", () => {
  /** The canonical Seed with the creator's Story Length set on its ARC page. */
  const seedOfLength = (arcCount: unknown): StorySeedInput => {
    const seed = canonicalSeed();
    return { ...seed, story: { ...seed.story, optional: { ...seed.story.optional, arcCount: arcCount as number } } };
  };

  it("plans for the Seed's Story Length, as an exact schema and prompt instruction, still planning only Arc 1", async () => {
    const provider = new RecordingProvider();
    const response = await post({ storySeed: seedOfLength(12) }, provider);
    expect(response.status).toBe(200);
    expect((response.body as WorldBlueprint).arcPlans).toHaveLength(1);
    expect((response.body as WorldBlueprint).arcOneScope).toBe("opening");
    const schema = provider.requests[0].responseJsonSchema;
    expect(schema.properties.estimatedArcs).toMatchObject({ minimum: 12, maximum: 12 });
    expect(provider.requests[0].userPrompt).toContain("The creator chose the story's length (story.optional.arcCount): estimatedArcs is exactly 12.");
    expect(provider.requests[0].userPrompt).not.toContain("a realistic estimatedArcs");
  });

  it("lets the model choose a realistic length from 10 to 40 when the Seed leaves it blank, kept inside that range", async () => {
    const provider = new RecordingProvider();
    const response = await post({ storySeed: canonicalSeed() }, provider);
    expect(response.status).toBe(200);
    expect(provider.requests[0].responseJsonSchema.properties.estimatedArcs).toMatchObject({ minimum: 10, maximum: 40 });
    expect(provider.requests[0].userPrompt).toContain("a realistic estimatedArcs between 10 and 40");
    // A suggestion in range keeps its look-ahead.
    expect((response.body as WorldBlueprint).arcLookahead?.map(entry => entry.arcNumber)).toEqual([2, 3]);
    // A provider that ignores the range costs no Blueprint: the suggestion is kept inside it, and Arc 1 stays the opening.
    // Its look-ahead was written for the model's own length (Arc 3 may reach the ending of a three-arc story), so it is dropped.
    for (const [answered, kept] of [[3, 10], [1, 10], [60, 40]]) {
      const suggested = await post({ storySeed: canonicalSeed() }, new RecordingProvider({ ...generatedBlueprint(), estimatedArcs: answered }));
      expect(suggested.status).toBe(200);
      expect((suggested.body as WorldBlueprint).estimatedArcs).toBe(kept);
      expect((suggested.body as WorldBlueprint).arcOneScope).toBe("opening");
      expect((suggested.body as WorldBlueprint).arcLookahead).toBeUndefined();
    }
  });

  it("accepts a length from 10 to 40, refuses anything else before any model call, and takes the length only from the Seed", async () => {
    const provider = new RecordingProvider({ ...generatedBlueprint(), estimatedArcs: 40 });
    const response = await post({ storySeed: seedOfLength(40) }, provider);
    expect(response.status).toBe(200);
    expect((response.body as WorldBlueprint).estimatedArcs).toBe(40);
    // Lengths saved before the range (1 to 9, or past 40) open, but are never generated from.
    for (const invalid of [2.5, 0, 1, 9, 41, 101, "12"]) {
      const refused = await post({ storySeed: seedOfLength(invalid) }, provider);
      expect(refused.status).toBe(400);
      expect(errorOf(refused)).toContain("Story Length must be a whole number of arcs from 10 to 40.");
    }
    const outside = await post({ storySeed: canonicalSeed(), arcCount: 5 }, provider);
    expect(outside.status).toBe(400);
    expect(errorOf(outside)).toContain("Story Length (story.optional.arcCount)");
    expect(provider.requests).toHaveLength(1);
  });

  it("fails loudly when the model answers for a different length than the creator chose", async () => {
    const response = await post({ storySeed: seedOfLength(14) }, new RecordingProvider());
    expect(response.status).toBe(502);
    expect(errorOf(response)).toContain("was not planned for the 14 arcs requested. Nothing was saved");
  });

  it("plans Arc 1 as the opening, never the whole story, and offers no way to add arcs", async () => {
    const opening = await post({ storySeed: seedOfLength(10) }, new RecordingProvider({ ...generatedBlueprint(), estimatedArcs: 10 }));
    expect(opening.status).toBe(200);
    expect((opening.body as WorldBlueprint).arcOneScope).toBe("opening");
    expect((opening.body as WorldBlueprint).arcLookahead?.map(entry => entry.arcNumber)).toEqual([2, 3]);
    const recorded = new RecordingProvider();
    await post({ storySeed: canonicalSeed() }, recorded);
    expect(recorded.requests[0].userPrompt).toContain("No Arc 1 goal reaches or resolves the Destined Ending.");
    expect(recorded.requests[0].userPrompt).not.toContain("estimatedArcs is 1");
    const provider = new RecordingProvider();
    const extension = await post({ operation: "extend-arc-roadmap", storySeed: canonicalSeed() }, provider);
    expect(extension.status).toBe(400);
    expect(errorOf(extension)).toBe("Unknown Blueprint operation.");
    expect(provider.requests).toHaveLength(0);
  });
});

describe("Cleaned-up Blueprint instructions", () => {
  const promptFor = async (seed: StorySeedInput) => {
    const provider = new RecordingProvider();
    await post({ storySeed: seed }, provider);
    const { systemInstruction, userPrompt } = provider.requests[0];
    return { systemInstruction, userPrompt, both: `${systemInstruction}\n${userPrompt}`, schema: provider.requests[0].responseJsonSchema };
  };
  const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

  it("states each rule once and drops dead conditions, internal labels, and the genre list", async () => {
    const { systemInstruction, userPrompt, both } = await promptFor(canonicalSeed());
    for (const rule of [
      "Every non-empty value is authoritative",
      "Make It Work is an absolute worldbuilding instruction",
      "Destined Ending is the novel's fixed destination",
      "integrate it instead of replacing it",
      "Describe minors safely and never sexualize a character under 18",
      "Return the JSON object only.",
    ]) expect(count(both, rule)).toBe(1);
    expect(both).not.toMatch(/majorMysteries|unresolvedPlotThreads/);
    for (const removed of [
      "when the creator left it open", "The server will enforce", "for compatibility", "HARNESS", "CAPA",
      "Preserve author Hard Pins exactly", "Fate Survival is optional", "Return only the requested JSON object",
      "You are fluent in", "Wuxia, Xianxia, Xuanhuan",
    ]) expect(both).not.toContain(removed);
    // The anchor is who the model is, not a genre list: an Eastern fantasy author
    // who reads whatever genre and tags the creator chose through that frame.
    expect(systemInstruction.startsWith("You are an elite Eastern fantasy author and world architect.")).toBe(true);
    expect(systemInstruction).toContain("Interpret the Story Seed's genre, tags, and storytelling tradition through that Eastern fantasy frame, as adaptable lenses rather than mandatory tropes. Never fill open creative space with Western fantasy defaults unless the Story Seed asks for them.");
    for (const genreList of ["Wuxia", "Xuanhuan", "LitRPG", "tower climbing", "cultivation realms"]) expect(systemInstruction).not.toContain(genreList);
    expect(userPrompt).toContain("- Generate a strong logline.\n");
    expect(userPrompt).toContain("- Fill every Story Seed slot. Where the creator already wrote a slot, repeat their value exactly; only blank slots are yours to fill. Never write aliases or Hard Pins.");
    expect(userPrompt).toContain("never the main character");
    expect(userPrompt).toContain("Keep every slot to one short, concrete fact");
    expect(userPrompt).not.toMatch(/mcProfile|Name \(role\) — description/);
  });

  it("asks for added detail only where the creator wrote the world fact", async () => {
    const allWritten = await promptFor(canonicalSeed());
    expect(allWritten.userPrompt).toContain("- Establish a usable power-system outline.\n");
    expect(allWritten.userPrompt).toContain("- The creator already wrote the world overview (worldIdentity.worldType), opening location (worldIdentity.startingLocation), and society (worldIdentity.societyStructure); that wording stays the fact. In worldOverview, startingLocation, and societyStructure, write only compatible added detail that builds on the matching fact, never restating or contradicting it.");
    const noneWritten = canonicalSeed();
    noneWritten.world.optional.worldIdentity = { title: "The Seventh Oath" };
    const open = await promptFor(noneWritten);
    expect(open.userPrompt).toContain("- Establish the world overview, opening location, society, and a usable power-system outline.\n");
    expect(open.userPrompt).not.toContain("The creator already wrote");
    const someWritten = canonicalSeed();
    someWritten.world.optional.worldIdentity = { title: "The Seventh Oath", societyStructure: "Nine clans share power." };
    const partial = await promptFor(someWritten);
    expect(partial.userPrompt).toContain("- Establish the world overview, opening location, and a usable power-system outline.\n");
    expect(partial.userPrompt).toContain("- The creator already wrote the society (worldIdentity.societyStructure); that wording stays the fact. In societyStructure, write only");
  });

  it("keeps the strict output form", async () => {
    const { schema } = await promptFor(canonicalSeed());
    expect(schema.additionalProperties).toBe(false);
    expect([...schema.required].sort()).toEqual([
      "abilities", "arcLookahead", "arcOne", "characters", "destinedEnding", "estimatedArcs", "factions", "firstArcPromise", "logline",
      "mainCharacter", "mainOpposition", "powerSystem", "powerSystemOutline", "societyStructure", "startingLocation",
      "styleBible", "title", "tropeRules", "worldOverview",
    ]);
    expect(Object.keys(schema.properties)).not.toContain("worldOverviewDetail");
  });

  it("returns the added detail beside the author's facts, never in their place", async () => {
    const provider = new RecordingProvider({
      ...generatedBlueprint(),
      worldOverview: "Oaths are recorded in the sky as scars of light.",
      startingLocation: "Rainwater in the court runs red during hearings.",
      societyStructure: "Every clan keeps a witness sect as hostage and guarantor.",
    });
    const response = await post({ storySeed: canonicalSeed() }, provider);
    const blueprint = response.body as WorldBlueprint;
    const identity = canonicalSeed().world.optional.worldIdentity;
    expect(blueprint).toMatchObject({
      worldOverview: identity.worldType, startingLocation: identity.startingLocation, societyStructure: identity.societyStructure,
      worldOverviewDetail: "Oaths are recorded in the sky as scars of light.",
      startingLocationDetail: "Rainwater in the court runs red during hearings.",
      societyStructureDetail: "Every clan keeps a witness sect as hostage and guarantor.",
    });
  });
});
