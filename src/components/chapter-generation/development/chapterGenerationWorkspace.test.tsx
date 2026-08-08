import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ScenarioId } from "../shared/assembleGeneration";
import {
  assembleChapterGenerationDev,
  type CulturalProseOverride,
} from "../shared/assembleGenerationDev";
import { ChapterGenerationWorkspace } from "./ChapterGenerationWorkspace";
import { effectMarkers } from "./ManifestedChapterView";

const renderRun = (
  scenarioId: ScenarioId = "established",
  rhythmScenarioId = "balanced-pressure",
  proseOverride: CulturalProseOverride = "story-default",
) => renderToStaticMarkup(
  <ChapterGenerationWorkspace run={assembleChapterGenerationDev(scenarioId, rhythmScenarioId, proseOverride)} />,
);

describe("Chapter Generation Development workspace", () => {
  it("separates Permanent Story Rules from the Current Chapter Run, in order", () => {
    const html = renderRun();

    const permanentIndex = html.indexOf("Permanent Story Rules");
    const runIndex = html.indexOf("Current Chapter Run");
    const technicalIndex = html.indexOf("Technical Details");
    expect(permanentIndex).toBeGreaterThanOrEqual(0);
    expect(runIndex).toBeGreaterThan(permanentIndex);
    expect(technicalIndex).toBeGreaterThan(runIndex);

    for (const title of ["Chapter Packet", "Chapter Plan", "Manifested Chapter", "Chapter Results"]) {
      expect(html).toContain(title);
    }
    const stepIndexes = ["Chapter Packet", "Chapter Plan", "Manifested Chapter", "Chapter Results"]
      .map(title => html.indexOf(title));
    expect(stepIndexes).toEqual([...stepIndexes].sort((a, b) => a - b));
  });

  it("renders permanent rules as readable summaries with large instructions collapsed", () => {
    const html = renderRun();

    // Readable permanent content is visible without opening anything.
    expect(html).toContain("Chinese Classical — Worldbuilding");
    expect(html).toContain("Chapter Writing Style");
    expect(html).toContain("Fate Survival");
    expect(html).toContain("World &amp; Narration Rules");

    // Large instruction texts sit behind disclosures that are collapsed by default.
    const runIndex = html.indexOf("Current Chapter Run");
    const permanentRegion = html.slice(0, runIndex);
    expect(permanentRegion).toContain("Style Bible");
    expect(permanentRegion).toContain("Permanent writing instructions");
    expect(permanentRegion).toContain("Chapter-effect rules");
    expect(permanentRegion).toContain("<details");
    expect(permanentRegion).not.toContain("<details open");
  });

  it("shows the packet step: position, mission, story state, previous ending, anchors, context", () => {
    const html = renderRun();

    expect(html).toContain("Arc 1 — Chapter 6/100");
    expect(html).toContain("Contract Objective");
    expect(html).toContain("Previous Ending");
    expect(html).toContain("The collapsed shrine beneath Azure Bell Peak");
    expect(html).toContain("Existing Anchors");
    expect(html).toContain("Relevant Retrieved Context");
  });

  it("shows the plan step: rhythm, path, Fate decision, effects, progression, ending, handoff target", () => {
    const html = renderRun("established", "high-pressure");

    expect(html).toContain("Recent Rhythm Response");
    expect(html).toContain("Selected Pressure Tier");
    expect(html).toContain("Hardcore");
    expect(html).toContain("Selected Path");
    expect(html).toContain("Fate Survival Decision");
    expect(html).toContain("Chosen Effects");
    expect(html).toContain("Scene Progression");
    expect(html).toContain("Intended Ending");
    expect(html).toContain("Next-Chapter Handoff Target");
  });

  it("renders the manifested chapter as readable prose with dialogue, panels, and effect markers", () => {
    const html = renderRun();

    // Readable prose and dialogue with a visible speaker, not JSON.
    expect(html).toContain("cold iron");
    expect(html).toContain("Mei Lian");
    // System panel rendering with its rows and rarity.
    expect(html).toContain("System Panel");
    expect(html).toContain("Technique Refined");
    expect(html).toContain("Ashfall Draw");
    expect(html).toContain("Rare");
    // Visible effect markers from block metadata.
    expect(html).toContain("tension 0.75");
    expect(html).toContain("music: restrained escalation");
    // Clearly labeled as mock output until Pass 4.
    expect(html).toContain("Mock output");
    expect(html).toContain("Pass 4");
  });

  it("shows the results step: mission, findings, changes, threads, anchors, handoff, next position", () => {
    const html = renderRun();

    expect(html).toContain("Mission Complete");
    expect(html).toContain("Continuity Findings");
    expect(html).toContain("Repetition Findings");
    expect(html).toContain("No repetition findings.");
    expect(html).toContain("Character Changes");
    expect(html).toContain("World Changes");
    expect(html).toContain("Newly Generated Anchors");
    expect(html).toContain("Next-Chapter Handoff");
    expect(html).toContain("hide or explain themselves");
    expect(html).toContain("Proposed Next Position");
    expect(html).toContain("Arc 1 — Chapter 7/100");
  });

  it("keeps raw JSON inside one collapsed Technical Details section", () => {
    const html = renderRun();

    const technicalIndex = html.indexOf("Technical Details");
    expect(technicalIndex).toBeGreaterThanOrEqual(0);
    // Serialized packet/plan JSON appears only after the Technical Details marker.
    expect(html.indexOf("&quot;storyConstitution&quot;")).toBeGreaterThan(technicalIndex);
    expect(html.indexOf("&quot;generationRules&quot;")).toBeGreaterThan(technicalIndex);
    // The readable chapter region carries no raw JSON keys.
    const runRegion = html.slice(html.indexOf("Current Chapter Run"), technicalIndex);
    expect(runRegion).not.toContain("&quot;version&quot;: 1");
    expect(runRegion).not.toContain("storyConstitution");
    // Copy controls exist for debugging.
    expect(html.slice(technicalIndex)).toContain("Copy");
  });

  it("reflects control changes immediately in the readable workspace", () => {
    const opening = renderRun("opening");
    expect(opening).toContain("Arc 1 — Chapter 1/100");
    expect(opening).toContain("First chapter of the story");
    expect(opening).toContain("Forbidden Item Discovered");

    const fallbackProse = renderRun("established", "balanced-pressure", "none");
    expect(fallbackProse).toContain("Fallback");
    expect(fallbackProse).toContain("No Cultural Prose style");

    const overrideProse = renderRun("established", "balanced-pressure", "korean-romantic-drama");
    expect(overrideProse).toContain("Korean — Romantic Drama");
    expect(overrideProse).toContain("Workshop override");

    const conflictStreak = renderRun("established", "conflict-streak");
    expect(conflictStreak).toContain("Blocked:");
  });

  it("derives visible effect markers from block metadata", () => {
    expect(effectMarkers({
      sceneType: "confrontation",
      emotion: "dread",
      intensity: 0.7,
      tension: 0.75,
      music: { mood: "restrained escalation" },
    })).toEqual([
      "scene: Confrontation",
      "emotion: dread",
      "intensity 0.7",
      "tension 0.75",
      "music: restrained escalation",
    ]);
    expect(effectMarkers(undefined)).toEqual([]);
    expect(effectMarkers({})).toEqual([]);
  });
});
