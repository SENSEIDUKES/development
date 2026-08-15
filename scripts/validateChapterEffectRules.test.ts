import { describe, expect, it } from "vitest";
import { ESTABLISHED_SCENARIO } from "../src/components/chapter-generation/shared/fixtures/mockGenerationData";
import { assembleChapterGenerationPacket } from "../src/components/chapter-generation/shared/packets/assembly";
import { assembleChapterPacket } from "../src/components/chapter-generation/shared/pipeline/assembleChapterPacket";

const representativeDetails = [
  ["narration and dialogue metadata", "OUTPUT FORMAT TARGET:", "DO NOT output direct voice IDs."],
  ["beast sound cues", "BEAST SOUND CUES", "Use this sparingly and only on significant narrative beats."],
  ["World Card audio and visual cues", "WORLD CARD AUDIO AND VISUAL CUES", "application code owns identity and resolves stored media."],
  ["system-panel visual cues", "SYSTEM PANEL VISUAL CUES", "DOOM MANIFESTED"],
  ["scene music", "SCENE MUSIC DIRECTION", '"boss-fight"'],
  ["atmosphere", "ATMOSPHERE DIRECTION", "never infer rain merely because characters are travelling."],
  ["narrative cue payloads", "NARRATIVE CUE PAYLOAD", "DO NOT generate summary or memory updates"],
] as const;

describe("Chapter Packet effect rules", () => {
  it("carries complete permanent rules for all seven effect categories", () => {
    const packet = assembleChapterPacket(
      assembleChapterGenerationPacket(ESTABLISHED_SCENARIO),
    );
    const rules = packet.generationRules.effectRules;

    representativeDetails.forEach(([category, openingDetail, laterDetail]) => {
      expect(rules, `${category} is missing its opening instruction.`).toContain(openingDetail);
      expect(rules, `${category} is missing a representative later detail.`).toContain(laterDetail);
    });
  });
});
