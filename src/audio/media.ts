import { parseAudioCues, type AudioCue, type AudioCuesLoadResult } from './cues';
import { isPublicHttpsMediaUrl } from './mediaUrl';
import { resolveSoundscapeTrack, type SceneAudioTrack, type SoundscapeIntent } from './soundscapes';
import type { SoundWord } from './soundWords';

/** Opaque host resource identity; contains no account, price, or entitlement. */
export interface MediaResourceReference { id: string; version: string }
export type MediaSelectionSlot = 'soundscapes' | 'soundCues';
export type StoryMediaSelection = Partial<Record<MediaSelectionSlot, MediaResourceReference>>;

export interface MediaResourceProvenance {
  catalogId: string;
  version: string;
  source?: { path: string; digest: string };
}

/**
 * One atmosphere a writer may choose for a chapter: the word it is chosen by
 * and the host's bed it plays. Several beds may share a word ("forest" for
 * Forest 1, 2 and 3); the chapters that choose it take turns among them.
 */
export interface SceneAtmosphere {
  /** The host's atmosphere id, as its reader mixer knows it. */
  id: string;
  /** What the writer writes, lower case ("gentle rain"). */
  word: string;
  /** The bed's own name, where a reader sees it. */
  label?: string;
  group?: string;
}

/** Serializable, authorized resources frozen before a generation attempt. */
export interface FrozenNarrativeMedia {
  capturedAt: string;
  soundscapes: Array<{ track: SceneAudioTrack; provenance: MediaResourceProvenance }>;
  soundCues: Array<{ cue: AudioCue; provenance: MediaResourceProvenance }>;
  /** The sound words these Sound Cue recordings answer, each with its example. */
  sounds?: SoundWord[];
  /** The atmospheres a chapter may choose. Absent from media frozen before chapters chose them. */
  atmospheres?: SceneAtmosphere[];
}

export interface NarrativeMediaPort {
  /** The host enforces access. SEN does not interpret account entitlements. */
  validateSelection(selection: StoryMediaSelection, at: string): void;
  freeze(selection: StoryMediaSelection | undefined, at: string): FrozenNarrativeMedia;
}

export interface MediaCatalog {
  soundscapes: FrozenNarrativeMedia['soundscapes'];
  soundCues: AudioCuesLoadResult;
  soundCueProvenanceByUrl: ReadonlyMap<string, MediaResourceProvenance>;
  sounds: SoundWord[];
  atmospheres: SceneAtmosphere[];
}

export interface ResolvedSoundscape {
  id: string;
  blockId: string;
  intent: SoundscapeIntent;
  resource: { track: SceneAudioTrack; provenance: MediaResourceProvenance };
}

export const emptyNarrativeMedia = (capturedAt: string): FrozenNarrativeMedia => ({ capturedAt, soundscapes: [], soundCues: [] });

export function createMediaCatalog(snapshot?: FrozenNarrativeMedia): MediaCatalog {
  return {
    soundscapes: snapshot?.soundscapes ?? [],
    soundCues: parseAudioCues(snapshot?.soundCues.map(entry => entry.cue) ?? []),
    soundCueProvenanceByUrl: new Map(snapshot?.soundCues.map(entry => [entry.cue.public_url, entry.provenance]) ?? []),
    sounds: structuredClone(snapshot?.sounds ?? []),
    atmospheres: structuredClone(snapshot?.atmospheres ?? []),
  };
}

/**
 * The sound words a story may name: every declared word that at least one
 * playable recording answers (public HTTPS, with provenance), in declared order.
 */
export function soundVocabulary(media?: Pick<FrozenNarrativeMedia, 'sounds' | 'soundCues'>): SoundWord[] {
  const playable = new Set((media?.soundCues ?? [])
    .filter(({ cue, provenance }) => cue.metadata.sound && isPublicHttpsMediaUrl(cue.public_url) && isMediaResourceProvenance(provenance))
    .map(({ cue }) => cue.metadata.sound));
  return structuredClone((media?.sounds ?? []).filter(sound => playable.has(sound.word)));
}

export function resolveAuthorizedSoundscape(intent: SoundscapeIntent, catalog: MediaCatalog): ResolvedSoundscape | null {
  const track = resolveSoundscapeTrack(intent, catalog.soundscapes.map(entry => entry.track));
  if (!track) return null;
  const resource = catalog.soundscapes.find(entry => entry.track.id === track.id && entry.track.url === track.url);
  if (!resource) return null;
  return {
    id: `soundscape:${intent.blockId}:${track.id}`, blockId: intent.blockId,
    intent: { ...intent, semanticTags: [...intent.semanticTags] },
    resource: { track: { ...track, moods: [...track.moods], tags: [...track.tags] }, provenance: structuredClone(resource.provenance) },
  };
}

export function isMediaResourceProvenance(value: unknown): value is MediaResourceProvenance {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  if (typeof data.catalogId !== 'string' || !data.catalogId.trim() || typeof data.version !== 'string' || !data.version.trim()) return false;
  if (Object.keys(data).some(key => !['catalogId', 'version', 'source'].includes(key))) return false;
  if (data.source === undefined) return true;
  if (!data.source || typeof data.source !== 'object' || Array.isArray(data.source)) return false;
  const source = data.source as Record<string, unknown>;
  return Object.keys(source).every(key => ['path', 'digest'].includes(key))
    && typeof source.path === 'string' && Boolean(source.path.trim())
    && typeof source.digest === 'string' && /^[a-f0-9]{64}$/.test(source.digest);
}
