/**
 * Meaning fingerprints: a piece of text reduced to a short list of numbers by an
 * embedding model, so two texts can be compared by what they mean instead of by
 * the words they share.
 *
 * The engine never calls a model. A host fingerprints text however it likes and
 * hands the numbers over; everything here is arithmetic, so it runs the same in
 * a browser, on a server and in a build script.
 *
 * A fingerprint is stored small: the first `FINGERPRINT_DIMENSIONS` numbers of
 * the model's vector (models trained to be shortened keep their meaning there),
 * scaled into one signed byte each. Comparison only needs the direction of the
 * vector, so the scale is not kept.
 */
export const FINGERPRINT_DIMENSIONS = 768;

export type Fingerprint = Int8Array;

/**
 * Shorten a model's vector and store it one signed byte per number.
 *
 * Numbers are scaled by the vector's typical size, not its largest one: a
 * single outsized number would otherwise squeeze all the others into a few
 * steps. The rare number beyond four times typical is capped.
 */
export const packFingerprint = (vector: readonly number[], dimensions = FINGERPRINT_DIMENSIONS): Fingerprint => {
  const size = Math.min(dimensions, vector.length);
  let squares = 0;
  for (let index = 0; index < size; index += 1) squares += vector[index] * vector[index];
  const typical = Math.sqrt(squares / size);
  const packed = new Int8Array(size);
  if (!typical || !Number.isFinite(typical)) return packed;
  for (let index = 0; index < size; index += 1) {
    packed[index] = Math.max(-127, Math.min(127, Math.round((vector[index] / (typical * 4)) * 127)));
  }
  return packed;
};

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** A fingerprint as text, for JSON files and HTTP bodies. */
export const encodeFingerprint = (fingerprint: Fingerprint): string => {
  const bytes = new Uint8Array(fingerprint.buffer, fingerprint.byteOffset, fingerprint.byteLength);
  let text = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    text += BASE64[a >> 2]
      + BASE64[((a & 3) << 4) | ((b ?? 0) >> 4)]
      + (b === undefined ? '=' : BASE64[((b & 15) << 2) | ((c ?? 0) >> 6)])
      + (c === undefined ? '=' : BASE64[c & 63]);
  }
  return text;
};

/** Read a fingerprint back from text; text that is not a fingerprint gives an empty one. */
export const decodeFingerprint = (text: string): Fingerprint => {
  const clean = text.replace(/=+$/, '');
  if (!clean || /[^A-Za-z0-9+/]/.test(clean)) return new Int8Array(0);
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let position = 0;
  for (const character of clean) {
    buffer = (buffer << 6) | BASE64.indexOf(character);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[position] = (buffer >> bits) & 255;
      position += 1;
    }
  }
  return new Int8Array(bytes.buffer, 0, position);
};

/**
 * How close two fingerprints are in meaning: 1 is the same meaning, 0 is
 * unrelated. Fingerprints of different lengths, or empty ones, compare as 0.
 */
export const meaningSimilarity = (a: Fingerprint, b: Fingerprint): number => {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    aa += a[index] * a[index];
    bb += b[index] * b[index];
  }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
};

/**
 * A short stamp of a text, kept beside its stored fingerprint so a check can
 * tell when the text changed and the fingerprint is stale.
 */
export const textStamp = (text: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};
