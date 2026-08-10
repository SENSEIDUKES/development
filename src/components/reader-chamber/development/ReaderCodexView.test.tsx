import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { originChapterForThread, ReaderCodexView } from "./ReaderCodexView";

describe("ReaderCodexView", () => {
  it("uses distinct semantic status badges and retains origin Chapter 0", () => {
    const html = renderToStaticMarkup(
      <ReaderCodexView
        memory={{
          characters: [
            { name: "Living", status: "alive" },
            { name: "Fallen", status: "deceased" },
            { name: "Veiled", status: "unknown" },
            { name: "Transcendent", status: "ascended" },
          ],
          unresolvedPlotThreads: [{ description: "The prologue secret", originChapter: 0 }],
        }}
        onBackToReader={() => undefined}
      />,
    );

    expect(html).toContain("bg-emerald-950");
    expect(html).toContain("bg-rose-950");
    expect(html).toContain("bg-slate-900");
    expect(html).toContain("bg-amber-950");

    expect(originChapterForThread({ description: "The prologue secret", originChapter: 0 })).toBe(0);
  });
});
