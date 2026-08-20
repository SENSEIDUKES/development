/** Development adapter for the shared four-stage Chapter Generation pipeline. */
import type { ScenarioId } from "./assembleGeneration";
import { RHYTHM_SCENARIOS, SCENARIOS } from "./fixtures/mockGenerationData";
import type { SceneType } from "./lib/sceneRhythm";
import { assembleChapterGenerationPacket } from "./packets";
import {
  assembleChapterPacket,
  buildWorkshopChapterPlan,
  buildWorkshopProcessingResult,
  runChapterPipeline,
  type ChapterPipelineRun,
  type CulturalProseOverride,
} from "./pipeline";
import type { ChapterContent, ChapterHandoff, StoryBlock } from "./types";

export type { CulturalProseOverride } from "./pipeline";

const WORKSHOP_RESULT_TIMESTAMP_MS = Date.parse("2026-07-31T12:00:00.000Z");

/** Runs the Development fixture and its owned controls through the shared pipeline. */
export function assembleChapterGenerationDev(
  scenarioId: ScenarioId,
  rhythmScenarioId: string,
  proseOverride: CulturalProseOverride,
): ChapterPipelineRun {
  const scenario = SCENARIOS[scenarioId];
  const rhythmScenario = RHYTHM_SCENARIOS.find(candidate =>
    candidate.id === rhythmScenarioId) ?? RHYTHM_SCENARIOS[0];
  const chapterPacket = assembleChapterPacket(
    assembleChapterGenerationPacket(scenario, {
      recentSceneTypes: rhythmScenario.recentSceneTypes,
    }),
    { culturalProseOverride: proseOverride },
  );

  return runChapterPipeline({
    chapterPacket,
    planningSignals: {
      fatePressureTier: rhythmScenario.fatePressure,
    },
    model: {
      planChapter: buildWorkshopChapterPlan,
      manifestChapter: ({ chapterPlan }) => buildMockManifestedChapterDev({
        scenario,
        sceneTypeUsed: chapterPlan.resolvedSceneType,
      }),
      processResult: modelInput => buildWorkshopProcessingResult(
        modelInput,
        buildMockProcessingHandoffDev(
          scenario,
          modelInput.chapterPlan.resolvedSceneType,
        ),
      ),
    },
  });
}

/** Produces the deterministic Development writing-call fixture. */
function buildMockManifestedChapterDev(input: {
  scenario: (typeof SCENARIOS)[ScenarioId];
  sceneTypeUsed: SceneType;
}): ChapterContent {
  const { scenario, sceneTypeUsed } = input;
  const chapterNumber = scenario.currentChapter.number;
  const blocks: StoryBlock[] = scenario.id === "opening"
    ? [
        {
          id: "c1-p1",
          type: "paragraph",
          text: "Dust hung gold in the shaft of light through the tomb's broken roof, and Wen Shu had already swept the same corner three times just to avoid touching the altar at its center.",
          metadata: { mode: "narration", sceneType: "exploration", emotion: "wary", intensity: 0.3, tension: 0.25 },
        },
        {
          id: "c1-p2",
          type: "dialogue",
          text: "\"You've swept that corner enough for three lifetimes,\" Elder Nan said from the doorway, not unkindly. \"Finish before the incense burns out.\"",
          metadata: { mode: "dialogue", speakerName: "Elder Nan", speakerRole: "authority", emotion: "stern", intensity: 0.4 },
        },
        {
          id: "c1-p3",
          type: "paragraph",
          text: "It was the altar's shadow that gave it away — a seam in the stone too straight to be an accident. Wen Shu's fingers found the manual before his mind caught up to what he was doing.",
          metadata: { mode: "narration", emotion: "startled", intensity: 0.55, tension: 0.5, mysticism: 0.6 },
        },
        {
          id: "c1-p4",
          type: "paragraph",
          text: "A holographic seal flickered faintly across the cover the moment his qi brushed it, dim and cracked with age.",
          metadata: { mode: "narration", intensity: 0.5 },
          system: {
            kind: "status",
            promptType: "codex_update",
            title: "Forbidden Item Discovered",
            rows: [
              { label: "Item", value: "Sealed Manual" },
              { label: "Brand", value: "Pre-sect era, unrecognized" },
            ],
          },
        },
      ]
    : [
        {
          id: "c6-p1",
          type: "paragraph",
          text: `Directed toward a ${sceneTypeUsed} beat: the crack in the seal exhaled a breath that smelled of cold iron, and Mei Lian's grip on Wen Shu's wrist tightened until it hurt.`,
          metadata: { mode: "narration", sceneType: "confrontation", emotion: "dread", intensity: 0.7, tension: 0.75, danger: 0.5 },
        },
        {
          id: "c6-p2",
          type: "dialogue",
          text: "\"Whatever that is,\" Mei Lian said, voice level despite the shake in her hand, \"it's older than the seal. Older than the sect.\"",
          metadata: { mode: "dialogue", speakerName: "Mei Lian", speakerRole: "ally", emotion: "controlled fear", intensity: 0.6, tension: 0.7 },
        },
        {
          id: "c6-p3",
          type: "paragraph",
          text: "Wen Shu drew the Ashen Sword from its sheath, and qi tore through his newly-formed meridians like a second breakthrough trying to happen too fast.",
          metadata: {
            mode: "narration",
            intensity: 0.85,
            tension: 0.8,
            danger: 0.6,
            mysticism: 0.7,
            entities: [{ name: "Ashen Sword", type: "artifact", mention: "reference" }],
            audioMoments: [{
              blockId: "c6-p3",
              triggerPhrase: "drew the Ashen Sword from its sheath",
              occurrenceIndex: 0,
              sourceCategory: "weapons",
              variation: "unsheathe",
              semanticTags: ["sword", "draw", "blade", "metal"],
              relatedEntity: { name: "Ashen Sword", type: "artifact" },
            }],
            music: { mood: "restrained escalation", region: "chinese", intensity: 0.6 },
          },
        },
        {
          id: "c6-p4",
          type: "paragraph",
          text: "The Ashfall Draw settled into his meridians instead of scarring them — mastery, not just access, the manual's old pages finally making sense.",
          metadata: { mode: "narration", intensity: 0.5 },
          system: {
            kind: "skill_acquired",
            promptType: "progression",
            title: "Technique Refined",
            rarity: "Rare",
            rows: [
              { label: "Technique", value: "Ashfall Draw" },
              { label: "Mastery", value: "Initial -> Practiced" },
            ],
          },
        },
      ];
  const generatedContent = blocks.map(block => block.text).join("\n\n");
  const now = WORKSHOP_RESULT_TIMESTAMP_MS;

  return {
    storyId: "workshop-mock-story-01",
    userId: "workshop-mock-user",
    chapterNumber,
    generatedContent,
    blocks,
    summary: scenario.id === "opening"
      ? "Wen Shu discovers a forbidden cultivation manual hidden inside a sealed tomb altar during punishment duty."
      : `Wen Shu and Mei Lian face the shrine's aftermath, directed by a ${sceneTypeUsed} anchor, as Elder Nan's patrol closes in.`,
    statsChangeMessage: scenario.id === "opening"
      ? "None"
      : "[Technique Refined: Ashfall Draw — Initial to Practiced.]",
    cuePayload: scenario.id === "opening"
      ? { sceneType: "exploration", environment: ["tomb", "dust"], intensity: 0.3, tension: 0.25, emotion: "wary" }
      : { sceneType: "confrontation", environment: ["shrine", "darkness"], intensity: 0.7, tension: 0.8, danger: 0.55, emotion: "dread" },
    syncStatus: "synced",
    revisionId: `workshop-mock-dev-rev-${chapterNumber}`,
    syncRevision: `${now}`,
    updatedAt: new Date(now).toISOString(),
  };
}

/** Deterministic stand-in for the structured Stage 4 processing response. */
function buildMockProcessingHandoffDev(
  scenario: (typeof SCENARIOS)[ScenarioId],
  sceneTypeUsed: SceneType,
): ChapterHandoff {
  const chapterNumber = scenario.currentChapter.number;
  return scenario.id === "opening"
    ? {
        version: 1,
        chapterNumber,
        endState: {
          location: "The sealed tomb beneath Azure Bell Peak",
          timeMarker: "dusk, same day",
          charactersPresent: ["Wen Shu", "Elder Nan"],
          mcCondition: "shaken, manual hidden inside his robes",
          openTension: "Wen Shu now possesses a forbidden item Elder Nan doesn't know about.",
        },
        completedEvents: ["Wen Shu found the sealed Ashfall Continuum manual inside the tomb altar."],
        nextImmediateAction: "Wen Shu must decide whether to read the manual in secret.",
        fingerprints: [{
          actionType: "discovery",
          participants: ["Wen Shu"],
          location: "The sealed tomb beneath Azure Bell Peak",
          outcome: "Wen Shu found the sealed Ashfall Continuum manual.",
          chapterNumber,
        }],
      }
    : {
        version: 1,
        chapterNumber,
        endState: {
          location: "The collapsed shrine beneath Azure Bell Peak",
          timeMarker: "moments later, same night",
          charactersPresent: ["Wen Shu", "Mei Lian"],
          mcCondition: "meridians raw but intact, Ashfall Draw newly refined to Practiced",
          openTension: "Elder Nan's patrol bell just rang directly above the shrine.",
        },
        completedEvents: [
          `Something ancient stirred behind the shrine's cracked inner seal (${sceneTypeUsed} beat).`,
          "Wen Shu refined the Ashfall Draw from Initial to Practiced mastery under pressure.",
        ],
        nextImmediateAction: "Wen Shu and Mei Lian must hide or explain themselves before Elder Nan's patrol reaches the shrine entrance.",
        fingerprints: [{
          actionType: "other",
          participants: ["Wen Shu", "Mei Lian"],
          location: "The collapsed shrine beneath Azure Bell Peak",
          outcome: "Something ancient stirred behind the cracked inner seal.",
          chapterNumber,
        }],
      };
}
