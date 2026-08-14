import { describe, expect, it } from "vitest";
import { createCompletedFiveChapterTestBatch } from "../../chapter-generation/shared/batch/chapterBatchTestFixture";
import { buildBatchReviewMarkdown } from "../../chapter-generation/shared/reviewExports";
import {
  buildFiveChapterReaderExport,
  convertBatchToReaderChapters,
  createChapterScopedCodexStory,
  createCompletedBatchReaderSession,
  createCompletedSingleChapterReaderSession,
  createReaderCodexSnapshots,
  extractBatchStoryState,
} from "./batchToReaderAdapter";

describe("batchToReaderAdapter", () => {
  it("adapts one accepted final output and processed Living Story State without manufacturing a batch", () => {
    const response = structuredClone(createCompletedFiveChapterTestBatch().chapters[0].result!);
    delete (response.run.processingResult as { identityWarnings?: unknown }).identityWarnings;
    const sourceBefore = structuredClone(response);

    const session = createCompletedSingleChapterReaderSession(response);

    expect(session.chapters).toHaveLength(1);
    expect(session.chapters[0]).toMatchObject({
      number: 1,
      title: "Generated Title 1",
      generatedContent: "Final prose 1.",
      hasContent: true,
    });
    expect(session.story.arcs).toHaveLength(1);
    expect(session.story.arcs[0].chapters).toHaveLength(1);
    expect(session.codexSnapshots).toHaveLength(1);
    expect(session.codexSnapshots[0].livingStoryState)
      .toEqual(response.run.processingResult.proposedLivingStoryState);
    expect(session.codexSnapshots[0].memory.characters?.map(character => character.name))
      .toEqual(["Known by Chapter 1"]);
    expect(session.chapterUsage).toEqual(response.usage);
    expect(response).toEqual(sourceBefore);
  });

  it("adapts a completed real Pass 2-shaped batch into five Reader chapters without mutating it", () => {
    const batch = createCompletedFiveChapterTestBatch();
    const sourceBefore = structuredClone(batch);
    const resolution = createCompletedBatchReaderSession(batch);

    expect(resolution.ok).toBe(true);
    if (!resolution.ok) throw new Error(resolution.reason);
    expect(resolution.session.chapters).toHaveLength(5);
    expect(resolution.session.chapters.map(chapter => chapter.number)).toEqual([1, 2, 3, 4, 5]);
    expect(resolution.session.chapters.map(chapter => chapter.title)).toEqual([
      "Generated Title 1",
      "Generated Title 2",
      "Generated Title 3",
      "Generated Title 4",
      "Generated Title 5",
    ]);
    expect(batch).toEqual(sourceBefore);
  });

  it("uses repaired final prose and retains supported blocks, system panels, position, and chapter data", () => {
    const chapters = convertBatchToReaderChapters(createCompletedFiveChapterTestBatch());
    const repaired = chapters[2];

    expect(repaired.generatedContent).toBe("Repaired final prose 3.");
    expect(repaired.generatedContent).not.toContain("Original manifested prose");
    expect(repaired.blocks?.[1].system?.title).toBe("System Panel 3");
    expect(repaired.generationPosition?.chapterInArc).toBe(3);
    expect(repaired.codexPowerStage).toBe("Stage 3");
    expect(repaired.summary).toBe("Summary 3");
    expect(repaired.statsChangeMessage).toBe("Change 3");
    expect(repaired.repairApplied).toBe(true);
  });

  it("creates cumulative chapter snapshots without exposing future Codex knowledge", () => {
    const batch = createCompletedFiveChapterTestBatch();
    const snapshots = createReaderCodexSnapshots(batch);

    expect(snapshots).toHaveLength(5);
    expect(snapshots[0].memory.characters?.map(character => character.name)).toEqual([
      "Known by Chapter 1",
    ]);
    expect(snapshots[1].memory.characters?.map(character => character.name)).toEqual([
      "Known by Chapter 1",
      "Known by Chapter 2",
    ]);
    expect(snapshots[0].memory.characters?.some(character => character.name === "Known by Chapter 5")).toBe(false);
    expect(snapshots[4].memory.characters?.some(character => character.name === "Known by Chapter 5")).toBe(true);
    expect(extractBatchStoryState(batch).latestCharacterState?.currentPowerStage).toBe("Stage 5");
  });

  it("translates genuine Seed, Blueprint, and processed state into Reader Codex fields", () => {
    const batch = createCompletedFiveChapterTestBatch();
    const firstRun = batch.chapters[0].result!.run;
    firstRun.chapterPacket.storyConstitution.powerSystem = "Oath Spark → Seal Heart → Crown Soul";
    firstRun.chapterPacket.storyConstitution.worldRules = ["Broken oaths leave visible scars."];
    firstRun.processingResult.proposedLivingStoryState.characterState = {
      currentPowerStage: "Oath Spark",
      abilities: [{
        name: "Oath-sight",
        description: "Reads fractures left by broken promises.",
        masteryLevel: "Awakened",
      }],
    };
    firstRun.processingResult.proposedLivingStoryState.codex = {
      characters: [{
        id: "seed-character-1",
        name: "Minister Sui",
        aliases: ["The Quiet Minister"],
        alternateNames: ["Court Whisper"],
        role: "Reluctant witness",
        connectionToMC: "Uneasy ally",
        rankLevel: "Seal Heart",
        bio: "A tribunal minister who remembers an impossible verdict.",
        appearance: "Silver eyes beneath a red court veil.",
      }, {
        id: "dev-character-lei",
        name: "Lei",
        role: "Recurring sky guide",
        description: "A young thunder dragon who guides Rin through the sealed storm gate.",
        portraitKind: "non-human",
        speciesId: "dev-creature-thunder-dragons",
      }],
      factions: [{
        id: "seed-faction-1",
        name: "Vermilion Tribunal",
        alignment: "Neutral",
        description: "The oath-bound succession court.",
      }],
      locations: [{
        name: "Rain Court",
        description: "A court beneath a sealed dead heaven.",
        worldType: "Cultivation empire",
      }],
      artifacts: [],
      bestiary: [{
        id: "dev-creature-thunder-dragons",
        name: "Thunder Dragons",
        description: "Storm-born drakes that carry living lightning beneath their scales.",
        classification: "Celestial dragon",
        traits: ["Storm flight", "Lightning breath"],
        threatLevel: "High",
        signatureSound: "A rolling sky-crack",
        firstEncounteredChapter: 1,
        appearanceChapters: [1],
        notableIndividualIds: ["dev-character-lei"],
      }],
    };
    firstRun.processingResult.proposedLivingStoryState.threads = {
      unresolved: [{ description: "Who altered the seventh timeline?", originChapter: 1 }],
      resolved: [],
    };

    const secondRun = batch.chapters[1].result!.run;
    secondRun.chapterPacket.storyConstitution = structuredClone(firstRun.chapterPacket.storyConstitution);
    secondRun.processingResult.proposedLivingStoryState = structuredClone(
      firstRun.processingResult.proposedLivingStoryState,
    );
    secondRun.processingResult.proposedLivingStoryState.characterState.currentPowerStage = "Seal Heart";
    secondRun.processingResult.proposedLivingStoryState.characterState.abilities.push({
      name: "Verdict Thread",
      description: "Binds a witnessed contradiction.",
      acquiredChapter: 2,
    });
    secondRun.processingResult.proposedLivingStoryState.codex.characters[0] = {
      ...secondRun.processingResult.proposedLivingStoryState.codex.characters[0],
      relationshipToMC: "Trusted ally after the hearing",
    };
    secondRun.processingResult.proposedLivingStoryState.codex.artifacts = [{
      name: "Seventh Crown Shard",
      description: "A fragment recovered beneath the witness bell.",
      currentOwner: "Jin Rui",
    }];
    secondRun.processingResult.proposedLivingStoryState.threads = {
      unresolved: [],
      resolved: ["Who altered the seventh timeline?"],
    };

    const snapshots = createReaderCodexSnapshots(batch);
    expect(snapshots[0].memory).toMatchObject({
      currentPowerStage: "Oath Spark",
      powerSystem: "Oath Spark → Seal Heart → Crown Soul",
      worldRules: ["Broken oaths leave visible scars."],
    });
    expect(snapshots[0].memory.characters?.[0]).toMatchObject({
      id: "seed-character-1",
      name: "Minister Sui",
      aliases: ["The Quiet Minister", "Court Whisper"],
      alternateNames: ["Court Whisper"],
      relationshipToMC: "Uneasy ally",
      powerLevel: "Seal Heart",
    });
    expect(snapshots[0].memory.characters?.[0].description).toContain("Silver eyes");
    expect(snapshots[0].memory.characters?.[0].aliases).toEqual([
      "The Quiet Minister",
      "Court Whisper",
    ]);
    expect(snapshots[0].memory.characters?.find(character => character.id === "dev-character-lei"))
      .toMatchObject({ portraitKind: "non-human", speciesId: "dev-creature-thunder-dragons" });
    expect(snapshots[0].memory.bestiary).toEqual([expect.objectContaining({
      id: "dev-creature-thunder-dragons",
      name: "Thunder Dragons",
      notableIndividualIds: ["dev-character-lei"],
    })]);
    expect(snapshots[0].memory.abilities).toEqual([
      expect.objectContaining({ name: "Oath-sight", masteryLevel: "Awakened" }),
    ]);
    expect(snapshots[0].memory.factions?.[0].name).toBe("Vermilion Tribunal");
    expect(snapshots[0].memory.locations?.[0]).toMatchObject({
      name: "Rain Court",
      realm: "Cultivation empire",
    });
    expect(snapshots[0].memory.artifacts).toEqual([]);
    expect(snapshots[0].memory.unresolvedPlotThreads).toHaveLength(1);

    expect(snapshots[1].memory.currentPowerStage).toBe("Seal Heart");
    expect(snapshots[1].memory.characters?.[0].relationshipToMC)
      .toBe("Trusted ally after the hearing");
    expect(snapshots[1].memory.abilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Verdict Thread", acquiredChapter: 2 }),
    ]));
    expect(snapshots[1].memory.artifacts?.[0]).toMatchObject({
      name: "Seventh Crown Shard",
      currentOwner: "Jin Rui",
    });
    expect(snapshots[1].memory.unresolvedPlotThreads).toEqual([]);
    expect(snapshots[1].memory.resolvedPlotThreads).toEqual([
      "Who altered the seventh timeline?",
    ]);
    expect(snapshots[0].memory.currentPowerStage).toBe("Oath Spark");
    expect(snapshots[0].memory.artifacts).toEqual([]);
    expect((snapshots[0].memory as Record<string, unknown>).rewards).toBeUndefined();
    expect((snapshots[0].memory as Record<string, unknown>).inventory).toBeUndefined();
    expect((snapshots[0].memory as Record<string, unknown>).glossaryEntries).toBeUndefined();
  });

  it("scopes the Codex story timeline to the selected chapter without removing Reader chapters", () => {
    const resolution = createCompletedBatchReaderSession(createCompletedFiveChapterTestBatch());
    if (!resolution.ok) throw new Error(resolution.reason);
    const originalStory = structuredClone(resolution.session.story);
    const chapterTwoSnapshot = resolution.session.codexSnapshots[1];

    const codexStory = createChapterScopedCodexStory(
      resolution.session.story,
      chapterTwoSnapshot.memory,
      2,
    );

    expect(codexStory.arcs[0].chapters.map(chapter => chapter.number)).toEqual([1, 2]);
    expect(codexStory.arcs[0].chapters.map(chapter => chapter.title)).not.toContain("Generated Title 5");
    expect(codexStory.memory).toEqual(chapterTwoSnapshot.memory);
    expect(resolution.session.story).toEqual(originalStory);
    expect(resolution.session.story.arcs[0].chapters).toHaveLength(5);
  });

  it("retains completed Codex snapshots and exports when a batch pauses before Chapter 3", () => {
    const batch = createCompletedFiveChapterTestBatch();
    batch.status = "paused";
    batch.activeChapterNumber = 3;
    batch.chapters[2] = { ...batch.chapters[2], status: "paused", result: undefined };
    batch.chapters[3] = { ...batch.chapters[3], status: "queued", result: undefined };
    batch.chapters[4] = { ...batch.chapters[4], status: "queued", result: undefined };

    const snapshots = createReaderCodexSnapshots(batch);
    const exported = buildBatchReviewMarkdown(batch);

    expect(snapshots.map(snapshot => snapshot.chapterNumber)).toEqual([1, 2]);
    expect(snapshots[1].memory.characters?.map(character => character.name)).toEqual([
      "Known by Chapter 1",
      "Known by Chapter 2",
    ]);
    expect(exported).toContain("Chapters 1, 2 completed before the pause");
    expect(exported).toContain("# Chapter 2 Review Export");
    expect(exported).not.toContain("# Chapter 3 Review Export");
    expect(exported).toContain("Known by Chapter 2");
  });

  it("retains the latest earlier snapshot when a later completed run has no proposed state", () => {
    const batch = createCompletedFiveChapterTestBatch();
    const processing = batch.chapters[1].result!.run.processingResult as {
      proposedLivingStoryState?: unknown;
    };
    delete processing.proposedLivingStoryState;

    const snapshots = createReaderCodexSnapshots(batch);
    expect(snapshots).toHaveLength(5);
    expect(snapshots[1].memory).toEqual(snapshots[0].memory);
    expect(snapshots[4].memory.currentPowerStage).toBe("Stage 5");
  });

  it("keeps unavailable Codex data empty instead of inventing entries", () => {
    const batch = createCompletedFiveChapterTestBatch();
    const firstRun = batch.chapters[0].result!.run;
    firstRun.chapterPacket.storyConstitution.powerSystem = "";
    firstRun.chapterPacket.storyConstitution.worldRules = [];
    firstRun.processingResult.proposedLivingStoryState.characterState = {
      currentPowerStage: "",
      abilities: [],
    };
    firstRun.processingResult.proposedLivingStoryState.threads = {
      unresolved: [],
      resolved: [],
    };
    firstRun.processingResult.proposedLivingStoryState.codex = {
      characters: [],
      factions: [],
      locations: [],
      artifacts: [],
      bestiary: [],
    };

    const memory = createReaderCodexSnapshots(batch)[0].memory;

    expect(memory).toEqual({
      currentPowerStage: "",
      characters: [],
      factions: [],
      locations: [],
      artifacts: [],
      bestiary: [],
      unresolvedPlotThreads: [],
      resolvedPlotThreads: [],
      worldRules: [],
      abilities: [],
    });
  });

  it("keeps selected-chapter and complete batch totals accurate, including repair and retry usage", () => {
    const batch = createCompletedFiveChapterTestBatch();
    const resolution = createCompletedBatchReaderSession(batch);
    if (!resolution.ok) throw new Error(resolution.reason);
    const chapters = resolution.session.chapters;

    expect(chapters[2].generationUsage?.totals).toEqual(batch.chapters[2].attempts[0].usage.totals);
    expect(chapters[2].generationUsage?.repair?.callCount).toBe(2);
    expect(chapters[3].generationUsage?.attemptCount).toBe(2);
    expect(chapters[3].generationUsage?.retry?.attemptCount).toBe(1);
    expect(chapters[3].generationUsage?.totals.totalTokens).toBe(
      batch.chapters[3].attempts.reduce((total, attempt) => total + attempt.usage.totals.totalTokens, 0),
    );
    expect(resolution.session.batchUsage.totals).toEqual(batch.usage.totals);
  });

  it("exports all five numbered chapters, titles, repaired prose, and token information", () => {
    const resolution = createCompletedBatchReaderSession(createCompletedFiveChapterTestBatch());
    if (!resolution.ok) throw new Error(resolution.reason);
    const exported = buildFiveChapterReaderExport(resolution.session);

    for (let chapterNumber = 1; chapterNumber <= 5; chapterNumber += 1) {
      expect(exported).toContain(`Chapter ${chapterNumber}: Generated Title ${chapterNumber}`);
      if (chapterNumber !== 3) expect(exported).toContain(`Final prose ${chapterNumber}.`);
    }
    expect(exported).toContain("Repaired final prose 3.");
    expect(exported).toContain("Input tokens:");
    expect(exported).toContain("Output tokens:");
    expect(exported).toContain("Batch input tokens:");
    expect(exported).toContain("Batch output tokens:");
  });

  it("truthfully refuses failed, paused, and structurally incomplete batches", () => {
    const paused = createCompletedFiveChapterTestBatch();
    paused.status = "paused";
    paused.chapters[4].status = "failed";
    paused.chapters[4].result = undefined;
    const pausedResolution = createCompletedBatchReaderSession(paused);
    expect(pausedResolution.ok).toBe(false);
    if (pausedResolution.ok) throw new Error("Expected paused batch rejection.");
    expect(pausedResolution.completedChapterCount).toBe(4);
    expect(pausedResolution.reason).toContain("paused");

    const incomplete = createCompletedFiveChapterTestBatch();
    incomplete.chapters[4].result = undefined;
    const incompleteResolution = createCompletedBatchReaderSession(incomplete);
    expect(incompleteResolution.ok).toBe(false);
    if (incompleteResolution.ok) throw new Error("Expected incomplete batch rejection.");
    expect(incompleteResolution.reason).toContain("instead of five");
  });
});
