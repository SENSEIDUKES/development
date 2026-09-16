/**
 * Client-safe SEN soundscape catalog and deterministic resolver. The built-in
 * tracks remain the base experience; an authorized Media Loadout may append
 * validated candidates before calling the same resolver.
 */

export const SOUNDSCAPE_REGIONS = ['chinese', 'japanese', 'korean', 'western'] as const;
export type SoundscapeRegion = (typeof SOUNDSCAPE_REGIONS)[number];

export const isSoundscapeRegion = (value: unknown): value is SoundscapeRegion => (
  typeof value === 'string' && (SOUNDSCAPE_REGIONS as readonly string[]).includes(value)
);

export interface SceneAudioTrack {
  id: string;
  mood: string;
  moods: string[];
  tags: string[];
  /** Cultural scoring region. Regionless built-in tracks remain neutral fallbacks. */
  region?: SoundscapeRegion;
  url: string;
  isPremium: boolean;
}

export interface SoundscapeIntent {
  blockId: string;
  mood?: string;
  region?: SoundscapeRegion;
  semanticTags: string[];
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isPublicHttpsUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && Boolean(url.hostname)
      && !url.username
      && !url.password;
  } catch {
    return false;
  }
};

/** Validate the existing soundscape track contract without inventing a second audio shape. */
export function validateSceneAudioTrack(value: unknown): SceneAudioTrack {
  if (!isPlainObject(value)) throw new Error('Soundscape catalog entries must be plain objects.');
  const allowed = new Set(['id', 'mood', 'moods', 'tags', 'region', 'url', 'isPremium']);
  const unexpected = Object.keys(value).find(key => !allowed.has(key));
  if (unexpected) throw new Error(`Soundscape catalog entry contains unsupported field ${unexpected}.`);
  if (typeof value.id !== 'string' || !value.id.trim()) throw new Error('Soundscape track id is required.');
  if (typeof value.mood !== 'string' || !value.mood.trim()) throw new Error(`Soundscape track ${value.id} needs a mood.`);
  if (!Array.isArray(value.moods) || value.moods.some(item => typeof item !== 'string' || !item.trim())) {
    throw new Error(`Soundscape track ${value.id} moods must be readable strings.`);
  }
  if (!Array.isArray(value.tags) || value.tags.some(item => typeof item !== 'string' || !item.trim())) {
    throw new Error(`Soundscape track ${value.id} tags must be readable strings.`);
  }
  if (value.region !== undefined && !isSoundscapeRegion(value.region)) {
    throw new Error(`Soundscape track ${value.id} has an unsupported cultural region.`);
  }
  if (typeof value.url !== 'string' || !isPublicHttpsUrl(value.url)) {
    throw new Error(`Soundscape track ${value.id} needs a public HTTPS playback URL.`);
  }
  if (typeof value.isPremium !== 'boolean') throw new Error(`Soundscape track ${value.id} needs an isPremium flag.`);
  return {
    id: value.id.trim(),
    mood: value.mood.trim(),
    moods: [...new Set(value.moods.map(item => item.trim()))],
    tags: [...new Set(value.tags.map(item => item.trim()))],
    ...(value.region ? { region: value.region } : {}),
    url: value.url,
    isPremium: value.isPremium,
  };
}

export function validateSceneAudioCatalog(value: unknown): SceneAudioTrack[] {
  if (!Array.isArray(value)) throw new Error('Soundscape catalog must be an array.');
  const tracks = value.map(validateSceneAudioTrack);
  const ids = new Set<string>();
  const urls = new Set<string>();
  for (const track of tracks) {
    if (ids.has(track.id)) throw new Error(`Duplicate soundscape track id ${track.id}.`);
    if (urls.has(track.url)) throw new Error(`Duplicate soundscape playback URL ${track.url}.`);
    ids.add(track.id);
    urls.add(track.url);
  }
  return tracks;
}

const normalized = (value: string) => value.trim().toLocaleLowerCase();

/**
 * Resolve semantic soundscape intent against the catalog supplied by the host.
 * Exact mood matching gates candidates. Cultural region rejects explicit
 * mismatches and ranks an exact regional track ahead of neutral base tracks;
 * tag overlap and stable identity finish deterministic selection. The model
 * never sees or chooses any catalog value.
 */
export function resolveSoundscapeTrack(
  intent: SoundscapeIntent,
  catalog: readonly SceneAudioTrack[] = TRACK_LIBRARY,
): SceneAudioTrack | null {
  const mood = intent.mood ? normalized(intent.mood) : '';
  const region = intent.region ? normalized(intent.region) : '';
  const tags = new Set(intent.semanticTags.map(normalized).filter(Boolean));
  const candidates = catalog.filter(track => {
    const moods = new Set([track.mood, ...track.moods].map(normalized));
    const tagMatch = track.tags.some(tag => tags.has(normalized(tag)));
    const trackRegion = track.region ? normalized(track.region) : '';
    if (trackRegion && (!region || trackRegion !== region)) return false;
    return mood ? moods.has(mood) : tagMatch;
  });
  const score = (track: SceneAudioTrack) => {
    const trackTags = new Set(track.tags.map(normalized));
    let total = 0;
    if (region && track.region && normalized(track.region) === region) total += 1_000;
    for (const tag of tags) if (trackTags.has(tag)) total += 1;
    return total;
  };
  return [...candidates].sort((left, right) => (
    score(right) - score(left)
    || left.id.localeCompare(right.id)
    || left.url.localeCompare(right.url)
  ))[0] ?? null;
}

const CDN = 'https://celestialaudio.seihouse.org/AUDIO';

export const TRACK_LIBRARY: SceneAudioTrack[] = [
  { id: 'ADVENTURE_4_BANISHED', mood: 'adventure', moods: ['adventure', 'tribulation'], tags: ['banished', 'exile', 'journey', 'wilderness'], url: `${CDN}/ADVENTURE/ADVENTURE_4_BANISHED.wav`, isPremium: false },
  { id: 'ADVENTURE_LEVELING_UP', mood: 'adventure', moods: ['adventure', 'excitement'], tags: ['training', 'growth', 'breakthrough', 'level-up', 'cultivation'], url: `${CDN}/ADVENTURE/ADVENTURE_LEVELING_UP.mp3`, isPremium: false },
  { id: 'ADVENTURE_MARKET', mood: 'adventure', moods: ['adventure', 'excitement'], tags: ['market', 'city', 'town', 'crowd', 'festival', 'trade'], url: `${CDN}/ADVENTURE/ADVENTURE_MARKET.mp3`, isPremium: false },
  { id: 'ADVENTURE_TRAVLING', mood: 'travel', moods: ['travel', 'adventure'], tags: ['travel', 'road', 'journey', 'caravan'], url: `${CDN}/ADVENTURE/ADVENTURE_TRAVLING.wav`, isPremium: false },
  { id: 'MYSTICAL_ELF', mood: 'mystical', moods: ['mystical', 'adventure', 'mystery'], tags: ['forest', 'elf', 'magic', 'spirit', 'ancient'], url: `${CDN}/ADVENTURE/MYSTICAL_ELF.wav`, isPremium: false },
  { id: 'AMBEINT_NIGHT', mood: 'ambient', moods: ['ambient', 'serenity'], tags: ['night', 'rest', 'camp', 'stars', 'quiet'], url: `${CDN}/AMBIENT/AMBEINT_NIGHT.wav`, isPremium: false },
  { id: 'AMBEINT_TRUIMPH', mood: 'triumph', moods: ['triumph', 'ambient'], tags: ['victory', 'celebration', 'aftermath'], url: `${CDN}/AMBIENT/AMBEINT_TRUIMPH.wav`, isPremium: false },
  { id: 'AMBIENT_GOOD_DAY', mood: 'serenity', moods: ['serenity', 'ambient'], tags: ['morning', 'peaceful', 'day', 'village', 'home'], url: `${CDN}/AMBIENT/AMBIENT_GOOD_DAY.wav`, isPremium: false },
  { id: 'AMBIENT_HISTORY', mood: 'mystery', moods: ['mystery', 'ambient', 'mystical'], tags: ['lore', 'history', 'flashback', 'library', 'ruins'], url: `${CDN}/AMBIENT/AMBIENT_HISTORY.mp3`, isPremium: false },
  { id: 'AMBIENT_STARTER', mood: 'ambient', moods: ['ambient', 'serenity'], tags: ['default', 'opening', 'beginning'], url: `${CDN}/AMBIENT/AMBIENT_STARTER.mp3`, isPremium: false },
  { id: 'LIGHT_NOVEL_TENSION_1', mood: 'tension', moods: ['tension', 'dread', 'horror'], tags: ['suspense', 'stalking', 'threat'], url: `${CDN}/EMOTIONS/LIGHT_NOVEL_TENSION_1.mp3`, isPremium: false },
  { id: 'LIGHT_NOVEL_TENSION_2', mood: 'tension', moods: ['tension', 'dread', 'horror'], tags: ['suspense', 'confrontation', 'standoff'], url: `${CDN}/EMOTIONS/LIGHT_NOVEL_TENSION_2.mp3`, isPremium: false },
  { id: 'ROMANCE_LOVERS', mood: 'romance', moods: ['romance'], tags: ['love', 'confession', 'reunion'], url: `${CDN}/EMOTIONS/ROMANCE_LOVERS.wav`, isPremium: false },
  { id: 'SAD_LOST_OPPORUNIRTY', mood: 'sad', moods: ['sad'], tags: ['loss', 'regret', 'farewell', 'grief'], url: `${CDN}/EMOTIONS/SAD_LOST_OPPORUNIRTY.wav`, isPremium: false },
  { id: 'TIRED_DEFEATED', mood: 'tired', moods: ['tired', 'sad'], tags: ['defeat', 'exhaustion', 'low-point'], url: `${CDN}/EMOTIONS/TIRED_DEFEATED.mp3`, isPremium: false },
  { id: 'TRAGEDY_RECOVERY', mood: 'tragedy', moods: ['tragedy', 'sad'], tags: ['death', 'mourning', 'recovery', 'aftermath'], url: `${CDN}/EMOTIONS/TRAGEDY_RECOVERY.mp3`, isPremium: false },
  { id: 'FIGHTING_DANGER', mood: 'fighting', moods: ['fighting'], tags: ['ambush', 'danger', 'beast', 'survival'], url: `${CDN}/FIGHTING/FIGHTING_DANGER.wav`, isPremium: false },
  { id: 'FIGHTING_RIVAL_Apperance', mood: 'duel', moods: ['duel', 'fighting'], tags: ['rival', 'challenge', 'face-off'], url: `${CDN}/FIGHTING/FIGHTING_RIVAL_Apperance.mp3`, isPremium: false },
  { id: 'FIGHTING_TOURNAMENT_BEGIN', mood: 'fighting', moods: ['fighting', 'duel'], tags: ['tournament', 'arena', 'crowd'], url: `${CDN}/FIGHTING/FIGHTING_TOURNAMENT_BEGIN.mp3`, isPremium: false },
  { id: 'FIGHTING_TOURNAMENT_FINAL', mood: 'fighting', moods: ['fighting', 'duel'], tags: ['tournament', 'final', 'arena', 'climax'], url: `${CDN}/FIGHTING/FIGHTING_TOURNAMENT_FINAL.mp3`, isPremium: false },
  { id: 'LIGHT_NOVEL_BOSS_FIGHT_1_FINAL_BOSS', mood: 'boss-fight', moods: ['boss-fight'], tags: ['boss', 'final', 'climax', 'desperate'], url: `${CDN}/FIGHTING/LIGHT_NOVEL_BOSS_FIGHT_1_FINAL_BOSS.mp3`, isPremium: false },
  { id: 'WAR_1', mood: 'war', moods: ['war'], tags: ['battlefield', 'army', 'siege', 'march'], url: `${CDN}/WAR/WAR_1.mp3`, isPremium: false },
  { id: 'WAR_LOSES', mood: 'war', moods: ['war', 'tragedy'], tags: ['defeat', 'retreat', 'loses', 'aftermath'], url: `${CDN}/WAR/WAR_LOSES.wav`, isPremium: false },
];
