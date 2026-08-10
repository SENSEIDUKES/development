import { describe, expect, it, vi } from "vitest";
import type { StorySeedInput } from "../../components/story-seed/shared/storySeedSchema";
import { createStorySeedExport, parseStorySeedJson } from "../../components/story-seed/shared/storySeedSerialization";
import type { WorldBlueprint } from "../../components/story-seed/shared/types";
import { adaptFinalizedStorySeedToChapterContracts } from "../../components/chapter-generation/shared/packets/storySeedChapterAdapter";
import { handleStorySeedBlueprintHttp } from "./http";
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
      plotAndTropeSettings: {
        faceSlap: "low",
        plotArmor: "medium",
        recognition: "high",
        longTermGoal: "Sever the dead heaven from the imperial oath network.",
        firstMajorConflict: "Survive the succession hearing without exposing the remembered timelines.",
        mainAntagonistPressure: "The regent owns every witness except one.",
      },
      additionalStoryDirection: "A quiet conspiracy becomes a war over who may rewrite an oath.",
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

const generatedBlueprint = (): Record<string, unknown> => ({
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
    "Vermilion Tribunal — a completely contradictory generated description",
    "Regent's Bronze Guard — the palace's private army",
  ],
  initialCharacters: [
    "Minister Sui — a contradictory generated description",
    "Regent Zhao — the architect of the hearing",
  ],
  majorMysteries: ["Who taught the dead heaven to remember broken oaths?"],
  firstArcPromise: "A different first conflict.",
  tropeRules: "Foreknowledge creates costly choices rather than automatic victories.",
  styleBible: "Restrained court tension, exact ritual detail, and sudden spectacle.",
  destinedEnding: "A different ending.",
  estimatedArcs: 7,
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
    expect(blueprint.logline).toBe(seed.story.optional.additionalStoryDirection);
    expect(blueprint.worldOverview).toBe(seed.world.optional.worldIdentity.worldType);
    expect(blueprint.startingLocation).toBe(seed.world.optional.worldIdentity.startingLocation);
    expect(blueprint.societyStructure).toBe(seed.world.optional.worldIdentity.societyStructure);
    expect(blueprint.mainCharacter).toMatchObject({
      name: "Jin Rui",
      age: "Twenty-three",
      personality: seed.world.optional.worldFoundations.mainCharacter?.personality,
      appearance: "Black court robes stitched with a severed seventh sun.",
    });
    expect(blueprint.mcProfile).toContain("Secret advantage: Memories of seven failed succession hearings");
    expect(blueprint.powerSystemOutline).toContain("Starting power concept: Oath-sight");
    expect(blueprint.powerSystemOutline).toContain("Known ranks: Oath Spark → Seal Heart → Crown Soul");
    expect(blueprint.initialCharacters[0]).toContain("Minister Sui");
    expect(blueprint.initialCharacters[0]).toContain("age: 52");
    expect(blueprint.initialCharacters).toContain("Regent Zhao — the architect of the hearing");
    expect(blueprint.majorFactions[0]).toContain("Vermilion Tribunal");
    expect(blueprint.majorFactions[0]).toContain("Nine seats bound by visible blood oaths.");
    expect(blueprint.majorFactions).toContain("Regent's Bronze Guard — the palace's private army");
    expect(blueprint.firstArcPromise).toBe(seed.story.optional.plotAndTropeSettings.firstMajorConflict);
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
  });

  it("exports a paired artifact that loads through Chapter Generation with no fixture fallback", async () => {
    const response = await manifest(new RecordingProvider());
    expect(response.status).toBe(200);
    const exported = createStorySeedExport(canonicalSeed(), response.body as WorldBlueprint);
    const [uploaded] = parseStorySeedJson(JSON.stringify(exported), { normalizeBlueprint: false });

    const adapted = adaptFinalizedStorySeedToChapterContracts({
      seed: uploaded.seed,
      blueprint: uploaded.blueprint,
    });

    expect(adapted.blueprint.title).toBe("The Seventh Oath");
    expect(adapted.contracts.storyConstitution.storySeed).toEqual(uploaded.seed);
    expect(adapted.seed.world.optional.worldFoundations.additionalCharacters?.[0])
      .toMatchObject({
        name: "Minister Sui",
        age: "52",
        connectionToMC: "former tutor",
        bio: "The only minister whose testimony changed between timelines.",
      });
    expect(adapted.contracts.storyConstitution.worldBlueprint).toEqual(adapted.blueprint);
    expect(JSON.stringify(adapted)).not.toContain("workshop-fixture");
  });
});
