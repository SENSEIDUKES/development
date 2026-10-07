import type { ChapterWritingStyle } from "../types";

export const DEFAULT_CHAPTER_WRITING_STYLE: ChapterWritingStyle = "Standard";

export const CHAPTER_WRITING_STYLE_OPTIONS = [
  "Standard",
  "Clear Reading",
  "Easy Read",
  "Literal Reading",
] as const satisfies readonly ChapterWritingStyle[];

const CHAPTER_WRITING_STYLE_INSTRUCTIONS: Record<ChapterWritingStyle, string> = {
  Standard: "",
  "Clear Reading":
    "Write this chapter in a clear, dyslexia-friendly prose style while preserving its maturity, detail, genre voice, pacing, and emotional depth.",
  "Easy Read":
    "Write this chapter in an adult Easy Read style. Preserve the complete story, characters, emotion, genre identity, and mature subject matter, but communicate everything in language that is especially direct and easy to understand.",
  "Literal Reading":
    "Write this chapter in a clear, literal prose style. Preserve its maturity, genre voice, and emotional depth, but reduce ambiguous phrasing and make actions, speakers, scene changes, and cause-and-effect relationships easy to identify.",
};

export const normalizeChapterWritingStyle = (value: unknown): ChapterWritingStyle =>
  CHAPTER_WRITING_STYLE_OPTIONS.includes(value as ChapterWritingStyle)
    ? (value as ChapterWritingStyle)
    : DEFAULT_CHAPTER_WRITING_STYLE;

export const getChapterWritingStyleInstruction = (value: unknown): string =>
  CHAPTER_WRITING_STYLE_INSTRUCTIONS[normalizeChapterWritingStyle(value)];

export const appendChapterWritingStyleInstruction = (
  prompt: string,
  value: unknown,
): string => {
  const instruction = getChapterWritingStyleInstruction(value);
  if (!instruction) return prompt;
  return `${prompt}

=========================================
CHAPTER WRITING STYLE
=========================================
${instruction}
=========================================`;
};
