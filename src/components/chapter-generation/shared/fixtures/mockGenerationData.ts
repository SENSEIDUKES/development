/**
 * Safe, local mock story data for the Chapter Generation Workshop replica.
 * Nothing here touches Firebase, Postgres, R2, or a real LLM — it exists so
 * `assembleGeneration.ts` can run the real (ported) assembly/budgeting logic
 * against representative input, exactly like `storyRouter.ts`'s
 * `/api/generate-chapter-stream` handler does against a real Story document.
 */
import type { ChapterHandoff, ContextBlock, SceneFingerprint } from "../types";
import type { GlossaryGenerationResult } from "../lib/glossaryFormatter";
import type { CulturalProseStyleId } from "../lib/culturalProse";
import type { FatePressureTier, SceneType } from "../lib/sceneRhythm";

export interface MockChapterGenerationScenario {
  id: "opening" | "established";
  label: string;
  mcName: string;
  genre: string;
  storyTags: string[];
  customPremise: string;
  styleBible: string;
  tropeRules: string;
  /** This story's configured Cultural Prose Style setting. Undefined = not set (fallback applies). */
  culturalProseStyleId?: CulturalProseStyleId;
  /**
   * A concrete, not-yet-explored story element used to seed the
   * "worldBuilding" Scene Ending Anchor (see `deriveSceneAnchors`). Reused
   * for both the anchors carried INTO this chapter (derived from the
   * previous chapter's handoff) and the anchors generated FOR the next
   * chapter (derived from this chapter's own handoff) — a deliberate
   * skeleton-level simplification; a real implementation would likely pick
   * a fresh unresolved thread each time.
   */
  worldBuildingSeed: string;
  memory: {
    powerSystem: string;
    currentPowerStage: string;
    worldRules: string[];
    abilities: unknown[];
    unresolvedPlotThreads: Array<{ description: string; originChapter: number }>;
    resolvedPlotThreads: string[];
    destinedEnding: string;
    characters: Record<string, unknown>[];
    /** Species-level records; persistent non-human individuals stay in characters. */
    bestiary?: Record<string, unknown>[];
    factions: Record<string, unknown>[];
    locations: Record<string, unknown>[];
    artifacts: Record<string, unknown>[];
  };
  currentChapter: { number: number; title: string; premise: string };
  contextBlocks: ContextBlock[];
  previousHandoff?: ChapterHandoff;
  recentFingerprints: SceneFingerprint[];
  glossaryEntries: GlossaryGenerationResult[];
  pacingDirective: string;
  fatePressure: "Relaxed" | "Balanced" | "Hardcore" | "Dao Master";
  chapterWritingStyle: string;
}

const SHARED_GLOSSARY: GlossaryGenerationResult[] = [
  {
    mode: "generation",
    term: "Qi Condensation",
    category: "Cultivation Rank",
    priority: "high",
    canonicalTerm: "Qi Condensation",
    rule: 'Never translate or rename this rank; always render it exactly as "Qi Condensation".',
    surfaceForms: ["Qi Condensation", "Condensation stage"],
  },
  {
    mode: "generation",
    term: "Dantian",
    category: "Cultivation Concept",
    priority: "medium",
    canonicalTerm: "Dantian",
    rule: "Keep as the cultivator's internal qi reservoir; never gloss it as \"stomach\" or \"core\" outright.",
    surfaceForms: ["Dantian", "elixir field"],
  },
];

export const OPENING_SCENARIO: MockChapterGenerationScenario = {
  id: "opening",
  label: "Chapter 1 — Story Opening",
  mcName: "Wen Shu",
  genre: "Xianxia",
  storyTags: ["underdog", "mentor-bond"],
  customPremise: "A disgraced outer disciple discovers a forbidden cultivation manual sealed inside a dead master's tomb.",
  styleBible: "Grounded, wistful prose in the early chapters; let awe and hardship breathe before escalating to spectacle.",
  tropeRules: "Avoid an early face-slap; the first arc is about proving competence quietly, not humiliating rivals in public.",
  // No cultural prose style configured yet for this story — exercises the fallback path.
  culturalProseStyleId: undefined,
  worldBuildingSeed: "Why Elder Nan changes the subject whenever the tomb's original occupant comes up.",
  memory: {
    powerSystem: "Body Tempering -> Qi Condensation (9 layers) -> Core Formation -> Nascent Soul -> Soul Transformation.",
    currentPowerStage: "Body Tempering, Third Meridian",
    worldRules: [
      "Spiritual qi is thinner in the outer sect territories, forcing disciples there to cultivate slower than inner disciples.",
      "Forbidden manuals bear a sect brand; possessing one without a seal-breaking rite is a capital offense.",
    ],
    abilities: [],
    unresolvedPlotThreads: [],
    resolvedPlotThreads: [],
    destinedEnding: "",
    characters: [
      {
        name: "Wen Shu",
        role: "Outer Disciple",
        description: "A quiet, overlooked disciple of the Azure Bell Sect, mocked for his slow cultivation and mixed blood.",
        relationshipToMC: "self",
        status: "alive",
      },
      {
        name: "Elder Nan",
        role: "Sect Elder, Discipline Hall",
        description: "A stern but not unkind elder who assigns outer disciples to tomb-sweeping duty.",
        relationshipToMC: "Neutral authority figure",
        status: "alive",
      },
    ],
    factions: [
      {
        name: "Azure Bell Sect",
        role: "Mid-tier orthodox sect",
        description: "A moderately influential sect known for bell-array formations and strict hierarchy between inner and outer disciples.",
        alignment: "Righteous",
        status: "Active",
      },
    ],
    locations: [],
    artifacts: [],
  },
  currentChapter: {
    number: 1,
    title: "The Cauldron Wakes",
    premise: "Wen Shu is sent to sweep a disgraced elder's sealed tomb and finds a forbidden manual no one has touched in decades.",
  },
  contextBlocks: [],
  previousHandoff: undefined,
  recentFingerprints: [],
  glossaryEntries: SHARED_GLOSSARY,
  pacingDirective: "Keep the opening slow and grounded — one discovery, one decision, no combat yet.",
  fatePressure: "Balanced",
  chapterWritingStyle: "Standard",
};

const CH5_HANDOFF: ChapterHandoff = {
  version: 1,
  chapterNumber: 5,
  endState: {
    location: "The collapsed shrine beneath Azure Bell Peak",
    timeMarker: "just after moonrise, same night",
    charactersPresent: ["Wen Shu", "Mei Lian"],
    mcCondition: "qi-drained, one hand burned from the array backlash, adrenaline still running high",
    openTension: "The shrine's inner seal cracked open on its own the moment Wen Shu touched the manual — something inside is now awake.",
  },
  completedEvents: [
    "Wen Shu broke through to Qi Condensation, First Layer during the array backlash.",
    "Mei Lian revealed she recognized the tomb's brand and has been secretly protecting Wen Shu since Chapter 2.",
    "The forbidden manual's true name — the Ashfall Continuum — was spoken aloud for the first time.",
  ],
  nextImmediateAction: "Deal with whatever the cracked inner seal just released before Elder Nan's night patrol reaches the shrine.",
  fingerprints: [
    {
      actionType: "breakthrough",
      participants: ["Wen Shu"],
      location: "The collapsed shrine beneath Azure Bell Peak",
      outcome: "Wen Shu broke through to Qi Condensation, First Layer under backlash stress.",
      chapterNumber: 5,
    },
    {
      actionType: "revelation",
      participants: ["Wen Shu", "Mei Lian"],
      location: "The collapsed shrine beneath Azure Bell Peak",
      outcome: "Mei Lian's secret protection of Wen Shu since Chapter 2 came out.",
      chapterNumber: 5,
    },
  ],
};

export const ESTABLISHED_SCENARIO: MockChapterGenerationScenario = {
  id: "established",
  label: "Chapter 6 — Established Arc",
  mcName: "Wen Shu",
  genre: "Xianxia",
  storyTags: ["underdog", "mentor-bond", "slow-burn romance"],
  customPremise: "A disgraced outer disciple discovers a forbidden cultivation manual sealed inside a dead master's tomb.",
  styleBible: "Grounded, wistful prose in the early chapters; let awe and hardship breathe before escalating to spectacle.",
  tropeRules: "Avoid an early face-slap; the first arc is about proving competence quietly, not humiliating rivals in public.",
  // A sect-history xianxia story reads naturally in the classical-worldbuilding voice.
  culturalProseStyleId: "chinese-classical-worldbuilding",
  worldBuildingSeed: "What the Ashfall Continuum's shrine actually was before the Azure Bell Sect's founders buried it.",
  memory: {
    powerSystem: "Body Tempering -> Qi Condensation (9 layers) -> Core Formation -> Nascent Soul -> Soul Transformation.",
    currentPowerStage: "Qi Condensation, First Layer",
    worldRules: [
      "Spiritual qi is thinner in the outer sect territories, forcing disciples there to cultivate slower than inner disciples.",
      "Forbidden manuals bear a sect brand; possessing one without a seal-breaking rite is a capital offense.",
      "The Ashfall Continuum is a pre-sect-era cultivation method the Azure Bell Sect's founders explicitly outlawed and buried.",
      "Array backlash injuries scar the meridians permanently unless treated with First Layer or higher qi within a day.",
    ],
    abilities: [
      {
        name: "Ashfall Draw",
        description: "A meridian-forging technique from the Ashfall Continuum that burns stored qi faster than normal but tempers the body in the process.",
        source: "The forbidden manual found in Chapter 1",
        acquisitionMethod: "Self-taught over several nights of secret practice",
        cost: "Doubles qi consumption for the duration",
        limits: "Cannot be used twice in the same day without risking meridian scarring",
        masteryLevel: "Initial",
      },
    ],
    unresolvedPlotThreads: [
      { description: "The Ashfall Continuum's inner seal cracked open in Chapter 5 — something inside is now awake.", originChapter: 5 },
      { description: "Mei Lian has been secretly protecting Wen Shu since Chapter 2, for reasons she hasn't explained.", originChapter: 2 },
      { description: "Elder Nan's night patrol route was heading toward the collapsed shrine when Chapter 5 ended.", originChapter: 5 },
    ],
    resolvedPlotThreads: [
      "Whether Wen Shu could survive tomb-sweeping duty alone (Chapter 1-3).",
    ],
    destinedEnding: "Wen Shu either masters the Ashfall Continuum on his own terms or is consumed by the sect's fear of it.",
    characters: [
      {
        name: "Wen Shu",
        role: "Outer Disciple",
        description: "A quiet, overlooked disciple of the Azure Bell Sect, now secretly cultivating a forbidden method.",
        relationshipToMC: "self",
        status: "alive",
        powerLevel: "Qi Condensation, First Layer",
        lastMajorInvolvement: 5,
      },
      {
        name: "Mei Lian",
        role: "Inner Disciple, Formation Hall",
        description: "A sharp, guarded inner disciple who has been quietly steering danger away from Wen Shu since he found the manual.",
        relationshipToMC: "Secret protector, slow-burn romantic tension",
        status: "alive",
        lastMajorInvolvement: 5,
        provenance: { lastMentionedChapter: 5 },
      },
      {
        name: "Elder Nan",
        role: "Sect Elder, Discipline Hall",
        description: "A stern but not unkind elder who assigned Wen Shu to tomb-sweeping duty and now suspects something is wrong.",
        relationshipToMC: "Neutral authority figure, growing suspicion",
        status: "alive",
        lastMajorInvolvement: 4,
      },
      {
        name: "Zhou Feng",
        role: "Inner Disciple, Wen Shu's rival",
        description: "An arrogant inner disciple who has mocked Wen Shu since childhood and resents Mei Lian's attention toward him.",
        relationshipToMC: "Rival",
        status: "alive",
        lastMajorInvolvement: 3,
      },
    ],
    bestiary: [{
      name: "Ashfall Seal Wyrms",
      description: "Pale wyrms bound beneath the Ashfall shrine's oldest inner seal.",
      classification: "Sealed spirit beast",
      traits: ["Seal-sense", "Ash breath"],
      threatLevel: "High",
    }],
    factions: [
      {
        name: "Azure Bell Sect",
        role: "Mid-tier orthodox sect",
        description: "A moderately influential sect known for bell-array formations and strict hierarchy between inner and outer disciples.",
        alignment: "Righteous",
        status: "Active",
      },
      {
        name: "The Ashfall Remnant",
        role: "Extinct pre-sect cultivation lineage",
        description: "The outlawed lineage whose founders were buried beneath Azure Bell Peak generations ago; presumed extinct until Chapter 1.",
        alignment: "Unknown",
        status: "Presumed extinct",
      },
    ],
    locations: [
      {
        name: "The collapsed shrine beneath Azure Bell Peak",
        description: "A sealed underground shrine holding the Ashfall Continuum's tomb; its inner seal cracked open in Chapter 5.",
        realm: "Azure Bell Sect territory",
        safetyLevel: "Dangerous",
      },
    ],
    artifacts: [
      {
        name: "The Ashfall Continuum",
        description: "A forbidden cultivation manual bearing the Azure Bell Sect's oldest ban-brand; source of the Ashfall Draw technique.",
        tier: "Earth",
        currentOwner: "Wen Shu",
      },
    ],
  },
  currentChapter: {
    number: 6,
    title: "What the Seal Let Out",
    premise: "Wen Shu and Mei Lian must contain whatever the shrine's cracked seal released before Elder Nan's patrol finds them there.",
  },
  contextBlocks: [
    {
      kind: "anchor",
      chapterNumber: 5,
      text: "Wen Shu's palm still smoked from the backlash as the inner seal split down its center with a sound like a bell cracking. Mei Lian grabbed his wrist. \"That's not supposed to open,\" she whispered, \"not ever.\" Somewhere below them, in the dark past the broken seal, something exhaled.",
    },
    {
      kind: "recent-full",
      chapterNumber: 5,
      text: "Chapter 5: The Bell That Should Not Ring\n\nThe tomb-sweeping duty had started as a punishment and ended as the night Wen Shu's whole life changed. When Mei Lian found him kneeling over the forbidden manual, she didn't run for Elder Nan — she knelt beside him instead, and that was its own kind of confession. The array they triggered trying to read the manual's first page tore through Wen Shu's meridians like fire, and when the pain cleared, he could feel qi moving through his dantian for the first time in his life: Qi Condensation, First Layer. Mei Lian's hands were shaking when she helped him up. 'I've been watching this shrine for three years,' she admitted. 'Since before you ever set foot in it.' Before he could ask why, the shrine's inner seal — sealed since before either of their sects existed — split open on its own.",
      summaryText: "Wen Shu broke through to Qi Condensation, First Layer via the manual's backlash; Mei Lian revealed she's watched the shrine for years; the inner seal cracked open on its own.",
    },
    {
      kind: "rag",
      chapterNumber: 2,
      text: "Chapter 2 (recovered memory): Zhou Feng cornered Wen Shu outside the Discipline Hall and needled him about his mixed blood in front of the other outer disciples, but backed off the moment Mei Lian appeared at the end of the corridor — the first hint that Zhou Feng's confidence has limits where she's concerned.",
    },
    {
      kind: "arc-summary",
      chapterNumber: 5,
      text: "Volume 1 'The Outer Disciple' Summary: Wen Shu, a mocked outer disciple of the Azure Bell Sect, is sent to sweep a sealed tomb and finds a forbidden manual — the Ashfall Continuum. Inner disciple Mei Lian, secretly protecting him for reasons unknown, is drawn into his discovery. A backlash during his first reading breaks him through to Qi Condensation and cracks the tomb's ancient inner seal.",
    },
  ],
  previousHandoff: CH5_HANDOFF,
  recentFingerprints: [
    {
      actionType: "social",
      participants: ["Wen Shu", "Zhou Feng"],
      location: "Discipline Hall corridor",
      outcome: "Zhou Feng backed off from mocking Wen Shu once Mei Lian appeared.",
      chapterNumber: 2,
    },
    {
      actionType: "discovery",
      participants: ["Wen Shu"],
      location: "The collapsed shrine beneath Azure Bell Peak",
      outcome: "Wen Shu found the sealed Ashfall Continuum manual.",
      chapterNumber: 1,
    },
  ],
  glossaryEntries: SHARED_GLOSSARY,
  pacingDirective: "Escalate the shrine threat immediately, but keep Elder Nan's patrol as a ticking clock rather than an instant confrontation.",
  fatePressure: "Balanced",
  chapterWritingStyle: "Standard",
};

export const SCENARIOS: Record<"opening" | "established", MockChapterGenerationScenario> = {
  opening: OPENING_SCENARIO,
  established: ESTABLISHED_SCENARIO,
};

// ── Scene Rhythm validation fixtures ────────────────────────────────────────
//
// Fixed Workshop examples for the Scene Rhythm Tracker, one per validation
// case named in the design brief. `recentSceneTypes` is the incoming history
// BEFORE this chapter's selection runs (oldest first). Independent of the
// story scenario above (either can be combined with either) — "No Previous
// Rhythm or Anchors" is most representative when paired with the "opening"
// story scenario, which also has no previous chapter handoff to derive
// carried-over anchors from.

export interface RhythmScenario {
  id: string;
  label: string;
  fatePressure: FatePressureTier;
  recentSceneTypes: SceneType[];
}

export const RHYTHM_SCENARIOS: RhythmScenario[] = [
  {
    id: "low-pressure",
    label: "Low Fate Pressure",
    fatePressure: "Relaxed",
    recentSceneTypes: ["progression", "worldBuilding", "progression"],
  },
  {
    id: "balanced-pressure",
    label: "Balanced Fate Pressure",
    fatePressure: "Balanced",
    recentSceneTypes: ["worldBuilding", "conflict", "progression"],
  },
  {
    id: "high-pressure",
    label: "High Fate Pressure",
    fatePressure: "Hardcore",
    recentSceneTypes: ["conflict", "progression", "conflict"],
  },
  {
    id: "conflict-streak",
    label: "Several Recent Conflict Scenes",
    fatePressure: "Hardcore",
    recentSceneTypes: ["conflict", "conflict", "conflict"],
  },
  {
    id: "progression-streak",
    label: "Several Repeated Progression Scenes",
    fatePressure: "Balanced",
    recentSceneTypes: ["progression", "progression", "progression"],
  },
  {
    id: "no-history",
    label: "No Previous Rhythm or Anchors",
    fatePressure: "Balanced",
    recentSceneTypes: [],
  },
];
