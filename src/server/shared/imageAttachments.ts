/** Images a model works from (a reader's photo, an Image Lab attachment): what the server accepts. */
export const ATTACHED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
/**
 * An attachment's base64 length: about 1.3 MB of image, inside the 2 MB
 * Development request limit. Hosts shrink a photo before sending it, so a
 * phone photo fits.
 */
export const ATTACHED_IMAGE_MAX_BASE64 = 1_800_000;

export interface AttachedImage { data: string; mimeType: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** Reads one attached image, or says in plain words what is wrong with it (`tooLarge` for a 413). */
export function parseAttachedImage(value: unknown): { image: AttachedImage } | { error: string; tooLarge?: true } {
  if (!isRecord(value) || typeof value.data !== 'string' || !value.data || typeof value.mimeType !== 'string'
    || !ATTACHED_IMAGE_TYPES.includes(value.mimeType as never) || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.data)) {
    return { error: 'Attach a PNG, JPEG or WebP image.' };
  }
  if (value.data.length > ATTACHED_IMAGE_MAX_BASE64) return { error: 'The image is too large. Use a smaller photo.', tooLarge: true };
  return { image: { data: value.data, mimeType: value.mimeType } };
}
