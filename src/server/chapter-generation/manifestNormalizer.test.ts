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

  it("preserves valid System Prompt enrichment on paragraph prose (structured and literary)", () => {
    const result = normalizeManifestResponse(ndjson(
      {
        id: "system-panel-structured",
        type: "paragraph",
        text: "A pale ledger unfolded across his sight.",
        system: {
          kind: "system_prompt",
          promptType: "mystery",
          title: "Hidden Meridian",
          rarity: "Ancient",
          rows: [{ label: "State", value: "Sealed" }],
        },
      },
      {
        id: "system-panel-literary",
        type: "paragraph",
        text: "The Dao resonant voice echoed in the void.",
        system: {
          kind: "system_prompt",
          promptType: "breakthrough",
          title: "Heavenly Recognition",
        },
      },
      {
        id: "fate-system-panel",
        type: "paragraph",
        text: "The rain court shattered.",
        system: {
          kind: "fate_system_prompt",
          title: "Destiny Severed",
          fateResult: {
            outcome: "FATE SCARRED",
            timelineScar: "The vow was broken before witnesses.",
            permanentCosts: ["Lost right eye sight"],
          },
        },
      },
    ), 2);

    expect(result.blocks[0].system).toEqual({
      kind: "system_prompt",
      promptType: "mystery",
      title: "Hidden Meridian",
      rarity: "Ancient",
      rows: [{ label: "State", value: "Sealed" }],
    });
    expect(result.blocks[1].system).toEqual({
      kind: "system_prompt",
      promptType: "breakthrough",
      title: "Heavenly Recognition",
    });
    expect(result.blocks[2].system).toEqual({
      kind: "fate_system_prompt",
      title: "Destiny Severed",
      fateResult: {
        outcome: "FATE SCARRED",
        timelineScar: "The vow was broken before witnesses.",
        permanentCosts: ["Lost right eye sight"],
      },
    });
  });

  it("removes disallowed fateResult from regular system_prompt and rejects fate_system_prompt lacking fateResult", () => {
    const result = normalizeManifestResponse(ndjson(
      {
        id: "system-with-disallowed-fate",
        type: "paragraph",
        text: "Notice appears.",
        system: {
          kind: "system_prompt",
          title: "Regular Prompt",
          fateResult: { outcome: "FATE AVERTED", timelineScar: "None", permanentCosts: [] },
        },
      },
      {
        id: "fate-without-payload",
        type: "paragraph",
        text: "Fate event occurs.",
        system: {
          kind: "fate_system_prompt",
          title: "Broken Fate Prompt",
        },
      },
      {
        id: "obsolete-kind",
        type: "paragraph",
        text: "Obsolete status event.",
        system: {
          kind: "status",
          title: "Old Status",
        },
      },
    ), 2);

    expect(result.blocks[0].system).toEqual({
      kind: "system_prompt",
      title: "Regular Prompt",
    });
    expect(result.blocks[1].system).toBeUndefined();
    expect(result.blocks[2].system).toBeUndefined();
    expect(result.diagnostics.warnings).toContainEqual(expect.objectContaining({
      code: "optional-field-removed",
      field: "system.fateResult",
    }));
  });

  it("preserves valid World Notices and removes malformed or misplaced notice presentation data", () => {
    const result = normalizeManifestResponse(ndjson(
      {
        id: "world-notice",
        type: "system",
        text: "A notice is pinned beside the east gate.",
        system: {
          kind: "system_prompt",
          presentation: "world_notice",
          promptType: "quest_update",
          title: "GUILD BOUNTY",
          flavor: "East Gate Guild Dispatch",
          worldNotice: {
            entries: [{
              title: "BLACKTHORN WOLF PACK",
              body: "Cull the pack on the Rain Road.",
              details: [{ label: "Reward", value: "42 silver marks" }],
            }],
          },
        },
      },
      {
        id: "empty-world-notice",
        type: "system",
        text: "An incomplete notice remains readable prose.",
        system: {
          kind: "system_prompt",
          presentation: "world_notice",
          promptType: "warning",
          title: "WANTED NOTICE",
          worldNotice: { entries: [] },
        },
      },
      {
        id: "regular-misplaced-world-notice",
        type: "system",
        text: "The status display remains readable prose.",
        system: {
          kind: "system_prompt",
          presentation: "mechanical",
          promptType: "quest_update",
          title: "Objective Update",
          worldNotice: { entries: [{ title: "Ignored notice" }] },
        },
      },
      {
        id: "misplaced-world-notice",
        type: "system",
        text: "Fate settles its account.",
        system: {
          kind: "fate_system_prompt",
          promptType: "fate_event",
          title: "Fate Result",
          presentation: "mechanical",
          worldNotice: { entries: [{ title: "Ignored notice" }] },
          fateResult: {
            outcome: "FATE AVERTED",
            timelineScar: "The deadline was turned aside.",
            permanentCosts: [],
          },
        },
      },
    ), 2);

    expect(result.blocks[0].system).toEqual({
      kind: "system_prompt",
      presentation: "world_notice",
      promptType: "quest_update",
      title: "GUILD BOUNTY",
      flavor: "East Gate Guild Dispatch",
      worldNotice: {
        entries: [{
          title: "BLACKTHORN WOLF PACK",
          body: "Cull the pack on the Rain Road.",
          details: [{ label: "Reward", value: "42 silver marks" }],
        }],
      },
    });
    expect(result.blocks[1].system).toEqual({
      kind: "system_prompt",
      promptType: "warning",
      title: "WANTED NOTICE",
    });
    expect(result.blocks[2].system).toEqual({
      kind: "system_prompt",
      presentation: "mechanical",
      promptType: "quest_update",
      title: "Objective Update",
    });
    expect(result.blocks[3].system).toEqual({
      kind: "fate_system_prompt",
      promptType: "fate_event",
      title: "Fate Result",
      fateResult: {
        outcome: "FATE AVERTED",
        timelineScar: "The deadline was turned aside.",
        permanentCosts: [],
      },
    });
    expect(result.diagnostics.warnings).toContainEqual(expect.objectContaining({
      field: "system.presentation",
    }));
    expect(result.diagnostics.warnings).toContainEqual(expect.objectContaining({
      field: "system.worldNotice",
    }));
  });

  it("preserves creature entities from the documented metadata contract", () => {
    const result = normalizeManifestResponse(ndjson({
      id: "creature-reveal",
      type: "paragraph",
      text: "The Thunder Roc eclipsed the moon.",
      metadata: {
        entities: [{ name: "Thunder Roc", type: "creature", mention: "reveal" }],
      },
    }), 2);

    expect(result.blocks[0].metadata?.entities).toEqual([
      { name: "Thunder Roc", type: "creature", mention: "reveal" },
    ]);
  });

  it("normalizes exact audible actions onto stable block references", () => {
    const result = normalizeManifestResponse(ndjson({
      id: "model-picked-id",
      type: "paragraph",
      text: "The bell tolled once. Then the bell tolled once again.",
      metadata: {
        audioMoments: [{
          blockId: "model-picked-id",
          triggerPhrase: "bell tolled once",
          occurrenceIndex: 1,
          sourceCategory: "locations",
          variation: "signatures",
          semanticTags: ["bell", "resonant"],
          relatedEntity: { name: "Witness Bell", type: "location" },
        }],
      },
    }), 7);

    expect(result.blocks[0].id).toBe("c7-p1");
    expect(result.blocks[0].metadata?.audioMoments).toEqual([{
      blockId: "c7-p1",
      triggerPhrase: "bell tolled once",
      occurrenceIndex: 1,
      sourceCategory: "locations",
      variation: "signatures",
      semanticTags: ["bell", "resonant"],
      relatedEntity: { name: "Witness Bell", type: "location" },
    }]);
  });

  it("drops noun-only, technical, misplaced, and duplicate audio moments without losing prose", () => {
    const result = normalizeManifestResponse(ndjson({
      type: "paragraph",
      text: "Wen drew the Ashen Sword from its sheath with a metallic ring.",
      metadata: {
        audioMoments: [{
          triggerPhrase: "Ashen Sword",
          sourceCategory: "weapons",
          variation: "unsheathe",
          semanticTags: ["sword"],
          relatedEntity: { name: "Ashen Sword", type: "artifact" },
        }, {
          triggerPhrase: "drew the Ashen Sword from its sheath",
          sourceCategory: "weapons",
          variation: "unsheathe",
          semanticTags: ["sword", "draw"],
          cueUrl: "https://model.invalid/cue.mp3",
        }, {
          triggerPhrase: "rang three times",
          sourceCategory: "weapons",
          variation: "unsheathe",
          semanticTags: ["ring"],
        }, {
          triggerPhrase: "drew the Ashen Sword from its sheath",
          sourceCategory: "weapons",
          variation: "unsheathe",
          semanticTags: ["draw"],
        }, {
          triggerPhrase: "drew the Ashen Sword from its sheath",
          sourceCategory: "weapons",
          variation: "reload",
          semanticTags: ["magic"],
        }, {
          triggerPhrase: "metallic ring",
          sourceCategory: "weapons",
          variation: "unsheathe",
          semanticTags: ["ring"],
          relatedEntity: { id: "model-owned-id", name: "Ashen Sword" },
        }],
      },
    }), 2);

    expect(result.blocks[0].text).toContain("Ashen Sword");
    expect(result.blocks[0].metadata?.audioMoments).toEqual([expect.objectContaining({
      blockId: "c2-p1",
      triggerPhrase: "drew the Ashen Sword from its sheath",
      sourceCategory: "weapons",
    })]);
    expect(result.diagnostics.warnings).toContainEqual(expect.objectContaining({
      code: "optional-field-removed",
      field: "metadata.audioMoments",
    }));
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
