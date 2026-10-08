/**
 * The profile picture: the reader's photo, given straight to the image model
 * with this prompt (the owner's approved words, 2026-10-08). Nothing about the
 * reader's rank or progress is added: the portrait does not evolve.
 */
export const PROFILE_PICTURE_PROMPT = 'Transform the person in the supplied photo into a cultivator rendered in high-quality Chinese fantasy animation (donghua) style, with refined stylized facial features, richly shaded flowing robes, luminous spiritual energy, and an elegant immortal presence. Preserve their recognizable likeness and skin tone.';

/** Square, shown in a circle. */
export const PROFILE_PICTURE_ASPECT_RATIO = '1:1';

/** Each request offers the reader three portraits to choose from; each is its own call. */
export const PROFILE_PICTURE_VARIATIONS = 3;
