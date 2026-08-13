/**
 * Projects the existing chapter prompt's media/effects instructions into one
 * permanent rules block carried by every Chapter Packet.
 */

interface InstructionBoundary {
  start: string;
  end?: string;
}

/** Extracts one existing prompt instruction without rewriting its content. */
function extractInstructionBlock(source: string, boundary: InstructionBoundary): string {
  const startIndex = source.indexOf(boundary.start);
  if (startIndex < 0) return "";

  if (!boundary.end) return source.slice(startIndex).trim();

  const endIndex = source.indexOf(boundary.end, startIndex + boundary.start.length);
  if (endIndex < 0) return "";

  return source.slice(startIndex, endIndex).trim();
}

/** Labels a non-empty extracted effect-rule section. */
function section(name: string, instruction: string): string {
  return instruction ? `${name}\n${instruction}` : "";
}

/** Collects all seven permanent effect categories carried by the Chapter Packet. */
export function buildChapterEffectRules(
  systemInstruction: string,
  baseUserPrompt: string,
): string {
  const sections = [
    "CHAPTER EFFECT RULES",
    "Permanent chapter-generation rules available to planning and manifestation. Planning selects only the effects appropriate to the current chapter.",
    section(
      "NARRATION AND DIALOGUE METADATA",
      extractInstructionBlock(systemInstruction, {
        start: "OUTPUT FORMAT TARGET:",
        end: "You can include a \"beastEvent\" object inside the block \"metadata\"",
      }),
    ),
    section(
      "BEAST SOUND CUES",
      extractInstructionBlock(systemInstruction, {
        start: "You can include a \"beastEvent\" object inside the block \"metadata\"",
        end: "You can include a \"worldCard\" object on the block",
      }),
    ),
    section(
      "WORLD CARD AUDIO AND VISUAL CUES",
      extractInstructionBlock(systemInstruction, {
        start: "You can include a \"worldCard\" object on the block",
        end: "For a Celestial Library system moment",
      }),
    ),
    section(
      "SYSTEM PANEL VISUAL CUES",
      extractInstructionBlock(systemInstruction, {
        start: "For a Celestial Library system moment",
        end: "When useful, list notable Codex entities referenced",
      }),
    ),
    section(
      "SCENE MUSIC DIRECTION",
      extractInstructionBlock(systemInstruction, {
        start: "You may additionally emit a per-scene 'music' object",
        end: "ATMOSPHERIC AUDIO METADATA:",
      }),
    ),
    section(
      "ATMOSPHERE DIRECTION",
      extractInstructionBlock(systemInstruction, {
        start: "ATMOSPHERIC AUDIO METADATA:",
        end: "Example:",
      }),
    ),
    section(
      "NARRATIVE CUE PAYLOAD",
      extractInstructionBlock(baseUserPrompt, {
        start: "Also allow narrative cue payloads to carry normalized story metadata.",
      }),
    ),
  ].filter(Boolean);

  return sections.join("\n\n");
}
