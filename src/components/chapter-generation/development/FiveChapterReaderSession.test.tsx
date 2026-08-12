// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCompletedFiveChapterTestBatch } from "../shared/batch/chapterBatchTestFixture";
import { FiveChapterReaderSession } from "./FiveChapterReaderSession";
import {
  MOCK_READER_FALLBACK_LABEL,
  createMockReaderFallback,
} from "../../../workshop/previews/reader-chamber/previewData";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const button = (label: string) => (
  [...container.querySelectorAll<HTMLButtonElement>("button")]
    .find(candidate => candidate.getAttribute("aria-label") === label || candidate.textContent?.includes(label))
);

beforeEach(() => {
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

describe("FiveChapterReaderSession", () => {
  it("opens the actual Reader Chamber, navigates all five chapters, and scopes Codex memory", async () => {
    const batch = createCompletedFiveChapterTestBatch();
    act(() => {
      root.render(<FiveChapterReaderSession batch={batch} onClose={() => undefined} />);
    });

    expect(container.querySelector("#reader-chamber-root")).toBeTruthy();
    expect(container.textContent).toContain("Generated Title 1");
    expect(container.textContent).toContain("Chapter 1 tokens");
    expect(container.textContent).toContain("Five-chapter batch tokens");

    await act(async () => button("Open Codex")!.click());
    expect(container.querySelector('[role="dialog"][aria-label="Codex"]')).toBeTruthy();
    expect(container.querySelector("#reader-chamber-root")).toBeTruthy();
    expect(container.textContent).toContain("Known by Chapter 1");
    expect(container.textContent).not.toContain("Known by Chapter 5");
    await act(async () => button("Close Codex Sheet")!.click());
    expect(container.querySelector('[role="dialog"][aria-label="Codex"]')).toBeFalsy();

    for (let chapterNumber = 2; chapterNumber <= 5; chapterNumber += 1) {
      await act(async () => button("Next Chapter")!.click());
      expect(container.textContent).toContain(`Generated Title ${chapterNumber}`);
      expect(container.textContent).toContain(`Chapter ${chapterNumber} tokens`);
    }
    expect(button("Next Chapter")?.disabled).toBe(true);
  });

  it("opens the unchanged four-stage Diagnostics for the currently selected chapter", async () => {
    const batch = createCompletedFiveChapterTestBatch();
    act(() => {
      root.render(<FiveChapterReaderSession batch={batch} onClose={() => undefined} />);
    });
    await act(async () => button("Next Chapter")!.click());
    await act(async () => button("Chapter 2 Diagnostics")!.click());

    expect(container.textContent).toContain("Chapter 2 Diagnostics");
    expect(container.textContent).toContain("Existing four-stage Diagnostics");
    expect(container.textContent).toContain("Step 3 of 4");
    expect(container.textContent).toContain("Original manifested prose 2.");
    expect(container.textContent).not.toContain("Original manifested prose 1.");
  });

  it("persists local image choices for sparse generated-session Codex entries", async () => {
    const batch = createCompletedFiveChapterTestBatch();
    act(() => {
      root.render(<FiveChapterReaderSession batch={batch} onClose={() => undefined} />);
    });

    await act(async () => button("Open Codex")!.click());
    await act(async () => button("Awaken portrait for Known by Chapter 1")!.click());

    const secondForm = container.querySelector<HTMLElement>(
      '[role="button"][aria-label="Select form 2"]',
    );
    expect(secondForm).toBeTruthy();
    await act(async () => secondForm!.click());
    await act(async () => button("Seal Form into Codex")!.click());

    const manifestedPortrait = container.querySelector<HTMLImageElement>(
      'img[alt="Known by Chapter 1"]',
    );
    expect(manifestedPortrait?.src).toMatch(/^data:image\/svg\+xml/);
    expect(container.textContent).toContain("Evolution successfully bonded to the local Codex.");
  });

  it("keeps mock content explicitly labeled and only on the no-batch preview", async () => {
    const batch = createCompletedFiveChapterTestBatch();
    act(() => {
      root.render(<FiveChapterReaderSession batch={batch} onClose={() => undefined} />);
    });
    expect(container.textContent).not.toContain(MOCK_READER_FALLBACK_LABEL);

    const fallback = createMockReaderFallback();
    expect(fallback.kind).toBe("mock-fallback");
    expect(fallback.label).toBe(MOCK_READER_FALLBACK_LABEL);
    expect(fallback.story.title).toBe("Ashes of the Ninth Meridian");
    expect(fallback.story.arcs[0].chapters).toHaveLength(4);
  });
});
