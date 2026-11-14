/**
 * Image files in the browser: made smaller before they are sent or kept, and
 * read as base64 or data URLs. Each falls back to the file as it is when the
 * browser cannot draw it (tests, very old browsers).
 */

/** The image redrawn so its longest side is at most `maxSide`, as JPEG; undefined when the browser cannot. */
export async function shrinkImage(image: Blob, maxSide: number, quality = 0.9): Promise<Blob | undefined> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return undefined;
  try {
    const bitmap = await createImageBitmap(image);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return await new Promise<Blob | undefined>(resolve => canvas.toBlob(blob => resolve(blob ?? undefined), 'image/jpeg', quality));
  } catch {
    return undefined;
  }
}

/** The image as a data URL (`data:image/…;base64,…`). */
export const blobToDataUrl = (image: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('The image could not be read.'));
  reader.readAsDataURL(image);
});

/** The image's bytes in base64, without the data URL's prefix. */
export const blobToBase64 = async (image: Blob) => (await blobToDataUrl(image)).replace(/^data:[^,]*,/, '');

/** A portrait attachment small enough that two fit the existing 2 MB request limit. */
export async function readCharacterReference(image: Blob): Promise<{ data: string; mimeType: string }> {
  for (const side of [1024, 768, 512]) {
    const resized = await shrinkImage(image, side, 0.86);
    const file = resized ?? image;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('The character portrait must be a PNG, JPEG or WebP image.');
    const data = await blobToBase64(file);
    if (data.length <= 850_000) return { data, mimeType: file.type };
    if (!resized) break;
  }
  throw new Error('The character portrait is too large to send. Please manifest it again.');
}

/** Base64 bytes back into an image. */
export const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
};
