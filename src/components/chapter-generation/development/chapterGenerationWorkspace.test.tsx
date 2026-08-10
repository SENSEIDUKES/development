// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScenarioId } from "../shared/assembleGeneration";
import {
  assembleChapterGenerationDev,
  type CulturalProseOverride,
} from "../shared/assembleGenerationDev";
import type { ChapterPipelineRun } from "../shared/pipeline/types";
import type { ManifestChapterResponse } from "../shared/liveChapterGeneration";
import {
  buildNextChapterContinuation,
  type AuthenticatedChapterGenerationContinuation,
  type ChapterGenerationContinuation,
} from "../shared/batch/chapterBatch";
import { BatchProgress, ChapterUsageSummary } from "./ChapterGenerationTestFlow";
import { createFiveChapterBatchState } from "../shared/batch/chapterBatch";
import { createCompletedFiveChapterTestBatch } from "../shared/batch/chapterBatchTestFixture";
import { ChapterGenerationWorkspace } from "./ChapterGenerationWorkspace";
import { effectMarkers } from "./ManifestedChapterView";
import { CopyButton } from "./workspaceUi";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const authenticated = (
  continuation: ChapterGenerationContinuation,
): AuthenticatedChapterGenerationContinuation => ({
  ...continuation,
  proof: { version: 1, artifactDigest: "test-artifact", signature: "test-signature" },
});

const buildRun = (
  scenarioId: ScenarioId = "established",
  rhythmScenarioId = "balanced-pressure",
  proseOverride: CulturalProseOverride = "story-default",
): ChapterPipelineRun => assembleChapterGenerationDev(scenarioId, rhythmScenarioId, proseOverride);

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const mount = (run: ChapterPipelineRun = buildRun()) => {
  act(() => {
    root.render(<ChapterGenerationWorkspace run={run} />);
  });
  return container;
};

const rerender = (run: ChapterPipelineRun) => {
  act(() => {
    root.render(<ChapterGenerationWorkspace run={run} />);
  });
  return container;
};

const tabs = () =>
  [...container.querySelectorAll<HTMLElement>('[role="tab"]')];

const clickTab = async (label: string) => {
  const tab = tabs().find(candidate => candidate.textContent?.includes(label));
  expect(tab, `tab "${label}" exists`).toBeTruthy();
  await act(async () => {
    tab!.click();
  });
};

const text = () => container.textContent ?? "";

const STAGE_MARKERS = {
  packet: "Relevant Retrieved Context",
  plan: "Scene Progression",
  manifest: "Mock output",
  results: "Continuity Findings",
} as const;

describe("Chapter Generation Development workspace navigation", () => {
  it("shows only the Manifested Chapter stage by default", () => {
    mount();

    expect(text()).toContain("Step 3 of 4");
    expect(text()).toContain(STAGE_MARKERS.manifest);
    expect(text()).not.toContain("Step 1 of 4");
    expect(text()).not.toContain("Step 2 of 4");
    expect(text()).not.toContain("Step 4 of 4");
    expect(text()).not.toContain(STAGE_MARKERS.packet);
    expect(text()).not.toContain(STAGE_MARKERS.plan);
    expect(text()).not.toContain(STAGE_MARKERS.results);

    const selected = tabs().filter(tab => tab.getAttribute("aria-selected") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0].textContent).toContain("Manifested Chapter");
  });

  it("reaches every stage through the navigation, one stage at a time", async () => {
    mount();

    await clickTab("Chapter Packet");
    expect(text()).toContain("Step 1 of 4");
    expect(text()).toContain(STAGE_MARKERS.packet);
    expect(text()).not.toContain(STAGE_MARKERS.plan);
    expect(text()).not.toContain(STAGE_MARKERS.manifest);
    expect(text()).not.toContain(STAGE_MARKERS.results);

    await clickTab("Chapter Plan");
    expect(text()).toContain("Step 2 of 4");
    expect(text()).toContain(STAGE_MARKERS.plan);
    expect(text()).not.toContain(STAGE_MARKERS.packet);
    expect(text()).not.toContain(STAGE_MARKERS.manifest);

    await clickTab("Chapter Results");
    expect(text()).toContain("Step 4 of 4");
    expect(text()).toContain(STAGE_MARKERS.results);
    expect(text()).toContain("Arc 1 — Chapter 7/100");
    expect(text()).not.toContain(STAGE_MARKERS.manifest);

    await clickTab("Manifested Chapter");
    expect(text()).toContain("Step 3 of 4");
    expect(text()).toContain(STAGE_MARKERS.manifest);
    expect(text()).not.toContain(STAGE_MARKERS.results);
  });

  it("keeps the stage navigation sticky and gridded for desktop and mobile", () => {
    mount();

    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
    expect(tablist!.className).toContain("grid-cols-2");
    expect(tablist!.className).toContain("sm:grid-cols-4");
    expect(tablist!.parentElement!.className).toContain("sticky");
    expect(tablist!.parentElement!.className).toContain("top-0");

    expect(tabs().map(tab => tab.textContent)).toEqual([
      expect.stringContaining("Chapter Packet"),
      expect.stringContaining("Chapter Plan"),
      expect.stringContaining("Manifested Chapter"),
      expect.stringContaining("Chapter Results"),
    ]);
    for (const tab of tabs()) {
      expect((tab as HTMLButtonElement).disabled).toBe(false);
    }
  });

  it("keeps Permanent Story Rules closed by default and toggles it open and closed", async () => {
    mount();

    const region = [...container.querySelectorAll("details")]
      .find(candidate => candidate.textContent?.includes("Permanent Story Rules"));
    expect(region).toBeTruthy();
    expect(region!.open).toBe(false);
    // A compact one-line digest stays visible while closed.
    expect(region!.querySelector("summary")!.textContent).toContain("world rules");

    const summary = region!.querySelector("summary")!;
    await act(async () => {
      summary.click();
    });
    expect(region!.open).toBe(true);
    expect(text()).toContain("Chinese Classical — Worldbuilding");
    expect(text()).toContain("Chapter Writing Style");
    expect(text()).toContain("Style Bible");

    await act(async () => {
      summary.click();
    });
    expect(region!.open).toBe(false);
  });

  it("gives the Manifested Chapter the main reading space", () => {
    mount();

    const panel = container.querySelector('[role="tabpanel"]');
    expect(panel).toBeTruthy();
    expect(panel!.getAttribute("aria-label")).toBe("Manifested Chapter");
    // Roomier reading body instead of the compact data-card padding.
    const body = panel!.querySelector("section > div");
    expect(body!.className).toContain("sm:px-6");
    // The chapter itself fills the stage: prose, dialogue, system panel, markers.
    expect(panel!.textContent).toContain("cold iron");
    expect(panel!.textContent).toContain("Mei Lian");
    expect(panel!.textContent).toContain("Technique Refined");
    expect(panel!.textContent).toContain("tension 0.75");
  });

  it("applies control changes to the current run without losing the selected stage", async () => {
    mount(buildRun());
    await clickTab("Chapter Packet");
    expect(text()).toContain("Arc 1 — Chapter 6/100");

    rerender(buildRun("opening"));
    expect(text()).toContain("Arc 1 — Chapter 1/100");
    expect(text()).toContain("First chapter of the story");
    // Still on the same stage after the data changed.
    expect(text()).toContain("Step 1 of 4");
    expect(text()).not.toContain(STAGE_MARKERS.manifest);

    rerender(buildRun("established", "balanced-pressure", "none"));
    const summary = [...container.querySelectorAll("summary")]
      .find(candidate => candidate.textContent?.includes("Permanent Story Rules"));
    expect(summary!.textContent).toContain("No Cultural Prose");
  });
});

describe("CopyButton truthfulness", () => {
  const setClipboard = (clipboard: unknown) => {
    Object.defineProperty(window.navigator, "clipboard", {
      value: clipboard,
      configurable: true,
      writable: true,
    });
  };

  const mountCopyButton = () => {
    act(() => {
      root.render(<CopyButton text="debug-payload" />);
    });
    return container.querySelector("button")!;
  };

  it('reports "Copied" only when the clipboard write succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const button = mountCopyButton();
    expect(button.textContent).toContain("Copy");

    await act(async () => {
      button.click();
    });
    expect(writeText).toHaveBeenCalledWith("debug-payload");
    expect(button.textContent).toContain("Copied");
    expect(button.textContent).not.toContain("Copy failed");
  });

  it('reports "Copy failed" when the clipboard write rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
    setClipboard({ writeText });
    const button = mountCopyButton();

    await act(async () => {
      button.click();
    });
    expect(button.textContent).toContain("Copy failed");
    expect(button.textContent).not.toContain("Copied");
  });

  it('reports "Copy failed" when clipboard access is unavailable', async () => {
    setClipboard(undefined);
    const button = mountCopyButton();

    await act(async () => {
      button.click();
    });
    expect(button.textContent).toContain("Copy failed");
    expect(button.textContent).not.toContain("Copied");
  });
});

describe("Chapter Generation Development workspace structure", () => {
  const staticHtml = (run: ChapterPipelineRun = buildRun()) =>
    renderToStaticMarkup(<ChapterGenerationWorkspace run={run} />);

  it("keeps raw JSON inside the collapsed Technical Details section", () => {
    const html = staticHtml();

    const permanentIndex = html.indexOf("Permanent Story Rules");
    const runIndex = html.indexOf("Current Chapter Run");
    const technicalIndex = html.indexOf("Technical Details");
    expect(permanentIndex).toBeGreaterThanOrEqual(0);
    expect(runIndex).toBeGreaterThan(permanentIndex);
    expect(technicalIndex).toBeGreaterThan(runIndex);

    // Serialized packet/plan JSON appears only after the Technical Details marker.
    expect(html.indexOf("&quot;storyConstitution&quot;")).toBeGreaterThan(technicalIndex);
    expect(html.indexOf("&quot;generationRules&quot;")).toBeGreaterThan(technicalIndex);
    // The readable default stage carries no raw JSON keys.
    const runRegion = html.slice(runIndex, technicalIndex);
    expect(runRegion).not.toContain("&quot;version&quot;: 1");
    expect(runRegion).not.toContain("storyConstitution");
    // Copy controls exist for debugging inside Technical Details.
    expect(html.slice(technicalIndex)).toContain("Copy");
  });

  it("renders both permanent rules and Technical Details collapsed by default", () => {
    const html = staticHtml();
    expect(html).not.toContain("<details open");
    expect(html).toContain("<details");
    // Only the default stage is server-rendered — no stacked four-section page.
    expect(html).toContain("Step 3 of 4");
    expect(html).not.toContain("Step 1 of 4");
    expect(html).not.toContain("Step 4 of 4");
  });

  it("labels deterministic diagnostics as mock output", () => {
    const html = staticHtml();
    expect(html).toContain("Mock output");
    expect(html).toContain("deterministic Workshop diagnostics adapter");
  });

  it("labels server-generated chapters as live output", () => {
    const html = renderToStaticMarkup(
      <ChapterGenerationWorkspace
        run={buildRun()}
        generationSource={{ provider: "gemini", model: "google/gemini-test" }}
      />,
    );
    expect(html).toContain("Live output");
    expect(html).toContain("google/gemini-test");
    expect(html).not.toContain("Mock output");
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

describe("Chapter Generation token usage", () => {
  it("shows each call plus separate input, output, total, and chapter totals", () => {
    const run = buildRun();
    const result: ManifestChapterResponse = {
      provider: "gemini",
      model: "google/gemini-test",
      run,
      mapping: { mapped: [], unresolved: [], chapterMissionSource: "test" },
      usage: {
        calls: [
          {
            kind: "plan",
            stage: "Plan Chapter",
            provider: "gemini",
            model: "google/gemini-test",
            inputTokens: 100,
            outputTokens: 20,
            totalTokens: 120,
            generationTimeMs: 250,
            tokenSource: "provider",
          },
          {
            kind: "manifest",
            stage: "Manifest Chapter",
            provider: "gemini",
            model: "google/gemini-test",
            inputTokens: 200,
            outputTokens: 80,
            totalTokens: 280,
            generationTimeMs: 1_500,
            tokenSource: "estimated",
          },
        ],
        totals: {
          inputTokens: 300,
          outputTokens: 100,
          totalTokens: 400,
          generationTimeMs: 1_750,
          hasEstimatedUsage: true,
        },
      },
      nextContinuation: authenticated(buildNextChapterContinuation({
        run,
        firstArcPromise: "Reach the first arc turn.",
      })),
    };
    const html = renderToStaticMarkup(<ChapterUsageSummary result={result} />);

    expect(html).toContain("Plan Chapter");
    expect(html).toContain("Manifest Chapter");
    expect(html).toContain("Provider reported");
    expect(html).toContain("Estimated usage");
    expect(html).toContain("Chapter input");
    expect(html).toContain("Chapter output");
    expect(html).toContain("Chapter total");
    expect(html).toContain("400");

    const failedHtml = renderToStaticMarkup(
      <ChapterUsageSummary usage={result.usage} failed />,
    );
    expect(failedHtml).toContain("Model Usage Before Failure");
    const batchHtml = renderToStaticMarkup(
      <ChapterUsageSummary usage={result.usage} scope="Batch" />,
    );
    expect(batchHtml).toContain("Batch Model Usage");
    expect(batchHtml).toContain("Batch input");
    expect(batchHtml).toContain("Batch output");
    expect(batchHtml).toContain("Batch total");

    const combinedHtml = renderToStaticMarkup(<>
      <ChapterUsageSummary usage={result.usage} failed />
      <ChapterUsageSummary usage={result.usage} scope="Batch" />
      <ChapterUsageSummary result={result} />
    </>);
    const headingIds = [...combinedHtml.matchAll(/<h3 id="([^"]+)"/g)].map(match => match[1]);
    expect(new Set(headingIds).size).toBe(3);
  });
});

describe("five-chapter progress", () => {
  it("shows every chapter state and exposes retry only for a paused batch", () => {
    const batch = createFiveChapterBatchState();
    batch.status = "paused";
    batch.activeChapterNumber = 2;
    batch.chapters[0].status = "completed";
    batch.chapters[1].status = "failed";
    batch.chapters[1].error = "Temporary provider failure.";
    const html = renderToStaticMarkup(
      <BatchProgress
        batch={batch}
        selectedChapterNumber={1}
        onSelectChapter={() => undefined}
        onRetry={() => undefined}
        retrying={false}
      />,
    );

    expect(html).toContain("Manifest 5 Chapters");
    expect(html).toContain("Chapter 1");
    expect(html).toContain("Completed");
    expect(html).toContain("Chapter 2");
    expect(html).toContain("Failed");
    expect(html).toContain("Chapter 5");
    expect(html).toContain("Retry Chapter");
    expect(html).toContain("Temporary provider failure.");

    const running = structuredClone(batch);
    running.status = "running";
    const runningHtml = renderToStaticMarkup(
      <BatchProgress
        batch={running}
        selectedChapterNumber={1}
        onSelectChapter={() => undefined}
        onRetry={() => undefined}
        retrying={false}
      />,
    );
    expect(runningHtml).not.toContain("Retry Chapter");
  });

  it("offers Reader Chamber only after all five chapters complete", () => {
    const completed = createCompletedFiveChapterTestBatch();
    const completedHtml = renderToStaticMarkup(
      <BatchProgress
        batch={completed}
        selectedChapterNumber={1}
        onSelectChapter={() => undefined}
        onRetry={() => undefined}
        retrying={false}
        onReadInReaderChamber={() => undefined}
      />,
    );
    expect(completedHtml).toContain("Read in Reader Chamber");

    const paused = structuredClone(completed);
    paused.status = "paused";
    const pausedHtml = renderToStaticMarkup(
      <BatchProgress
        batch={paused}
        selectedChapterNumber={1}
        onSelectChapter={() => undefined}
        onRetry={() => undefined}
        retrying={false}
      />,
    );
    expect(pausedHtml).not.toContain("Read in Reader Chamber");
  });
});
