import { StoryMemory } from '../types';

/**
 * The Codex (`story.memory`) accumulates heavy media as the story grows: base64
 * `imageUrl` data-URIs and `imageHistory` on characters/factions/locations/artifacts,
 * `voiceClipUrl`/`avatarUrl` audio-visual blobs, and RAG `embedding` vectors. By a few
 * chapters in, portraits alone can push the JSON past the hosting edge's request-body
 * cap (Vercel ~4.5 MB), and chapter generation fails with HTTP 413 before it ever
 * reaches the server.
 *
 * The generation and continuity prompts are TEXT-ONLY — they never read image, audio, or
 * embedding data. So we ship a slimmed copy of the memory with those heavy fields removed.
 * The user's stored Codex is untouched; only the transmitted payload shrinks.
 */

// Field names whose values are large media/vector blobs the prompt never needs.
const HEAVY_KEYS = new Set([
  'imageUrl',
  'imageHistory',
  'imageData',
  'voiceClipUrl',
  'voiceClip',
  'avatarUrl',
  'avatar',
  'audioUrl',
  'embedding',
  'thumbnail',
]);

// Matches genuine data URIs ("data:<mime>/<subtype>[;...][,...]") without tripping on
// ordinary prose that merely begins with "data:".
const DATA_URI = /^data:[\w+.-]+\/[\w+.-]+[,;]/;

// Only descend into plain objects — a Date/Map/Set/RegExp must be passed through
// untouched rather than rebuilt into an empty object.
const isPlainObject = (val: any): boolean =>
  Object.prototype.toString.call(val) === '[object Object]';

const strip = (value: any): any => {
  if (Array.isArray(value)) return value.map(strip);
  if (isPlainObject(value)) {
    const out: Record<string, any> = {};
    for (const [key, v] of Object.entries(value)) {
      if (HEAVY_KEYS.has(key)) continue;
      // Drop base64 data-URIs stored under any key (belt-and-suspenders).
      if (typeof v === 'string' && DATA_URI.test(v)) continue;
      out[key] = strip(v);
    }
    return out;
  }
  return value;
};

/**
 * Deep-clone `memory` with heavy media/vector fields removed so the request body stays
 * under the hosting edge's body-size limit. All narrative text (names, descriptions,
 * statuses, relationships, abilities, plot threads) is preserved.
 */
export const slimMemoryForRequest = (memory: StoryMemory | undefined | null): StoryMemory =>
  strip(memory ?? {}) as StoryMemory;
