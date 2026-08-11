import { describe, expect, it, vi } from "vitest";
import type { StorySeedInput } from "../../components/story-seed/shared/storySeedSchema";
import type { WorldBlueprint } from "../../components/story-seed/shared/types";
import type { ManifestChapterResponse } from "../../components/chapter-generation/shared/liveChapterGeneration";
import { adaptFinalizedStorySeedToChapterContracts } from "../../components/chapter-generation/shared/packets/storySeedChapterAdapter";
import { createArcChapterPosition } from "../../components/chapter-generation/shared/packets/livingStoryState";
import { assembleChapterPacket } from "../../components/chapter-generation/shared/pipeline/assembleChapterPacket";
import { runChapterPipelineAsync } from "../../components/chapter-generation/shared/pipeline/runChapterPipelineAsync";
import { aggregateChapterTokenUsage } from "../../components/chapter-generation/shared/pipeline/usage";
import {
  chapterGenerationServerInfo,
  resolveChapterGenerationConfig,
  resolveConfiguredChapterModel,
} from "./config";
import { handleChapterGenerationHttp } from "./http";
import {
  ChapterPlanValidationError,
  createLiveChapterModelCalls,
  parseChapterPlan,
} from "./modelCalls";
import type {
  ChapterTextGenerationRequest,
  ChapterTextGenerationResult,
  ChapterTextModelProvider,
} from "./provider";

const canonicalSeed = (): StorySeedInput => ({
  creator: {},
  story: {
    required: {
      storyTags: ["mystery"],
      premise: "An oath-reader returns to the trial that erased her family.",
      genre: "Political fantasy",
      style: "chinese",
    },
    optional: {
      intendedForMatureAudiences: false,
      fateSurvival: { enabled: false, visibility: "partial", pressure: "immortal" },
      plotAndTropeSettings: {
        faceSlap: "low",
        plotArmor: "medium",
        recognition: "medium",
      },
    },
  },
  world: {
    required: {},
    optional: {
      worldIdentity: { title: "Oath of Rain", startingLocation: "The Rain Court" },
      worldFoundations: { mainCharacter: { name: "Rin", startingIdentity: "Disgraced witness" } },
    },
  },
});

const canonicalBlueprint = (): WorldBlueprint => ({
  blueprintVersion: "v1.0",
  title: "Oath of Rain",
  logline: "Rin must survive the trial that buried her family.",
  worldOverview: "Oaths leave visible scars in rain.",
  startingLocation: "The Rain Court",
  societyStructure: "Nine oath houses",
  powerSystemOutline: "Witnesses read vow scars.",
  mcProfile: "A disgraced oath-reader.",
  majorFactions: ["The Ninth House"],
  initialCharacters: ["Magistrate Yun"],
  majorMysteries: ["Why does the rain remember Rin?"],
  firstArcPromise: "Rin must expose one false oath before the court closes.",
  tropeRules: "Deduction must come from observed evidence.",
  styleBible: "Quiet pressure and precise ritual detail.",
  estimatedArcs: 4,
  unresolvedPlotThreads: ["Who taught the rain to remember Rin?"],
});

const buildPacket = () => assembleChapterPacket(
  adaptFinalizedStorySeedToChapterContracts({
    seed: canonicalSeed(),
    blueprint: canonicalBlueprint(),
  }).contracts,
);

const planResponse = JSON.stringify({
  version: 1,
  chapterNumber: 1,
  arcChapterPosition: "Arc 1 — Chapter 1/100",
  rhythmResponse: {
    recentSceneTypes: [],
    direction: "Open inside the hearing and let one false oath create the turn.",
  },
  resolvedSceneType: "worldBuilding",
  fateSurvival: {
    configured: true,
    applies: false,
    visibility: "partial",
    pressure: "immortal",
    approach: "Fate Survival is disabled, so no fate event is forced.",
  },
  effects: [{
    kind: "narration-metadata",
    intent: "Track the hearing's ritual tension.",
    required: true,
  }],
  sceneProgression: [
    { order: 1, purpose: "Establish the Rain Court.", pacing: "Measured" },
    { order: 2, purpose: "Reveal the false oath.", pacing: "Tightening" },
  ],
  pacing: { directive: "Measured until the oath breaks.", shape: "Quiet escalation" },
  intendedEnding: "Rin identifies the first conspirator.",
  nextChapterHandoffTarget: "Record the court, witnesses, and exposed oath.",
});

const manifestedResponse = [
  "---CHAPTER_BLOCKS---",
  JSON.stringify({
    id: "c1-p1",
    type: "paragraph",
    text: "Rain moved across the court roof while Rin waited beneath the witness bell.",
    metadata: { mode: "narration", atmosphereCategory: "rain" },
  }),
  JSON.stringify({
    id: "c1-p2",
    type: "dialogue",
    text: "\"Your oath has a seam, Magistrate,\" Rin said.",
    metadata: { mode: "dialogue", speakerName: "Rin", speakerRole: "main_character" },
  }),
  JSON.stringify({
    id: "c1-p3",
    type: "system",
    text: "The Celestial Library marked the broken oath.",
    system: { kind: "appraisal", promptType: "mystery", title: "Oath Seam Identified" },
  }),
].join("\n");

const processingResponse = (serious = false, blankChangeEntries = false) => JSON.stringify({
  version: 1,
  newAnchors: {
    worldBuilding: "Learn why rain holds oath scars.",
    conflict: "The Magistrate orders Rin detained.",
    progression: "Rin tests the recovered oath seam.",
  },
  characterChanges: blankChangeEntries
    ? [{ description: "Rin remains unchanged." }, ""]
    : ["Rin publicly demonstrates oath-reading."],
  worldStateChanges: blankChangeEntries ? ["   "] : ["The first false oath is exposed."],
  characterStateUpdates: {
    currentPowerStage: "Oath Reader — First Witness",
    abilities: [{ name: "Oath Seam Reading", source: "Chapter 1" }],
  },
  codexUpdates: {
    characters: [{ name: "Rin", publicStanding: "Exposed oath-reader" }],
    factions: [],
    locations: [{ name: "The Rain Court", state: "First false oath exposed" }],
    artifacts: [],
  },
  threads: { completed: blankChangeEntries ? [""] : [], changed: [], unresolved: [] },
  missionCompletion: {
    completed: true,
    evidence: "Rin identifies the false oath before the hearing closes.",
  },
  continuityFindings: serious
    ? [{ severity: "serious", code: "opening-break", message: "The opening uses the wrong court." }]
    : [],
  repetitionFindings: [],
  nextChapterHandoff: {
    version: 1,
    chapterNumber: 1,
    endState: {
      location: "The Rain Court",
      timeMarker: "before noon",
      charactersPresent: ["Rin", "Magistrate Yun"],
      mcCondition: "calm, publicly exposed",
      openTension: "The Magistrate has ordered Rin detained.",
    },
    completedEvents: ["Rin exposed the first false oath."],
    nextImmediateAction: "Escape detention or force the court to hear the evidence.",
    fingerprints: [{
      actionType: "revelation",
      participants: ["Rin", "Magistrate Yun"],
      location: "The Rain Court",
      outcome: "Rin exposed a false oath.",
      chapterNumber: 1,
    }],
  },
  repairRecommended: serious,
});

class RecordingProvider implements ChapterTextModelProvider {
  readonly provider = "gemini";
  readonly model = "google/gemini-test";
  readonly requests: ChapterTextGenerationRequest[] = [];
  private processCount = 0;

  constructor(
    private readonly seriousFirstProcess = false,
    private readonly blankChangeEntries = false,
  ) {}

  async generate(request: ChapterTextGenerationRequest): Promise<ChapterTextGenerationResult> {
    this.requests.push(request);
    if (request.kind === "process") this.processCount += 1;
    const text = request.kind === "plan"
      ? planResponse
      : request.kind === "manifest" || request.kind === "repair"
        ? manifestedResponse
        : processingResponse(
          this.seriousFirstProcess && this.processCount === 1,
          this.blankChangeEntries,
        );
    const index = this.requests.length;
    return {
      text,
      usage: {
        kind: request.kind,
        stage: request.stage,
        provider: this.provider,
        model: this.model,
        inputTokens: index * 100,
        outputTokens: index * 10,
        totalTokens: index * 110,
        generationTimeMs: index * 25,
        tokenSource: index === 2 ? "estimated" : "provider",
      },
    };
  }
}

class ChapterAwareProvider implements ChapterTextModelProvider {
  readonly provider = "gemini";
  readonly model = "google/gemini-test";
  readonly requests: ChapterTextGenerationRequest[] = [];

  constructor(private readonly chapterNumber: number) {}

  async generate(request: ChapterTextGenerationRequest): Promise<ChapterTextGenerationResult> {
    this.requests.push(request);
    let text: string;
    if (request.kind === "plan") {
      const plan = JSON.parse(planResponse);
      plan.chapterNumber = this.chapterNumber;
      plan.arcChapterPosition = `Arc 1 — Chapter ${this.chapterNumber}/100`;
      plan.rhythmResponse.recentSceneTypes = this.chapterNumber === 1 ? [] : ["worldBuilding"];
      text = JSON.stringify(plan);
    } else if (request.kind === "manifest" || request.kind === "repair") {
      text = manifestedResponse;
    } else {
      const processed = JSON.parse(processingResponse());
      processed.characterChanges = [`Rin advances in Chapter ${this.chapterNumber}.`];
      processed.characterStateUpdates.currentPowerStage = `Witness ${this.chapterNumber}`;
      processed.characterStateUpdates.abilities = [{ name: `Oath Sight ${this.chapterNumber}` }];
      processed.codexUpdates.locations = [{ name: `Rain Court Chamber ${this.chapterNumber}` }];
      processed.nextChapterHandoff.chapterNumber = this.chapterNumber;
      processed.nextChapterHandoff.fingerprints[0].chapterNumber = this.chapterNumber;
      text = JSON.stringify(processed);
    }
    return {
      text,
      usage: {
        kind: request.kind,
        stage: request.stage,
        provider: this.provider,
        model: this.model,
        inputTokens: 100,
        outputTokens: 20,
        totalTokens: 120,
        generationTimeMs: 50,
        tokenSource: "provider",
      },
    };
  }
}

describe("live Chapter Generation model boundaries", () => {
  it("uses the requested chapter in the Plan schema and reports every invalid Plan field", async () => {
    const packet = buildPacket();
    const position = createArcChapterPosition(3);
    packet.chapterMission.number = 3;
    packet.arcChapterPosition = position;
    packet.livingStoryState.position = position;
    if (packet.chapterMission.contract) packet.chapterMission.contract.chapterNumber = 3;
    const provider = new ChapterAwareProvider(3);
    const calls = createLiveChapterModelCalls(provider, {
      temperature: 1,
      maxOutputTokens: 16_384,
    });

    await calls.model.planChapter({ chapterPacket: packet, planningSignals: {} });

    expect(provider.requests[0].systemInstruction).toContain('"chapterNumber":3');
    expect(provider.requests[0].systemInstruction).toContain('"arcChapterPosition":"Arc 1 — Chapter 3/100"');
    expect(provider.requests[0].systemInstruction).not.toContain('"chapterNumber":1');

    const invalid = JSON.parse(planResponse);
    invalid.chapterNumber = 1;
    delete invalid.intendedEnding;
    try {
      parseChapterPlan(JSON.stringify(invalid), { chapterPacket: packet, planningSignals: {} });
      throw new Error("Expected Chapter Plan validation to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(ChapterPlanValidationError);
      const validation = error as ChapterPlanValidationError;
      expect(validation.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ field: "chapterNumber", expected: "3", received: "1" }),
        expect.objectContaining({ field: "intendedEnding", reason: "is missing" }),
      ]));
    }
  });

  it("keeps canonical Fate Survival settings authoritative over model output", () => {
    const conflicting = JSON.parse(planResponse);
    conflicting.rhythmResponse.selectedPressureTier = "Dao Master";
    conflicting.fateSurvival = {
      configured: false,
      applies: true,
      visibility: "full",
      pressure: "heaven",
      approach: "The model requested an event that canon disables.",
    };

    const plan = parseChapterPlan(JSON.stringify(conflicting), {
      chapterPacket: buildPacket(),
      planningSignals: {},
    });

    expect(plan.fateSurvival).toMatchObject({
      configured: true,
      applies: false,
      visibility: "partial",
      pressure: "immortal",
    });
    expect(plan.rhythmResponse.selectedPressureTier).toBeUndefined();
  });

  it("uses exactly Plan, Manifest, and Process on a normal run", async () => {
    const provider = new RecordingProvider();
    const calls = createLiveChapterModelCalls(provider, {
      temperature: 1,
      maxOutputTokens: 16_384,
    });
    const packet = buildPacket();
    const originalState = structuredClone(packet.livingStoryState);
    const stages: string[] = [];
    const run = await runChapterPipelineAsync({
      chapterPacket: packet,
      model: calls.model,
      onStageChange: stage => stages.push(stage),
    });
    const usage = aggregateChapterTokenUsage(calls.usage);

    expect(provider.requests.map(request => request.kind)).toEqual(["plan", "manifest", "process"]);
    expect(run.modelCalls).toEqual(["plan", "manifest", "process"]);
    expect(run.repairApplied).toBe(false);
    expect(run.processingResult.threads.unresolved).toEqual([{
      description: "Who taught the rain to remember Rin?",
      originChapter: 1,
    }]);
    expect(run.processingResult.proposedLivingStoryState.threads.unresolved)
      .toEqual(run.processingResult.threads.unresolved);
    expect(run.processingResult.proposedLivingStoryState.characterState).toMatchObject({
      currentPowerStage: "Oath Reader — First Witness",
      abilities: expect.arrayContaining([expect.objectContaining({ name: "Oath Seam Reading" })]),
    });
    expect(run.processingResult.proposedLivingStoryState.codex.locations)
      .toContainEqual(expect.objectContaining({
        name: "The Rain Court",
        state: "First false oath exposed",
      }));
    expect(run.processingResult.proposedLivingStoryState.carriedChanges).toEqual([
      expect.objectContaining({
        chapterNumber: 1,
        characterChanges: ["Rin publicly demonstrates oath-reading."],
        worldStateChanges: ["The first false oath is exposed."],
      }),
    ]);
    expect(run.manifestedChapter.blocks?.[2].type).toBe("paragraph");
    expect(packet.livingStoryState).toEqual(originalState);
    expect(provider.requests[0].userPrompt).toContain("COMPLETE CHAPTER PACKET");
    expect(provider.requests[1].userPrompt).toContain("CHAPTER PLAN");
    expect(provider.requests[2].userPrompt).toContain("MANIFESTED CHAPTER");
    expect(usage.calls.map(call => call.stage)).toEqual([
      "Plan Chapter",
      "Manifest Chapter",
      "Process Result",
    ]);
    expect(stages).toEqual(["Plan Chapter", "Manifest Chapter", "Process Result"]);
    expect(usage.totals).toEqual({
      inputTokens: 600,
      outputTokens: 60,
      totalTokens: 660,
      generationTimeMs: 150,
      hasEstimatedUsage: true,
    });
    expect(usage.calls[0].estimatedInputBreakdown).toMatchObject({
      source: "estimated",
      storySeedConstitution: expect.any(Number),
      blueprint: expect.any(Number),
      livingStoryState: expect.any(Number),
      chapterMission: expect.any(Number),
      generationRules: expect.any(Number),
      userInstruction: 0,
      systemPrompts: expect.any(Number),
      total: expect.any(Number),
    });
  });

  it("adds repair and reprocessing only after a serious repair recommendation", async () => {
    const provider = new RecordingProvider(true);
    const calls = createLiveChapterModelCalls(provider, {
      temperature: 1,
      maxOutputTokens: 16_384,
    });
    const stages: string[] = [];
    const run = await runChapterPipelineAsync({
      chapterPacket: buildPacket(),
      model: calls.model,
      onStageChange: stage => stages.push(stage),
    });

    expect(provider.requests.map(request => request.kind)).toEqual([
      "plan",
      "manifest",
      "process",
      "repair",
      "process",
    ]);
    expect(run.modelCalls).toEqual(["plan", "manifest", "process", "repair", "process"]);
    expect(run.repairApplied).toBe(true);
    expect(calls.usage[4].stage).toBe("Process Result (repaired chapter)");
    expect(stages).toEqual([
      "Plan Chapter",
      "Manifest Chapter",
      "Process Result",
      "Repair Chapter",
      "Process Result (repaired chapter)",
    ]);
  });

  it("stops cleanly when a real model boundary fails", async () => {
    const provider = new RecordingProvider();
    const failure = new Error("provider secret diagnostic");
    vi.spyOn(provider, "generate")
      .mockImplementationOnce(request => RecordingProvider.prototype.generate.call(provider, request))
      .mockRejectedValueOnce(failure);
    const calls = createLiveChapterModelCalls(provider, {
      temperature: 1,
      maxOutputTokens: 16_384,
    });

    await expect(runChapterPipelineAsync({ chapterPacket: buildPacket(), model: calls.model }))
      .rejects.toThrow("provider secret diagnostic");
    expect(provider.requests.map(request => request.kind)).toEqual(["plan"]);
    expect(calls.usage).toHaveLength(1);
  });

  it("rejects a manifested chapter when one NDJSON block is malformed", async () => {
    const base = new RecordingProvider();
    const provider: ChapterTextModelProvider = {
      provider: base.provider,
      model: base.model,
      async generate(request) {
        const result = await base.generate(request);
        return request.kind === "manifest"
          ? {
              ...result,
              text: `${JSON.stringify({ id: "valid", type: "paragraph", text: "Opening." })}\n{"id":"broken"\n${JSON.stringify({ id: "later", type: "paragraph", text: "Later." })}`,
            }
          : result;
      },
    };
    const calls = createLiveChapterModelCalls(provider, {
      temperature: 1,
      maxOutputTokens: 16_384,
    });

    await expect(runChapterPipelineAsync({ chapterPacket: buildPacket(), model: calls.model }))
      .rejects.toThrow(/malformed or unbalanced block/);
    expect(calls.usage).toHaveLength(2);
  });

  it("does not repair when the model recommends repair without a serious finding", async () => {
    const base = new RecordingProvider();
    const provider: ChapterTextModelProvider = {
      provider: base.provider,
      model: base.model,
      async generate(request) {
        const result = await base.generate(request);
        if (request.kind !== "process") return result;
        const response = JSON.parse(result.text);
        response.repairRecommended = true;
        return { ...result, text: JSON.stringify(response) };
      },
    };
    const calls = createLiveChapterModelCalls(provider, {
      temperature: 1,
      maxOutputTokens: 16_384,
    });
    const run = await runChapterPipelineAsync({ chapterPacket: buildPacket(), model: calls.model });

    expect(run.modelCalls).toEqual(["plan", "manifest", "process"]);
    expect(run.repairApplied).toBe(false);
  });

  it("normalizes described change objects and drops blank entries", async () => {
    const provider = new RecordingProvider(false, true);
    const calls = createLiveChapterModelCalls(provider, {
      temperature: 1,
      maxOutputTokens: 16_384,
    });

    const run = await runChapterPipelineAsync({ chapterPacket: buildPacket(), model: calls.model });

    expect(run.processingResult.characterChanges).toEqual(["Rin remains unchanged."]);
    expect(run.processingResult.worldStateChanges).toEqual([]);
    expect(run.processingResult.threads.completed).toEqual([]);
  });

  it("preserves ability acquisition order while merging structured updates", async () => {
    const base = new RecordingProvider();
    const provider: ChapterTextModelProvider = {
      provider: base.provider,
      model: base.model,
      async generate(request) {
        const result = await base.generate(request);
        if (request.kind !== "process") return result;
        const response = JSON.parse(result.text);
        response.characterStateUpdates.abilities = [
          { name: "oath seam", rank: "refined" },
          "Fourth ability",
        ];
        return { ...result, text: JSON.stringify(response) };
      },
    };
    const calls = createLiveChapterModelCalls(provider, {
      temperature: 1,
      maxOutputTokens: 16_384,
    });
    const packet = buildPacket();
    packet.livingStoryState.characterState.abilities = [
      "First ability",
      { name: "OATH SEAM", rank: "initial" },
      "Third ability",
    ];

    const run = await runChapterPipelineAsync({ chapterPacket: packet, model: calls.model });

    expect(run.processingResult.proposedLivingStoryState.characterState.abilities).toEqual([
      "First ability",
      { name: "oath seam", rank: "refined" },
      "Third ability",
      "Fourth ability",
    ]);
  });
});

describe("server model selection and failure handling", () => {
  const environment = {
    GEMINI_API_KEY: "server-only-test-key",
    CHAPTER_GENERATION_ACCESS_TOKEN: "development-access-token",
    CHAPTER_GENERATION_MODELS: "google/gemini-test,google/gemini-second",
    CHAPTER_GENERATION_DEFAULT_MODEL: "google/gemini-second",
  };

  it("exposes only configured models and rejects arbitrary browser model ids", () => {
    const config = resolveChapterGenerationConfig(environment);
    const serverInfo = chapterGenerationServerInfo(environment);
    expect(serverInfo).toMatchObject({
      provider: "gemini",
      configured: true,
      defaultModel: "google/gemini-second",
    });
    expect(JSON.stringify(serverInfo)).not.toContain(environment.GEMINI_API_KEY);
    expect(JSON.stringify(serverInfo)).not.toContain(environment.CHAPTER_GENERATION_ACCESS_TOKEN);
    expect(config.models.map(option => option.id)).toEqual([
      "google/gemini-test",
      "google/gemini-second",
    ]);
    expect(resolveConfiguredChapterModel("google/gemini-test", config))
      .toBe("google/gemini-test");
    expect(() => resolveConfiguredChapterModel("arbitrary/model", config))
      .toThrow(/not configured/);
    expect(chapterGenerationServerInfo({ ...environment, CHAPTER_GENERATION_ACCESS_TOKEN: "" }).configured)
      .toBe(false);
  });

  it("serves model info, rejects unsupported methods, and identifies an empty body", async () => {
    const info = await handleChapterGenerationHttp({ method: "GET" }, { environment });
    const unsupported = await handleChapterGenerationHttp({ method: "DELETE" }, { environment });
    const empty = await handleChapterGenerationHttp({ method: "POST", body: "" }, { environment });

    expect(info).toMatchObject({ status: 200, body: { configured: true } });
    expect(unsupported).toMatchObject({ status: 405, headers: { Allow: "GET, POST" } });
    expect(empty).toMatchObject({
      status: 400,
      body: { error: "The chapter-generation request body is empty." },
    });
  });

  it("returns a safe API error when the provider fails", async () => {
    const response = await handleChapterGenerationHttp({
      method: "POST",
      headers: { Authorization: "Bearer development-access-token" },
      body: {
        artifact: { seed: canonicalSeed(), blueprint: canonicalBlueprint() },
        model: "google/gemini-test",
      },
    }, {
      environment,
      providerFactory: () => ({
        provider: "gemini",
        model: "google/gemini-test",
        generate: async () => {
          throw new Error("provider secret diagnostic");
        },
      }),
    });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: "Chapter 1 failed during Plan Chapter: The provider call failed during Plan Chapter. Review the server log for the protected provider detail.",
      failure: {
        chapterNumber: 1,
        stage: "Plan Chapter",
        reason: "The provider call failed during Plan Chapter. Review the server log for the protected provider detail.",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("provider secret diagnostic");
    expect(JSON.stringify(response.body)).not.toContain("stack");
  });

  it("rejects a browser model outside the server allow-list as a request error", async () => {
    const generate = vi.fn();
    const response = await handleChapterGenerationHttp({
      method: "POST",
      headers: { Authorization: "Bearer development-access-token" },
      body: {
        artifact: { seed: canonicalSeed(), blueprint: canonicalBlueprint() },
        model: "google/gemini-arbitrary",
      },
    }, {
      environment,
      providerFactory: () => ({ provider: "gemini", model: "google/gemini-test", generate }),
    });

    expect(response.status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects a missing Blueprint before any provider call", async () => {
    const generate = vi.fn();
    const response = await handleChapterGenerationHttp({
      method: "POST",
      headers: { Authorization: "Bearer development-access-token" },
      body: {
        artifact: { seed: canonicalSeed() },
        model: "google/gemini-test",
      },
    }, {
      environment,
      providerFactory: () => ({ provider: "gemini", model: "google/gemini-test", generate }),
    });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).toContain("No Workshop fixture data was substituted");
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects a missing or invalid Development access token before any provider call", async () => {
    const generate = vi.fn();
    const request = {
      method: "POST",
      body: {
        artifact: { seed: canonicalSeed(), blueprint: canonicalBlueprint() },
        model: "google/gemini-test",
      },
    };
    const dependencies = {
      environment,
      providerFactory: () => ({ provider: "gemini", model: "google/gemini-test", generate }),
    };

    const missing = await handleChapterGenerationHttp(request, dependencies);
    const invalid = await handleChapterGenerationHttp({
      ...request,
      headers: { Authorization: "Bearer wrong-token" },
    }, dependencies);

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
    expect(generate).not.toHaveBeenCalled();
  });

  it("returns completed model-call usage when a later structured parse fails", async () => {
    const response = await handleChapterGenerationHttp({
      method: "POST",
      headers: { Authorization: "Bearer development-access-token" },
      body: {
        artifact: { seed: canonicalSeed(), blueprint: canonicalBlueprint() },
        model: "google/gemini-test",
      },
    }, {
      environment,
      providerFactory: () => ({
        provider: "gemini",
        model: "google/gemini-test",
        generate: async request => ({
          text: "{}",
          usage: {
            kind: request.kind,
            stage: request.stage,
            provider: "gemini",
            model: "google/gemini-test",
            inputTokens: 120,
            outputTokens: 4,
            totalTokens: 124,
            generationTimeMs: 50,
            tokenSource: "provider",
          },
        }),
      }),
    });

    expect(response.status).toBe(502);
    expect(response.body).toMatchObject({
      error: expect.stringContaining("Chapter 1 failed during Plan Chapter"),
      failure: {
        chapterNumber: 1,
        stage: "Plan Chapter",
        reason: expect.stringContaining("Plan Chapter validation failed"),
        validationIssues: expect.arrayContaining([
          expect.objectContaining({ field: "chapterNumber", received: "missing" }),
          expect.objectContaining({ field: "sceneProgression", received: "missing" }),
        ]),
      },
      usage: {
        calls: [{ stage: "Plan Chapter", inputTokens: 120, outputTokens: 4 }],
        totals: { inputTokens: 120, outputTokens: 4, totalTokens: 124 },
      },
    });
  });

  it("accepts only the server-produced continuation and sends Chapter N state into Chapter N+1", async () => {
    const providers: ChapterAwareProvider[] = [];
    const providerFactory = () => {
      const provider = new ChapterAwareProvider(providers.length + 1);
      providers.push(provider);
      return provider;
    };
    const first = await handleChapterGenerationHttp({
      method: "POST",
      headers: { Authorization: "Bearer development-access-token" },
      body: {
        artifact: { seed: canonicalSeed(), blueprint: canonicalBlueprint() },
        model: "google/gemini-test",
        temporaryInstruction: "Keep the instruction across the batch.",
      },
    }, { environment, providerFactory });
    expect(first.status).toBe(200);
    const firstResult = first.body as ManifestChapterResponse;

    const second = await handleChapterGenerationHttp({
      method: "POST",
      headers: { Authorization: "Bearer development-access-token" },
      body: {
        artifact: { seed: canonicalSeed(), blueprint: canonicalBlueprint() },
        model: "google/gemini-test",
        temporaryInstruction: "Keep the instruction across the batch.",
        continuation: firstResult.nextContinuation,
      },
    }, { environment, providerFactory });

    expect(second.status).toBe(200);
    const secondResult = second.body as ManifestChapterResponse;
    expect(secondResult.run.chapterPacket.chapterMission).toMatchObject({
      number: 2,
      pacingDirective: "Keep the instruction across the batch.",
    });
    expect(secondResult.run.chapterPacket.chapterMission.premise)
      .toContain(firstResult.run.processingResult.nextChapterHandoff.nextImmediateAction);
    expect(secondResult.run.chapterPacket.livingStoryState).toEqual(
      firstResult.run.processingResult.proposedLivingStoryState,
    );
    expect(secondResult.run.chapterPacket.livingStoryState.characterState.abilities)
      .toContainEqual(expect.objectContaining({ name: "Oath Sight 1" }));
    expect(secondResult.run.chapterPacket.livingStoryState.codex.locations)
      .toContainEqual(expect.objectContaining({ name: "Rain Court Chamber 1" }));
    expect(providers).toHaveLength(2);
    expect(providers.flatMap(provider => provider.requests).map(request => request.kind))
      .toEqual(["plan", "manifest", "process", "plan", "manifest", "process"]);
  });

  it("rejects forged continuations and continuations paired with different artifacts", async () => {
    const providers: ChapterAwareProvider[] = [];
    const providerFactory = () => {
      const provider = new ChapterAwareProvider(providers.length + 1);
      providers.push(provider);
      return provider;
    };
    const first = await handleChapterGenerationHttp({
      method: "POST",
      headers: { Authorization: "Bearer development-access-token" },
      body: {
        artifact: { seed: canonicalSeed(), blueprint: canonicalBlueprint() },
        model: "google/gemini-test",
      },
    }, { environment, providerFactory });
    expect(first.status).toBe(200);
    const continuation = (first.body as ManifestChapterResponse).nextContinuation;
    const forged = structuredClone(continuation);
    forged.livingStoryState.characterState.currentPowerStage = "Forged stage";

    const forgedResponse = await handleChapterGenerationHttp({
      method: "POST",
      headers: { Authorization: "Bearer development-access-token" },
      body: {
        artifact: { seed: canonicalSeed(), blueprint: canonicalBlueprint() },
        model: "google/gemini-test",
        continuation: forged,
      },
    }, { environment, providerFactory });
    const differentBlueprint = canonicalBlueprint();
    differentBlueprint.title = "Different Story";
    const mismatchedResponse = await handleChapterGenerationHttp({
      method: "POST",
      headers: { Authorization: "Bearer development-access-token" },
      body: {
        artifact: { seed: canonicalSeed(), blueprint: differentBlueprint },
        model: "google/gemini-test",
        continuation,
      },
    }, { environment, providerFactory });

    expect(forgedResponse).toMatchObject({
      status: 400,
      body: { error: "Chapter continuation signature is invalid." },
    });
    expect(mismatchedResponse).toMatchObject({
      status: 400,
      body: { error: "Chapter continuation does not belong to the selected Story Seed and Blueprint." },
    });
    expect(providers).toHaveLength(1);
  });
});
