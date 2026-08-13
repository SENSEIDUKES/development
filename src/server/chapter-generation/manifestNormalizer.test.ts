import { describe, expect, it } from "vitest";
import {
  MINIMUM_CHAPTER_WORD_COUNT,
  normalizeManifestResponse,
} from "./manifestNormalizer";

const ndjson = (...blocks: Array<Record<string, unknown> | string>) => [
  "---CHAPTER_BLOCKS---",
  ...blocks.map(block => typeof block === "string" ? block : JSON.stringify(block)),
].join("\n");

describe("Manifest prose recovery", () => {
  it("recovers the Timeless c2-p5 system-label failure as normal prose", () => {
    const result = normalizeManifestResponse(ndjson(
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `c2-p${index + 1}`,
        type: "paragraph",
        text: `Lead-in prose ${index + 1}.`,
      })),
      {
        id: "c2-p5",
        type: "system",
        text: "Yan Shi felt the seal release and stepped into the lower court.",
      },
    ), 2);

    expect(result.blocks[4]).toEqual({
      id: "c2-p5",
      type: "paragraph",
      text: "Yan Shi felt the seal release and stepped into the lower court.",
    });
    expect(result.diagnostics.warnings).toContainEqual(expect.objectContaining({
      code: "block-type-normalized",
      blockId: "c2-p5",
      field: "type",
    }));
  });

  it("preserves valid System and World Card enrichment on paragraph prose", () => {
    const result = normalizeManifestResponse(ndjson(
      {
        id: "system-panel",
        type: "paragraph",
        text: "A pale ledger unfolded across his sight.",
        system: {
          kind: "appraisal",
          promptType: "mystery",
          title: "Hidden Meridian",
          rows: [{ label: "State", value: "Sealed" }],
        },
      },
      {
        id: "world-card",
        type: "world-card",
        text: "The Lower Periphery opened beneath the mountain wall.",
        worldCard: {
          id: "model-owned-id",
          entityType: "location",
          entityName: "The Lower Periphery (the sect's sprawling outer district)",
          displayTitle: "The Lower Periphery",
          audioType: "ambience",
          sound: {
            assetId: "model-owned-audio-id",
            size: "huge",
            assetFamily: "spell",
            tags: ["district", 42],
          },
        },
      },
    ), 2);

    expect(result.blocks[0].system).toMatchObject({
      kind: "appraisal",
      title: "Hidden Meridian",
    });
    expect(result.blocks[1]).toMatchObject({
      type: "paragraph",
      worldCard: {
        id: "dev-location-the-lower-periphery",
        entityName: "The Lower Periphery",
        sound: { tags: ["district"] },
      },
    });
    expect(result.diagnostics.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "block-type-normalized", blockId: "c2-p2" }),
      expect.objectContaining({ field: "worldCard.id" }),
      expect.objectContaining({ field: "worldCard.audioType" }),
      expect.objectContaining({ field: "worldCard.sound.assetId" }),
      expect.objectContaining({ field: "worldCard.sound.size" }),
      expect.objectContaining({ field: "worldCard.sound.assetFamily" }),
      expect.objectContaining({ field: "worldCard.sound.tags[1]" }),
    ]));
  });

  it("removes malformed optional enrichment without dropping its prose", () => {
    const unsafeField = `<script>${"x".repeat(140)}</script>`;
    const result = normalizeManifestResponse(ndjson({
      id: "optional-errors",
      type: "paragraph",
      text: "The crowd fell silent, but the scene continued.",
      metadata: {
        audioSignature: 42,
        atmosphereCategory: "fog",
        music: { mood: "", intensity: "loud" },
        entities: [{ name: "Yan Shi", type: "person", mention: "maybe" }],
        beastEvent: { type: "reveal", profile: "not-an-object" },
      },
      system: { kind: "unknown", title: "Broken" },
      worldCard: { entityType: "place", entityName: "Court" },
      audio: { clip: "model-owned" },
      [unsafeField]: true,
    }), 2);

    expect(result.blocks).toEqual([{
      id: "c2-p1",
      type: "paragraph",
      text: "The crowd fell silent, but the scene continued.",
    }]);
    expect(result.diagnostics.warnings.map(item => item.field)).toEqual(expect.arrayContaining([
      "metadata.audioSignature",
      "metadata.atmosphereCategory",
      "metadata.music",
      "metadata.entities[0]",
      "metadata.beastEvent",
      "system",
      "worldCard",
      "audio",
    ]));
    const sanitized = result.diagnostics.warnings.find(item => item.message.includes("block field"));
    expect(sanitized?.field?.length).toBeLessThanOrEqual(96);
    expect(sanitized?.message).not.toContain("<script>");
  });

  it("assigns stable IDs for missing, invalid, and duplicate IDs", () => {
    const response = ndjson(
      { type: "narration", text: "First." },
      { id: "duplicate", type: "paragraph", text: "Second." },
      { id: "duplicate", type: "dialogue", text: "Third." },
      { id: "bad id", type: "monologue", text: "Fourth." },
    );

    const first = normalizeManifestResponse(response, 4);
    const second = normalizeManifestResponse(response, 4);
    expect(first.blocks.map(block => block.id)).toEqual([
      "c4-p1",
      "c4-p2",
      "c4-p3",
      "c4-p4",
    ]);
    expect(second.blocks.map(block => block.id)).toEqual(first.blocks.map(block => block.id));
    expect(first.blocks.map(block => block.type)).toEqual([
      "paragraph",
      "paragraph",
      "dialogue",
      "paragraph",
    ]);
  });

  it("keeps readable blocks surrounding an unreadable optional block", () => {
    const result = normalizeManifestResponse([
      "---CHAPTER_BLOCKS---",
      JSON.stringify({ id: "before", type: "paragraph", text: "Before the broken cue." }),
      '{"id":"broken","type":"paragraph","text":',
      JSON.stringify({ id: "after", type: "paragraph", text: "After the broken cue." }),
    ].join("\n"), 3);

    expect(result.blocks.map(block => block.text)).toEqual([
      "Before the broken cue.",
      "After the broken cue.",
    ]);
    expect(result.diagnostics.status).toBe("needs-review");
    expect(result.diagnostics.warnings).toContainEqual(expect.objectContaining({
      code: "block-skipped",
    }));
    expect(result.diagnostics.warnings.find(item => item.code === "block-skipped"))
      .not.toHaveProperty("blockIndex");
  });

  it("recovers multiple pretty-printed JSON blocks", () => {
    const result = normalizeManifestResponse([
      "---CHAPTER_BLOCKS---",
      JSON.stringify({ type: "paragraph", text: "First formatted block." }, null, 2),
      JSON.stringify({ type: "dialogue", text: "Second formatted block." }, null, 2),
    ].join("\n"), 5);

    expect(result.blocks).toEqual([
      { id: "c5-p1", type: "paragraph", text: "First formatted block." },
      { id: "c5-p2", type: "dialogue", text: "Second formatted block." },
    ]);
  });

  it("recovers plain prose while still rejecting a response with no usable prose", () => {
    const plain = normalizeManifestResponse(
      "The gate opened.\n\nYan Shi stepped through without looking back.",
      1,
    );
    expect(plain.blocks).toHaveLength(2);
    expect(plain.diagnostics.warnings).toContainEqual(expect.objectContaining({
      code: "plain-prose-recovered",
    }));

    expect(() => normalizeManifestResponse(
      ndjson({ id: "empty", type: "paragraph", metadata: { mode: "narration" } }),
      1,
    )).toThrow("no recoverable prose");
    expect(() => normalizeManifestResponse(
      "I cannot write this chapter because the request is disallowed.",
      1,
    )).toThrow("provider refusal");
    expect(() => normalizeManifestResponse("```json\n```", 1)).toThrow("no content");
    expect(() => normalizeManifestResponse(ndjson(
      ...Array.from({ length: 501 }, (_, index) => ({ text: `Block ${index}.` })),
    ), 1)).toThrow("too many blocks");
  });

  it("calculates the exact word count and preserves under-minimum prose for review", () => {
    const exact = normalizeManifestResponse(ndjson({
      type: "paragraph",
      text: Array.from({ length: MINIMUM_CHAPTER_WORD_COUNT }, (_, index) => `word${index}`).join(" "),
    }), 1);
    expect(exact.diagnostics.wordCount).toBe(MINIMUM_CHAPTER_WORD_COUNT);
    expect(exact.diagnostics.status).toBe("healthy");

    const short = normalizeManifestResponse(ndjson({
      type: "paragraph",
      text: "Every surviving word remains available to the reader and reviewer.",
    }), 1);
    expect(short.generatedContent).toContain("Every surviving word");
    expect(short.diagnostics).toMatchObject({
      status: "needs-review",
      wordCount: 10,
      minimumWordCount: MINIMUM_CHAPTER_WORD_COUNT,
    });
    expect(short.diagnostics.warnings).toContainEqual(expect.objectContaining({
      code: "under-minimum-word-count",
    }));
  });
});
