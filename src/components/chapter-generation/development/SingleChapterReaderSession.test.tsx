// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CodexCard } from "@seihouse/sen/cards";
import { createCompletedSingleChapterReaderSession } from "@seihouse/sen/reader-chamber";
import {
  installAudioMediaStubs,
  renderWithDevAudio,
} from "../../../test-utils/renderWithDevAudio";
import { createCompletedFiveChapterTestBatch } from "../shared/batch/chapterBatchTestFixture";
import { SingleChapterReaderSession } from "./SingleChapterReaderSession";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const button = (label: string) => (
  [...container.querySelectorAll<HTMLButtonElement>("button")]
    .find(candidate => candidate.getAttribute("aria-label") === label || candidate.textContent?.includes(label))
);

beforeEach(() => {
  // Silence JSDOM's "Not implemented" warnings for HTMLMediaElement methods
  // that the shared audio session invokes during its lifecycle.
  installAudioMediaStubs();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: vi.fn(() => null),
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
});

describe("SingleChapterReaderSession", () => {
  it("opens one accepted chapter in the current Reader Chamber and Reader Codex", async () => {
    const result = createCompletedFiveChapterTestBatch().chapters[0].result!;
    act(() => {
      root.render(
        renderWithDevAudio(
          <SingleChapterReaderSession result={result} onClose={() => undefined} />,
        ),
      );
    });

    expect(container.querySelector("#reader-chamber-root")).toBeTruthy();
    expect(container.textContent).toContain("Generated Title 1");
    expect(container.textContent).toContain("Final prose 1.");
    expect(button("Previous Chapter")?.disabled).toBe(true);
    expect(button("Next Chapter")?.disabled).toBe(true);

    await act(async () => button("Open Codex")!.click());
    const codex = container.querySelector('[role="dialog"][aria-label="Codex"]');
    expect(codex).toBeTruthy();
    expect(container.querySelector("#reader-chamber-root")).toBeTruthy();
    expect(codex!.textContent).toContain("Known by Chapter 1");
    expect(codex!.textContent).toContain("Generated Title 1");
    expect(codex!.textContent).not.toContain("Known by Chapter 2");
  });

  it("renders generated Codex and every System card family through packaged Reader contracts", () => {
    const result = structuredClone(createCompletedFiveChapterTestBatch().chapters[0].result!);
    result.run.processingResult.proposedLivingStoryState.codex.characters = [{
      id: "sable",
      name: "Sable",
      role: "Scout",
      relationshipToMC: "Trusted ally",
      description: "The court scout who crossed the rain archive.",
    }];
    result.run.processingResult.proposedLivingStoryState.codex.locations = [{
      id: "moon-gate",
      name: "Moon Gate",
      description: "An ordinary gate below the court terraces.",
      realm: "Mortal Realm",
    }];
    result.run.finalOutput.blocks = [{
      id: "c1-p1",
      type: "paragraph",
      text: "Sable entered the rain archive.",
      metadata: { entities: [{ name: "Sable", type: "character", mention: "reveal" }] },
    }, {
      id: "c1-p2",
      type: "paragraph",
      text: "Moon Gate opened below the terraces.",
      metadata: { entities: [{ name: "Moon Gate", type: "location", mention: "reveal" }] },
    }, {
      id: "c1-p3",
      type: "paragraph",
      text: "Sable's warning reached Rin.",
      system: {
        kind: "system_prompt",
        presentation: "narrative",
        promptType: "warning",
        title: "OATH PRESSURE RISING",
        badge: { label: "Threat", value: "Severe" },
        changes: [{ direction: "gain", label: "ENMITY GAINED", tone: "negative" }],
      },
    }, {
      id: "c1-p4",
      type: "paragraph",
      text: "Rin's witness matrix resolved.",
      system: {
        kind: "system_prompt",
        presentation: "mechanical",
        promptType: "progression",
        title: "WITNESS MATRIX",
        status: {
          level: "Ninefold",
          bars: [{ label: "Spirit", value: 72, max: 100, tone: "spirit" }],
          abilities: [{ name: "Oath Sight", detail: "Reads fractures in sworn testimony." }],
        },
      },
    }, {
      id: "c1-p5",
      type: "paragraph",
      text: "A court notice waited at Moon Gate.",
      system: {
        kind: "system_prompt",
        presentation: "world_notice",
        promptType: "quest_update",
        title: "COURT NOTICE",
        worldNotice: { entries: [{ title: "NINTH HOUSE HEARING", body: "Witnesses assemble before rainfall." }] },
      },
    }, {
      id: "c1-p6",
      type: "paragraph",
      text: "The deadline broke around Rin.",
      system: {
        kind: "fate_system_prompt",
        title: "FATE RESULT",
        fateResult: {
          outcome: "FATE AVERTED",
          timelineScar: "The Ninth House remembers the broken deadline.",
          permanentCosts: ["Sable is marked by the court."],
        },
      },
    }];
    result.run.finalOutput.generatedContent = result.run.finalOutput.blocks
      .map(block => block.text)
      .join("\n\n");
    const storedResult = JSON.parse(JSON.stringify(result)) as typeof result;

    act(() => {
      root.render(renderWithDevAudio(
        <SingleChapterReaderSession result={storedResult} onClose={() => undefined} />,
      ));
    });

    expect(container.querySelector('[data-color-code="ally"]')).toBeTruthy();
    expect(container.querySelector('[data-color-code="location"]')).toBeTruthy();
    expect(container.querySelector('[data-system-presentation="narrative"]')).toBeTruthy();
    expect(container.querySelector('[data-system-presentation="mechanical"]')).toBeTruthy();
    expect(container.querySelector('[data-system-presentation="world_notice"]')).toBeTruthy();
    expect(container.querySelector('[data-system-presentation="fate"]')).toBeTruthy();
    expect(container.querySelector('[data-status-bar="spirit"][data-color-code="mainCharacter"]')).toBeTruthy();
    expect([...container.querySelectorAll('[data-color-code="enemy"]')]
      .some(element => element.textContent?.toUpperCase().includes("GAINED"))).toBe(true);
    expect(container.textContent).toContain("NINTH HOUSE HEARING");
    expect(container.textContent).toContain("FATE AVERTED");
  });

  it("passes the generated story main-character identity into inline Codex hovercards", () => {
    const result = structuredClone(createCompletedFiveChapterTestBatch().chapters[0].result!);
    const mainCharacterName = result.run.chapterPacket.storyConstitution.mainCharacterName;
    result.run.processingResult.proposedLivingStoryState.codex.characters = [{
      id: "generated-main-character",
      name: mainCharacterName,
      role: "Witness",
      portraitKind: "non-human",
      description: "The generated story's oath-reader.",
    }];
    result.run.finalOutput.blocks = [{
      id: "generated-main-character-reference",
      type: "paragraph",
      text: `${mainCharacterName} entered the rain archive.`,
      metadata: {
        entities: [{ name: mainCharacterName, type: "character", mention: "reference" }],
      },
    }];
    result.run.finalOutput.generatedContent = result.run.finalOutput.blocks[0].text;

    act(() => {
      root.render(renderWithDevAudio(
        <SingleChapterReaderSession result={result} onClose={() => undefined} />,
      ));
    });

    const anchor = container.querySelector<HTMLElement>('[data-slot="codex-hovercard-anchor"]');
    expect(anchor?.getAttribute("data-color-code")).toBe("mainCharacter");
  });

  it("re-resolves a generated character card when current Codex relationship state changes", () => {
    const result = structuredClone(createCompletedFiveChapterTestBatch().chapters[0].result!);
    result.run.processingResult.proposedLivingStoryState.codex.characters = [{
      id: "sable",
      name: "Sable",
      role: "Scout",
      relationshipToMC: "Trusted ally",
      description: "The court scout.",
    }];
    const session = createCompletedSingleChapterReaderSession(result);
    const ally = session.story.memory!.characters![0];

    act(() => {
      root.render(<CodexCard revealTerm={{ type: "character", entry: ally }} activeStory={session.story} isSenMode />);
    });
    expect(container.querySelector('[data-color-code="ally"]')).toBeTruthy();

    const enemy = { ...ally, relationshipToMC: "Former ally, now enemy" };
    act(() => {
      root.render(<CodexCard revealTerm={{ type: "character", entry: enemy }} activeStory={session.story} isSenMode />);
    });
    expect(container.querySelector('[data-color-code="enemy"]')).toBeTruthy();
    expect(container.querySelector('[data-color-code="ally"]')).toBeFalsy();
  });
});
