import { describe, expect, it, vi } from "vitest";
import { assembleChapterGeneration } from "../assembleGeneration";
import { assembleChapterGenerationDev } from "../assembleGenerationDev";
import { ESTABLISHED_SCENARIO } from "../fixtures/mockGenerationData";
import { assembleChapterGenerationPacket } from "../packets";
import type { ChapterContent, ChapterHandoff } from "../types";
import { assembleChapterPacket } from "./assembleChapterPacket";
import { runChapterPipeline } from "./runChapterPipeline";
import type {
  ChapterGenerationModelCalls,
  ManifestChapterInput,
  ChapterPacket,
  ChapterProcessingResult,
  ProcessChapterInput,
  RepairChapterInput,
} from "./types";
import {
  buildWorkshopChapterPlan,
  buildWorkshopProcessingResult,
} from "./workshopModelCalls";

const GENERATED_HANDOFF: ChapterHandoff = {
  version: 1,
  chapterNumber: 6,
  endState: {
    location: "The collapsed shrine beneath Azure Bell Peak",
    timeMarker: "moments later, same night",
    charactersPresent: ["Wen Shu", "Mei Lian"],
    mcCondition: "meridians raw but intact",
    openTension: "Elder Nan's patrol reaches the shrine entrance.",
  },
  completedEvents: ["The presence behind the cracked seal was contained."],
  nextImmediateAction: "Wen Shu and Mei Lian must answer Elder Nan's arrival.",
  fingerprints: [{
    actionType: "other",
    participants: ["Wen Shu", "Mei Lian"],
    location: "The collapsed shrine beneath Azure Bell Peak",
    outcome: "The presence behind the cracked seal was contained.",
    chapterNumber: 6,
  }],
};

const MANIFESTED_CHAPTER: ChapterContent = {
  storyId: "pipeline-test-story",
  chapterNumber: 6,
  generatedContent: "Wen Shu and Mei Lian contained the presence as Elder Nan arrived.",
  summary: "The seal threat was contained, but Elder Nan reached the shrine.",
  statsChangeMessage: "None",
};

const buildPacket = (): ChapterPacket => {
  const contracts = assembleChapterGenerationPacket(ESTABLISHED_SCENARIO, {
    recentSceneTypes: ["worldBuilding", "conflict", "progression"],
  });
  const contractsWithPermanentSettings = {
    ...contracts,
    storyConstitution: {
      ...contracts.storyConstitution,
      accessibilityStyle: "Easy Read" as const,
      fateSurvival: {
        enabled: true,
        visibility: "partial" as const,
        pressure: "immortal" as const,
      },
    },
  };
  return assembleChapterPacket(contractsWithPermanentSettings);
};

const makeModel = () => {
  const planChapter = vi.fn(buildWorkshopChapterPlan);
  const manifestChapter = vi.fn((_input: ManifestChapterInput) => ({ ...MANIFESTED_CHAPTER }));
  const processResult = vi.fn((input: ProcessChapterInput) =>
    buildWorkshopProcessingResult(input, GENERATED_HANDOFF));
  const repairChapter = vi.fn(({ manifestedChapter }: RepairChapterInput) => manifestedChapter);
  const model: ChapterGenerationModelCalls = {
    planChapter,
    manifestChapter,
    processResult,
    repairChapter,
  };
  return { model, planChapter, manifestChapter, processResult, repairChapter };
};

describe("four-stage Chapter Generation pipeline", () => {
  it("uses four actual stages in both current generation flows", () => {
    const expectedKeys = [
      "assemble-chapter-packet",
      "plan-chapter",
      "manifest-chapter",
      "process-result",
    ];

    expect(assembleChapterGeneration("established").stages.map(stage => stage.key))
      .toEqual(expectedKeys);
    expect(assembleChapterGenerationDev(
      "established",
      "balanced-pressure",
      "story-default",
    ).stages.map(stage => stage.key)).toEqual(expectedKeys);
  });

  it("assembles a complete, serializable Stage 1 packet without a model dependency", () => {
    const packet = buildPacket();
    const clonedPacket = structuredClone(packet);

    expect(packet.arcChapterPosition.display).toBe("Arc 1 — Chapter 6/100");
    expect(packet.version).toBe(1);
    expect(clonedPacket).toEqual(packet);
    expect(JSON.stringify(packet)).not.toContain("planChapter");
  });

  it("uses one planning, writing, and processing call on the normal path", () => {
    const packet = buildPacket();
    const calls = makeModel();
    const run = runChapterPipeline({
      chapterPacket: packet,
      model: calls.model,
      planningSignals: { fatePressureTier: "Balanced" },
    });

    expect(run.modelCalls).toEqual(["plan", "manifest", "process"]);
    expect(calls.planChapter).toHaveBeenCalledTimes(1);
    expect(calls.manifestChapter).toHaveBeenCalledTimes(1);
    expect(calls.processResult).toHaveBeenCalledTimes(1);
    expect(calls.repairChapter).not.toHaveBeenCalled();
  });

  it("carries permanent story rules into the packet and writing call without extra calls", () => {
    const packet = buildPacket();
    const calls = makeModel();
    const run = runChapterPipeline({ chapterPacket: packet, model: calls.model });

    expect(packet.storyConstitution.fateSurvival).toEqual({
      enabled: true,
      visibility: "partial",
      pressure: "immortal",
    });
    expect(packet.storyConstitution.worldRules).toEqual(ESTABLISHED_SCENARIO.memory.worldRules);
    expect(packet.storyConstitution).not.toHaveProperty("fatePressureTier");
    expect(packet.culturalProse.styleId).toBe("chinese-classical-worldbuilding");
    expect(packet.generationRules.permanentWritingInstructions).toContain("adult Easy Read style");
    expect(packet.generationRules.permanentWritingInstructions).toContain("CULTURAL PROSE STYLE");
    expect(packet.generationRules.permanentWritingInstructions).toContain("CHAPTER EFFECT RULES");
    expect(packet.generationRules.effectRules).toContain("NARRATIVE CUE PAYLOAD");
    expect(run.modelCalls).toEqual(["plan", "manifest", "process"]);
    expect(calls.manifestChapter.mock.calls[0][0]).toMatchObject({
      chapterPacket: packet,
      chapterPlan: run.chapterPlan,
      consolidatedPermanentInstructions: packet.generationRules.permanentWritingInstructions,
    });
  });

  it("makes chapter-specific Fate and effect decisions during planning", () => {
    const packet = buildPacket();
    const calls = makeModel();
    const run = runChapterPipeline({
      chapterPacket: packet,
      model: calls.model,
      planningSignals: { fatePressureTier: "Hardcore" },
    });

    expect(run.chapterPlan.fateSurvival).toMatchObject({
      configured: true,
      applies: true,
      visibility: "partial",
      pressure: "immortal",
    });
    expect(run.chapterPlan.selectedScenePath?.type).toBe("conflict");
    expect(run.chapterPlan.resolvedSceneType).toBe("conflict");
    expect(run.chapterPlan.effects.map(effect => effect.kind)).toContain("scene-music");
    expect(run.chapterPlan.effects).toContainEqual(expect.objectContaining({
      kind: "world-cue",
      intent: expect.stringContaining("drew the Ashen Sword from its sheath"),
    }));
    expect(run.chapterPlan.rhythmResponse.selectedPressureTier).toBe("Hardcore");
    expect(calls.planChapter).toHaveBeenCalledTimes(1);

    const quieterPlan = buildWorkshopChapterPlan({
      chapterPacket: { ...packet, existingAnchors: undefined },
      planningSignals: { fatePressureTier: "Relaxed" },
    });
    expect(quieterPlan.fateSurvival).toMatchObject({
      configured: true,
      applies: false,
    });
    expect(quieterPlan.resolvedSceneType).toBe("worldBuilding");

    const unconfiguredPlan = buildWorkshopChapterPlan({
      chapterPacket: assembleChapterPacket(
        assembleChapterGenerationPacket(ESTABLISHED_SCENARIO),
      ),
      planningSignals: {},
    });
    expect(unconfiguredPlan.fateSurvival.configured).toBe(false);
    expect(unconfiguredPlan.fateSurvival).not.toHaveProperty("visibility");
    expect(unconfiguredPlan.fateSurvival).not.toHaveProperty("pressure");
  });

  it("sources new anchors and proposed state changes from result processing", () => {
    const packet = buildPacket();
    const originalState = structuredClone(packet.livingStoryState);
    const calls = makeModel();
    const run = runChapterPipeline({ chapterPacket: packet, model: calls.model });

    expect(run.manifestedChapter).not.toHaveProperty("handoff");
    expect(run.manifestedChapter).not.toHaveProperty("newAnchors");
    expect(run.processingResult.newAnchors).toBeDefined();
    expect(run.processingResult.nextChapterHandoff).toEqual(GENERATED_HANDOFF);
    expect(run.processingResult.proposedLivingStoryState.position.display)
      .toBe("Arc 1 — Chapter 7/100");
    expect(packet.livingStoryState).toEqual(originalState);
  });

  it("keeps Living Story State immutable across retries", () => {
    const packet = buildPacket();
    const originalState = structuredClone(packet.livingStoryState);

    runChapterPipeline({ chapterPacket: packet, model: makeModel().model });
    runChapterPipeline({ chapterPacket: packet, model: makeModel().model });

    expect(packet.livingStoryState).toEqual(originalState);
    expect(packet.livingStoryState.position.display).toBe("Arc 1 — Chapter 6/100");
  });

  it("runs the optional repair call only for a serious processing finding", () => {
    const packet = buildPacket();
    const warningCalls = makeModel();
    warningCalls.processResult.mockImplementation((input: ProcessChapterInput) => ({
      ...buildWorkshopProcessingResult(input, GENERATED_HANDOFF),
      continuityFindings: [{
        severity: "warning",
        code: "minor-drift",
        message: "A minor tone drift does not justify regeneration.",
      }],
      repairRecommended: true,
    }));
    const warningRun = runChapterPipeline({
      chapterPacket: packet,
      model: warningCalls.model,
    });
    expect(warningRun.modelCalls).toEqual(["plan", "manifest", "process"]);
    expect(warningRun.repairApplied).toBe(false);
    expect(warningCalls.repairChapter).not.toHaveBeenCalled();

    const seriousCalls = makeModel();
    seriousCalls.processResult
      .mockImplementationOnce((input: ProcessChapterInput): ChapterProcessingResult => ({
        ...buildWorkshopProcessingResult(input, GENERATED_HANDOFF),
        continuityFindings: [{
          severity: "serious",
          code: "canon-break",
          message: "The chapter contradicts the required opening state.",
        }],
        repairRecommended: true,
      }))
      .mockImplementationOnce((input: ProcessChapterInput) =>
        buildWorkshopProcessingResult(input, GENERATED_HANDOFF));
    seriousCalls.repairChapter.mockImplementation(({ manifestedChapter }) => ({
      ...manifestedChapter,
      generatedContent: `${manifestedChapter.generatedContent} [repaired]`,
    }));
    const seriousRun = runChapterPipeline({
      chapterPacket: packet,
      model: seriousCalls.model,
    });

    expect(seriousRun.modelCalls).toEqual([
      "plan",
      "manifest",
      "process",
      "repair",
      "process",
    ]);
    expect(seriousRun.repairApplied).toBe(true);
    expect(seriousCalls.repairChapter).toHaveBeenCalledTimes(1);
    expect(seriousCalls.processResult).toHaveBeenCalledTimes(2);
    expect(seriousCalls.processResult.mock.calls[1][0].manifestedChapter.generatedContent)
      .toContain("[repaired]");
    expect(seriousRun.finalOutput.generatedContent).toContain("[repaired]");
  });

  it("resolves only the accepted repaired chapter's audible action moments", () => {
    const packet = buildPacket();
    const originalChapter: ChapterContent = {
      ...MANIFESTED_CHAPTER,
      generatedContent: "Wen Shu drew the Ashen Sword from its sheath.",
      blocks: [{
        id: "c6-p1",
        type: "paragraph",
        text: "Wen Shu drew the Ashen Sword from its sheath.",
        metadata: {
          audioMoments: [{
            blockId: "c6-p1",
            triggerPhrase: "drew the Ashen Sword from its sheath",
            occurrenceIndex: 0,
            sourceCategory: "weapons",
            variation: "unsheathe",
            semanticTags: ["sword", "draw", "metal"],
            relatedEntity: { name: "Ashen Sword", type: "artifact" },
          }],
        },
      }],
    };
    const repairedChapter: ChapterContent = {
      ...MANIFESTED_CHAPTER,
      generatedContent: "The sect gong sounded once above the shrine.",
      blocks: [{
        id: "c6-p1",
        type: "paragraph",
        text: "The sect gong sounded once above the shrine.",
        metadata: {
          audioMoments: [{
            blockId: "c6-p1",
            triggerPhrase: "sect gong sounded once",
            occurrenceIndex: 0,
            sourceCategory: "locations",
            variation: "signatures",
            semanticTags: ["gong", "resonant", "deep"],
            relatedEntity: { name: "Azure Bell Peak", type: "location" },
          }],
        },
      }],
    };
    const calls = makeModel();
    calls.manifestChapter.mockReturnValue(originalChapter);
    calls.processResult
      .mockImplementationOnce((input: ProcessChapterInput): ChapterProcessingResult => ({
        ...buildWorkshopProcessingResult(input, GENERATED_HANDOFF),
        continuityFindings: [{
          severity: "serious",
          code: "wrong-audible-beat",
          message: "The original action contradicts the required opening.",
        }],
        repairRecommended: true,
      }))
      .mockImplementationOnce((input: ProcessChapterInput) =>
        buildWorkshopProcessingResult(input, GENERATED_HANDOFF));
    calls.repairChapter.mockReturnValue(repairedChapter);

    const run = runChapterPipeline({ chapterPacket: packet, model: calls.model });

    expect(run.repairApplied).toBe(true);
    expect(run.finalOutput.audioMoments).toEqual([
      expect.objectContaining({
        blockId: "c6-p1",
        triggerPhrase: "sect gong sounded once",
        cue: { publicUrl: expect.stringContaining("/Locations/Signatures/") },
      }),
    ]);
    expect(JSON.stringify(run.finalOutput.audioMoments)).not.toContain("Ashen Sword");
    expect(run.finalOutput.blocks?.[0].metadata?.audioMoments).toBeUndefined();
    expect(repairedChapter.blocks?.[0].metadata).toHaveProperty("audioMoments");
  });

  it("preserves only valid server-produced dialogue artifacts on their exact quote", () => {
    const packet = buildPacket();
    const dialogueChapter: ChapterContent = {
      ...MANIFESTED_CHAPTER,
      generatedContent: '“The archive remembers.”',
      blocks: [{
        id: "c6-p1",
        type: "dialogue",
        text: '“The archive remembers.”',
        metadata: { speakerName: "Wen Shu", mode: "dialogue" },
      }],
      audioMoments: [{
        id: "dialogue:c6-p1:0:wen-shu",
        blockId: "c6-p1",
        triggerPhrase: '“The archive remembers.”',
        occurrenceIndex: 0,
        sourceCategory: "voice",
        actionType: "spoken-dialogue",
        semanticTags: ["dialogue"],
        relatedEntity: { id: "character-wen-shu", name: "Wen Shu", type: "character" },
        voiceKey: "ancient-master-female",
        artifact: {
          publicUrl: "https://celestialaudio.seihouse.org/dialogue/character-wen-shu/c6-p1.mp3",
        },
      }],
    };
    const calls = makeModel();
    calls.manifestChapter.mockReturnValue(dialogueChapter);

    const run = runChapterPipeline({ chapterPacket: packet, model: calls.model });

    expect(run.finalOutput.audioMoments).toEqual([
      expect.objectContaining({
        id: "dialogue:c6-p1:0:wen-shu",
        sourceCategory: "voice",
        blockId: "c6-p1",
      }),
    ]);
  });

  it("includes the arc/chapter counter in context visible to planning and writing", () => {
    const packet = buildPacket();
    const calls = makeModel();
    runChapterPipeline({ chapterPacket: packet, model: calls.model });

    expect(packet.modelVisibleContext).toContain("Arc 1 — Chapter 6/100");
    expect(calls.planChapter.mock.calls[0][0].chapterPacket.modelVisibleContext)
      .toContain("Arc 1 — Chapter 6/100");
    expect(calls.manifestChapter.mock.calls[0][0].chapterPacket.modelVisibleContext)
      .toContain("Arc 1 — Chapter 6/100");
  });
});
