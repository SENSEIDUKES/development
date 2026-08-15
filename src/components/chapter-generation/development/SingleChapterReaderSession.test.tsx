// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
});
