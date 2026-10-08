import { ATTACHED_IMAGE_MAX_BASE64, ATTACHED_IMAGE_TYPES } from '../shared/imageAttachments';

/** The shapes an Image Lab image may take. */
export const IMAGE_LAB_ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9'] as const;
export type ImageLabAspectRatio = typeof IMAGE_LAB_ASPECT_RATIOS[number];
/** A prompt is the owner's own words, up to this many characters. */
export const IMAGE_LAB_PROMPT_LIMIT = 8_000;
export const IMAGE_LAB_TIMEOUT_MS = 120_000;

/** Attached images the model works from, such as a photo for a profile picture. */
export const IMAGE_LAB_ATTACHMENT_TYPES = ATTACHED_IMAGE_TYPES;
export const IMAGE_LAB_ATTACHMENT_LIMIT = 1;
export const IMAGE_LAB_ATTACHMENT_MAX_BASE64 = ATTACHED_IMAGE_MAX_BASE64;
/** Images made from one prompt in one try: one, or three to choose from. */
export const IMAGE_LAB_VARIATIONS = [1, 3] as const;
