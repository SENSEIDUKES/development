/** The shapes an Image Lab image may take. */
export const IMAGE_LAB_ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9'] as const;
export type ImageLabAspectRatio = typeof IMAGE_LAB_ASPECT_RATIOS[number];
/** A prompt is the owner's own words, up to this many characters. */
export const IMAGE_LAB_PROMPT_LIMIT = 8_000;
export const IMAGE_LAB_TIMEOUT_MS = 120_000;
