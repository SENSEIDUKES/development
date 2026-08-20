import { describe, expect, it } from "vitest";
import type { StorySeedInput } from "../../../story-seed/shared/storySeedSchema";
import type { WorldBlueprint } from "../../../story-seed/shared/types";
import { adaptFinalizedStorySeedToChapterContracts } from "../packets/storySeedChapterAdapter";
import { assembleChapterPacket } from "../pipeline/assembleChapterPacket";
import type { ChapterPipelineRun } from "../pipeline/types";
import { aggregateChapterTokenUsage } from "../pipeline/usage";
import type { ChapterModelCallUsage } from "../pipeline/usage";
import type { ChapterHandoff } from "../types";
import {
  buildNextChapterContinuation,
  createFiveChapterBatchState,
  errorResponseToBatchFailure,
  assertChapterContinuation,
  runFiveChapterBatch,
  type AuthenticatedChapterGenerationContinuation,
  type ChapterGenerationContinuation,
} from "./chapterBatch";
import type {
  ManifestChapterRequest,
  ManifestChapterResponse,
} from "../liveChapterGeneration";
import { createArcChapterPosition } from "../packets/livingStoryState";

const seed = (): StorySeedInput => ({
  creator: {},
  story: {
    required: {
      storyTags: ["mystery"],
      premise: "A witness must expose the court that erased her family.",
      genre: "Political fantasy",
      style: "chinese",
    },
    optional: {
      intendedForMatureAudiences: false,
      fateSurvival: { enabled: false, visibility: "partial", pressure: "immortal" },
      plotAndTropeSettings: { faceSlap: "low", plotArmor: "medium", recognition: "medium" },
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

const blueprint = (): WorldBlueprint => ({
  blueprintVersion: "v1.0",
  title: "Oath of Rain",
  logline: "Rin must survive the court that buried her family.",
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

const artifact = () => ({ seed: seed(), blueprint: blueprint() });

const authenticated = (
  continuation: ChapterGenerationContinuation,
): AuthenticatedChapterGenerationContinuation => ({
  ...continuation,
  proof: { version: 1, artifactDigest: "test-artifact", signature: "test-signature" },
});

const usageFor = (chapterNumber: number, callCount = 3) => aggregateChapterTokenUsage(
  Array.from({ length: callCount }, (_, index): ChapterModelCallUsage => {
    const stages = [
      "Plan Chapter",
      "Manifest Chapter",
      "Process Result",
      "Repair Chapter",
      "Process Result (repaired chapter)",
    ] as const;
    const kinds = ["plan", "manifest", "process", "repair", "process"] as const;
    return {
      kind: kinds[index],
      stage: stages[index],
      provider: "gemini",
      model: "google/gemini-test",
      inputTokens: chapterNumber * 10,
      outputTokens: chapterNumber * 5,
      totalTokens: chapterNumber * 15,
      generationTimeMs: chapterNumber * 20,
      tokenSource: "provider",
    };
  }),
);

const basePacket = () => assembleChapterPacket(
  adaptFinalizedStorySeedToChapterContracts({
    seed: seed(),
    blueprint: blueprint(),
    temporaryInstruction: "Keep the batch instruction.",
  }).contracts,
);

const resultFor = (
  request: ManifestChapterRequest,
  options: { repair?: boolean; serious?: boolean } = {},
): ManifestChapterResponse => {
  const packet = basePacket();
  if (request.continuation) {
    packet.livingStoryState = structuredClone(request.continuation.livingStoryState);
    packet.chapterMission = structuredClone(request.continuation.chapterMission);
    packet.arcChapterPosition = packet.livingStoryState.position;
  }
  const chapterNumber = packet.chapterMission.number;
  const manifestedText = `Original chapter ${chapterNumber}`;
  const finalText = options.repair ? `Repaired chapter ${chapterNumber}` : manifestedText;
  const handoff: ChapterHandoff = {
    version: 1,
    chapterNumber,
    endState: {
      location: `Court chamber ${chapterNumber}`,
      charactersPresent: ["Rin"],
      mcCondition: `Witness stage ${chapterNumber}`,
      openTension: `The court closes gate ${chapterNumber}.`,
    },
    completedEvents: [`Rin completed chapter event ${chapterNumber}.`],
    nextImmediateAction: `Confront witness ${chapterNumber + 1}.`,
    fingerprints: [{
      actionType: "revelation",
      participants: ["Rin"],
      location: `Court chamber ${chapterNumber}`,
      outcome: `Oath ${chapterNumber} exposed.`,
      chapterNumber,
    }],
  };
  const current = packet.livingStoryState;
  const characterChanges = [`Rin reaches witness stage ${chapterNumber}.`];
  const worldStateChanges = [`Court gate ${chapterNumber} closes.`];
  const characterStateUpdates = {
    currentPowerStage: `Witness stage ${chapterNumber}`,
    abilities: [{ name: `Oath sight ${chapterNumber}`, chapterNumber }],
  };
  const codexUpdates = {
    characters: [{ name: "Rin", lastChangedChapter: chapterNumber }],
    bestiary: [],
    factions: [{ name: `Court faction ${chapterNumber}` }],
    locations: [{ name: `Court chamber ${chapterNumber}` }],
    artifacts: [{ name: `Oath shard ${chapterNumber}` }],
  };
  const nextState = {
    ...structuredClone(current),
    position: createArcChapterPosition(chapterNumber + 1, current.position.chaptersInArc),
    contextBlocks: [...current.contextBlocks, {
      kind: "recent-summary" as const,
      chapterNumber,
      text: finalText,
    }],
    previousHandoff: handoff,
    recentFingerprints: [...current.recentFingerprints, ...handoff.fingerprints],
    characterState: {
      currentPowerStage: characterStateUpdates.currentPowerStage,
      abilities: [...current.characterState.abilities, ...characterStateUpdates.abilities],
    },
    codex: {
      characters: [...current.codex.characters, ...codexUpdates.characters],
      bestiary: [...(current.codex.bestiary ?? []), ...(codexUpdates.bestiary ?? [])],
      factions: [...current.codex.factions, ...codexUpdates.factions],
      locations: [...current.codex.locations, ...codexUpdates.locations],
      artifacts: [...current.codex.artifacts, ...codexUpdates.artifacts],
    },
    scene: {
      ...current.scene,
      recentSceneTypes: [...current.scene.recentSceneTypes, "progression" as const],
      carriedAnchors: {
        worldBuilding: `World anchor ${chapterNumber}`,
        conflict: `Conflict anchor ${chapterNumber}`,
        progression: `Progression anchor ${chapterNumber}`,
      },
    },
    carriedChanges: [...current.carriedChanges, {
      chapterNumber,
      characterChanges,
      worldStateChanges,
      threadChanges: [`Thread changed ${chapterNumber}`],
      completedThreads: [],
      characterStateUpdates,
      codexUpdates,
    }],
  };
  const chapter = {
    storyId: "development-oath-of-rain",
    chapterNumber,
    generatedContent: manifestedText,
    blocks: [{ id: `c${chapterNumber}-p1`, type: "paragraph" as const, text: manifestedText }],
  };
  const finalOutput = {
    ...chapter,
    generatedContent: finalText,
    blocks: [{ id: `c${chapterNumber}-p1-final`, type: "paragraph" as const, text: finalText }],
    handoff,
  };
  const run: ChapterPipelineRun = {
    stages: [],
    finalOutput,
    chapterPacket: packet,
    chapterPlan: {
      version: 1,
      chapterNumber,
      arcChapterPosition: packet.livingStoryState.position.display,
      rhythmResponse: { recentSceneTypes: current.scene.recentSceneTypes, direction: "Advance." },
      resolvedSceneType: "progression",
      fateSurvival: { configured: true, applies: false, approach: "Disabled." },
      effects: [],
      sceneProgression: [{ order: 1, purpose: "Advance.", pacing: "Measured." }],
      pacing: { directive: packet.chapterMission.pacingDirective, shape: "Escalate." },
      intendedEnding: handoff.endState.openTension ?? "Continue.",
      nextChapterHandoffTarget: handoff.nextImmediateAction ?? "Continue from the handoff.",
    },
    manifestedChapter: chapter,
    processingResult: {
      version: 1,
      newAnchors: nextState.scene.carriedAnchors,
      characterChanges,
      worldStateChanges,
      characterStateUpdates,
      codexUpdates,
      threads: {
        completed: [],
        changed: [`Thread changed ${chapterNumber}`],
        unresolved: current.threads.unresolved,
      },
      missionCompletion: { completed: true, evidence: `Chapter ${chapterNumber} advanced.` },
      continuityFindings: options.serious
        ? [{ severity: "serious", code: "continuity", message: "Continuity still breaks." }]
        : [],
      repetitionFindings: [],
      identityWarnings: [],
      nextChapterHandoff: handoff,
      proposedLivingStoryState: nextState,
      repairRecommended: options.serious ?? false,
    },
    modelCalls: options.repair
      ? ["plan", "manifest", "process", "repair", "process"]
      : ["plan", "manifest", "process"],
    repairApplied: options.repair ?? false,
  };
  return {
    provider: "gemini",
    model: request.model,
    run,
    usage: usageFor(chapterNumber, options.repair ? 5 : 3),
    mapping: { mapped: [], unresolved: [], chapterMissionSource: "batch-test" },
    nextContinuation: authenticated(buildNextChapterContinuation({
      run,
      firstArcPromise: blueprint().firstArcPromise,
      temporaryInstruction: request.temporaryInstruction,
    })),
  };
};

const batchRequest = () => ({
  artifact: artifact(),
  model: "google/gemini-test",
  temporaryInstruction: "Keep the batch instruction.",
});

describe("five-chapter Development batch", () => {
  it("uses five separate chapter-sized requests strictly sequentially and carries final state", async () => {
    const order: number[] = [];
    const statuses: string[] = [];
    let inFlight = 0;
    let previousResult: ManifestChapterResponse | undefined;
    const requestInput = batchRequest();
    const originalArtifact = structuredClone(requestInput.artifact);

    const state = await runFiveChapterBatch({
      state: createFiveChapterBatchState(),
      request: requestInput,
      onUpdate: update => statuses.push(
        update.chapters.find(chapter => chapter.chapterNumber === update.activeChapterNumber)?.status
        ?? update.chapters.find(chapter => !["queued", "completed"].includes(chapter.status))?.status
        ?? update.status,
      ),
      manifestChapter: async (request, onStage) => {
        expect(inFlight).toBe(0);
        inFlight += 1;
        const chapterNumber = request.continuation?.chapterMission.number ?? 1;
        order.push(chapterNumber);
        onStage("Plan Chapter");
        await Promise.resolve();
        onStage("Manifest Chapter");
        await Promise.resolve();
        onStage("Process Result");
        if (previousResult) {
          expect(request.continuation).toEqual(previousResult.nextContinuation);
          expect(request.continuation?.livingStoryState.previousHandoff)
            .toEqual(previousResult.run.processingResult.nextChapterHandoff);
          expect(request.continuation?.livingStoryState.carriedChanges).toHaveLength(chapterNumber - 1);
          expect(request.continuation?.livingStoryState.characterState.abilities)
            .toContainEqual(expect.objectContaining({ name: `Oath sight ${chapterNumber - 1}` }));
          expect(request.continuation?.livingStoryState.codex.locations)
            .toContainEqual(expect.objectContaining({ name: `Court chamber ${chapterNumber - 1}` }));
          expect(request.continuation?.chapterMission.premise).toContain(`Confront witness ${chapterNumber}.`);
          expect(request.continuation?.chapterMission.premise).toContain("First-arc promise:");
          expect(request.continuation?.chapterMission.pacingDirective).toBe("Keep the batch instruction.");
        }
        const result = resultFor(request);
        previousResult = result;
        inFlight -= 1;
        return result;
      },
    });

    expect(order).toEqual([1, 2, 3, 4, 5]);
    expect(state.status).toBe("completed");
    expect(state.chapters.every(chapter => chapter.status === "completed")).toBe(true);
    expect(state.chapters.map(chapter => chapter.result?.run.chapterPacket.chapterMission.number))
      .toEqual([1, 2, 3, 4, 5]);
    expect(statuses).toEqual(expect.arrayContaining(["planning", "manifesting", "processing", "completed"]));
    expect(requestInput.artifact).toEqual(originalArtifact);
    expect(state.usage.calls).toHaveLength(15);
  });

  it("feeds repaired output and its reprocessed state into the next chapter", async () => {
    let chapterTwoContinuation: ChapterGenerationContinuation | undefined;
    const state = await runFiveChapterBatch({
      state: createFiveChapterBatchState(),
      request: batchRequest(),
      manifestChapter: async (request, onStage) => {
        onStage("Plan Chapter");
        onStage("Manifest Chapter");
        onStage("Process Result");
        const chapterNumber = request.continuation?.chapterMission.number ?? 1;
        if (chapterNumber === 2) chapterTwoContinuation = request.continuation;
        return resultFor(request, { repair: chapterNumber === 1 });
      },
    });

    expect(chapterTwoContinuation?.livingStoryState.contextBlocks.at(-1)?.text)
      .toBe("Repaired chapter 1");
    expect(chapterTwoContinuation?.livingStoryState.previousHandoff?.chapterNumber).toBe(1);
    expect(state.usage.calls).toHaveLength(17);
  });

  it("pauses on a final serious finding and never starts a later chapter", async () => {
    const attempted: number[] = [];
    const state = await runFiveChapterBatch({
      state: createFiveChapterBatchState(),
      request: batchRequest(),
      manifestChapter: async request => {
        const chapterNumber = request.continuation?.chapterMission.number ?? 1;
        attempted.push(chapterNumber);
        return resultFor(request, { serious: chapterNumber === 2 });
      },
    });

    expect(attempted).toEqual([1, 2]);
    expect(state.status).toBe("paused");
    expect(state.chapters[0].status).toBe("completed");
    expect(state.chapters[1].status).toBe("paused");
    expect(state.chapters[1].checkpoint).toEqual(state.chapters[0].result?.nextContinuation);
    expect(state.chapters[2].status).toBe("queued");
  });

  it("rejects a missing continuation instead of silently restarting Chapter 1", async () => {
    const state = await runFiveChapterBatch({
      state: createFiveChapterBatchState(),
      request: batchRequest(),
      manifestChapter: async request => {
        const result = resultFor(request);
        Reflect.deleteProperty(result, "nextContinuation");
        return result;
      },
    });

    expect(state.status).toBe("paused");
    expect(state.chapters[0].status).toBe("failed");
    expect(state.chapters[1].status).toBe("queued");
    expect(state.chapters[0].attempts[0].usage.calls).toHaveLength(3);
    expect(state.chapters[0].error).toContain("continuation");
  });

  it.each([
    {
      name: "unsupported version",
      mutate: (value: ChapterGenerationContinuation) => {
        (value as { version: number }).version = 2;
      },
      message: /version is unsupported/,
    },
    {
      name: "mission below Chapter 2",
      mutate: (value: ChapterGenerationContinuation) => {
        value.chapterMission.number = 1;
      },
      message: /valid next Chapter Mission/,
    },
    {
      name: "mismatched position",
      mutate: (value: ChapterGenerationContinuation) => {
        value.livingStoryState.position.chapterInArc += 1;
      },
      message: /position does not match/,
    },
    {
      name: "non-immediate handoff",
      mutate: (value: ChapterGenerationContinuation) => {
        if (value.livingStoryState.previousHandoff) {
          value.livingStoryState.previousHandoff.chapterNumber -= 1;
        }
      },
      message: /immediately previous handoff/,
    },
    {
      name: "mismatched contract chapter",
      mutate: (value: ChapterGenerationContinuation) => {
        if (value.chapterMission.contract) value.chapterMission.contract.chapterNumber += 1;
      },
      message: /contract does not match/,
    },
  ])("rejects a continuation with $name", ({ mutate, message }) => {
    const continuation = structuredClone(resultFor({
      artifact: artifact(),
      model: "google/gemini-test",
    }).nextContinuation);
    mutate(continuation);

    expect(() => assertChapterContinuation(continuation)).toThrow(message);
  });

  it("forwards cancellation and stops at the next clean checkpoint", async () => {
    const controller = new AbortController();
    const receivedSignals: Array<AbortSignal | undefined> = [];
    let calls = 0;

    const state = await runFiveChapterBatch({
      state: createFiveChapterBatchState(),
      request: { artifact: artifact(), model: "google/gemini-test" },
      signal: controller.signal,
      manifestChapter: async (request, _onStage, signal) => {
        calls += 1;
        receivedSignals.push(signal);
        const result = resultFor(request);
        controller.abort();
        return result;
      },
    });

    expect(calls).toBe(1);
    expect(receivedSignals).toEqual([controller.signal]);
    expect(state.status).toBe("paused");
    expect(state.chapters[0].status).toBe("completed");
    expect(state.chapters[1]).toMatchObject({
      status: "paused",
      checkpoint: state.chapters[0].result?.nextContinuation,
    });
    expect(state.chapters[2].status).toBe("queued");
  });

  it("retries a failed chapter from its clean checkpoint without advancing or duplicating state", async () => {
    let failedOnce = false;
    const withChapterThreeMoment = (
      result: ManifestChapterResponse,
      chapterNumber: number,
    ): ManifestChapterResponse => {
      if (chapterNumber !== 3) return result;
      result.run.finalOutput.generatedContent = "The witness bell tolled once above the court.";
      result.run.finalOutput.blocks = [{
        id: "c3-p1",
        type: "paragraph",
        text: "The witness bell tolled once above the court.",
      }];
      result.run.finalOutput.audioMoments = [{
        id: "world-cue:c3-p1:0:test",
        blockId: "c3-p1",
        triggerPhrase: "witness bell tolled once",
        occurrenceIndex: 0,
        sourceCategory: "locations",
        variation: "signatures",
        semanticTags: ["bell", "resonant"],
        relatedEntity: { name: "Witness Hall", type: "location" },
        cue: {
          publicUrl: "https://celestialaudio.seihouse.org/DEFAULT/Locations/Signatures/Temple_Bell_1.mp3",
        },
      }];
      return result;
    };
    const firstRun = await runFiveChapterBatch({
      state: createFiveChapterBatchState(),
      request: batchRequest(),
      manifestChapter: async request => {
        const chapterNumber = request.continuation?.chapterMission.number ?? 1;
        if (chapterNumber === 3 && !failedOnce) {
          failedOnce = true;
          throw errorResponseToBatchFailure({
            error: "Temporary provider failure.",
            usage: usageFor(3, 1),
          });
        }
        return withChapterThreeMoment(resultFor(request), chapterNumber);
      },
    });
    const checkpoint = structuredClone(firstRun.chapters[2].checkpoint);
    const retried: number[] = [];

    const completed = await runFiveChapterBatch({
      state: firstRun,
      request: batchRequest(),
      manifestChapter: async request => {
        const chapterNumber = request.continuation?.chapterMission.number ?? 1;
        retried.push(chapterNumber);
        if (chapterNumber === 3) expect(request.continuation).toEqual(checkpoint);
        return withChapterThreeMoment(resultFor(request), chapterNumber);
      },
    });

    expect(firstRun.chapters.map(chapter => chapter.status))
      .toEqual(["completed", "completed", "failed", "queued", "queued"]);
    expect(retried).toEqual([3, 4, 5]);
    expect(completed.status).toBe("completed");
    expect(completed.chapters[2].attempts).toHaveLength(2);
    expect(completed.chapters[2].result?.run.finalOutput.audioMoments).toHaveLength(1);
    expect(completed.chapters[2].result?.run.finalOutput.audioMoments?.[0].id)
      .toBe("world-cue:c3-p1:0:test");
    expect(completed.usage.calls).toHaveLength(16);
    expect(completed.usage.totals.totalTokens).toBe(
      completed.usage.calls.reduce((total, call) => total + call.totalTokens, 0),
    );
  });
});
