import type { SceneAudioTrack } from '@seihouse/sen/audio';
import soundscapes from './data/sen-soundscapes-v1.json';

/**
 * SEN Soundscapes, Volume 1: the 43 pieces of music under the story, and the
 * soundscapes every new chapter is written with. The records come from the
 * `sen-soundscapes-volume-1` SPP (1.0.1); the loudness beside each was
 * measured from the exact file (its SHA-256 matched the pack), so the reader
 * mixer plays every piece at one reference level. The pack's titles, moods and
 * tags are AI proposals the owner can edit; two pieces that share a title are
 * numbered. Each piece is composed, with its own opening and ending, so pieces
 * follow one another rather than loop.
 */
export const SEN_SOUNDSCAPES: readonly SceneAudioTrack[] = Object.freeze(soundscapes.entries.map(entry => ({
  id: entry.id,
  label: entry.label,
  group: entry.group,
  mood: entry.mood,
  moods: [...entry.moods],
  tags: [...entry.tags],
  url: entry.url,
  loudness: { kind: 'integrated' as const, lufs: entry.loudness.lufs, peakDb: entry.loudness.peakDb },
})));

/** Where the pack's records came from, for the media each chapter is written with. */
export const SEN_SOUNDSCAPES_PROVENANCE = Object.freeze({ catalogId: soundscapes.pack.id, version: soundscapes.pack.version });

const CDN = 'https://celestialaudio.seihouse.org/AUDIO';

/**
 * The older Reader Chamber's soundscape list, kept for its remake. New
 * chapters and the NovelExpanded app use SEN Soundscapes, Volume 1 (above).
 */
export const TRACK_LIBRARY: SceneAudioTrack[] = [
  { id: 'ADVENTURE_4_BANISHED', mood: 'adventure', moods: ['adventure', 'tribulation'], tags: ['banished', 'exile', 'journey', 'wilderness'], url: `${CDN}/ADVENTURE/ADVENTURE_4_BANISHED.wav` },
  { id: 'ADVENTURE_LEVELING_UP', mood: 'adventure', moods: ['adventure', 'excitement'], tags: ['training', 'growth', 'breakthrough', 'level-up', 'cultivation'], url: `${CDN}/ADVENTURE/ADVENTURE_LEVELING_UP.mp3` },
  { id: 'ADVENTURE_MARKET', mood: 'adventure', moods: ['adventure', 'excitement'], tags: ['market', 'city', 'town', 'crowd', 'festival', 'trade'], url: `${CDN}/ADVENTURE/ADVENTURE_MARKET.mp3` },
  { id: 'ADVENTURE_TRAVLING', mood: 'travel', moods: ['travel', 'adventure'], tags: ['travel', 'road', 'journey', 'caravan'], url: `${CDN}/ADVENTURE/ADVENTURE_TRAVLING.wav` },
  { id: 'MYSTICAL_ELF', mood: 'mystical', moods: ['mystical', 'adventure', 'mystery'], tags: ['forest', 'elf', 'magic', 'spirit', 'ancient'], url: `${CDN}/ADVENTURE/MYSTICAL_ELF.wav` },
  { id: 'AMBEINT_NIGHT', mood: 'ambient', moods: ['ambient', 'serenity'], tags: ['night', 'rest', 'camp', 'stars', 'quiet'], url: `${CDN}/AMBIENT/AMBEINT_NIGHT.wav` },
  { id: 'AMBEINT_TRUIMPH', mood: 'triumph', moods: ['triumph', 'ambient'], tags: ['victory', 'celebration', 'aftermath'], url: `${CDN}/AMBIENT/AMBEINT_TRUIMPH.wav` },
  { id: 'AMBIENT_GOOD_DAY', mood: 'serenity', moods: ['serenity', 'ambient'], tags: ['morning', 'peaceful', 'day', 'village', 'home'], url: `${CDN}/AMBIENT/AMBIENT_GOOD_DAY.wav` },
  { id: 'AMBIENT_HISTORY', mood: 'mystery', moods: ['mystery', 'ambient', 'mystical'], tags: ['lore', 'history', 'flashback', 'library', 'ruins'], url: `${CDN}/AMBIENT/AMBIENT_HISTORY.mp3` },
  { id: 'AMBIENT_STARTER', mood: 'ambient', moods: ['ambient', 'serenity'], tags: ['default', 'opening', 'beginning'], url: `${CDN}/AMBIENT/AMBIENT_STARTER.mp3` },
  { id: 'LIGHT_NOVEL_TENSION_1', mood: 'tension', moods: ['tension', 'dread', 'horror'], tags: ['suspense', 'stalking', 'threat'], url: `${CDN}/EMOTIONS/LIGHT_NOVEL_TENSION_1.mp3` },
  { id: 'LIGHT_NOVEL_TENSION_2', mood: 'tension', moods: ['tension', 'dread', 'horror'], tags: ['suspense', 'confrontation', 'standoff'], url: `${CDN}/EMOTIONS/LIGHT_NOVEL_TENSION_2.mp3` },
  { id: 'ROMANCE_LOVERS', mood: 'romance', moods: ['romance'], tags: ['love', 'confession', 'reunion'], url: `${CDN}/EMOTIONS/ROMANCE_LOVERS.wav` },
  { id: 'SAD_LOST_OPPORUNIRTY', mood: 'sad', moods: ['sad'], tags: ['loss', 'regret', 'farewell', 'grief'], url: `${CDN}/EMOTIONS/SAD_LOST_OPPORUNIRTY.wav` },
  { id: 'TIRED_DEFEATED', mood: 'tired', moods: ['tired', 'sad'], tags: ['defeat', 'exhaustion', 'low-point'], url: `${CDN}/EMOTIONS/TIRED_DEFEATED.mp3` },
  { id: 'TRAGEDY_RECOVERY', mood: 'tragedy', moods: ['tragedy', 'sad'], tags: ['death', 'mourning', 'recovery', 'aftermath'], url: `${CDN}/EMOTIONS/TRAGEDY_RECOVERY.mp3` },
  { id: 'FIGHTING_DANGER', mood: 'fighting', moods: ['fighting'], tags: ['ambush', 'danger', 'beast', 'survival'], url: `${CDN}/FIGHTING/FIGHTING_DANGER.wav` },
  { id: 'FIGHTING_RIVAL_Apperance', mood: 'duel', moods: ['duel', 'fighting'], tags: ['rival', 'challenge', 'face-off'], url: `${CDN}/FIGHTING/FIGHTING_RIVAL_Apperance.mp3` },
  { id: 'FIGHTING_TOURNAMENT_BEGIN', mood: 'fighting', moods: ['fighting', 'duel'], tags: ['tournament', 'arena', 'crowd'], url: `${CDN}/FIGHTING/FIGHTING_TOURNAMENT_BEGIN.mp3` },
  { id: 'FIGHTING_TOURNAMENT_FINAL', mood: 'fighting', moods: ['fighting', 'duel'], tags: ['tournament', 'final', 'arena', 'climax'], url: `${CDN}/FIGHTING/FIGHTING_TOURNAMENT_FINAL.mp3` },
  { id: 'LIGHT_NOVEL_BOSS_FIGHT_1_FINAL_BOSS', mood: 'boss-fight', moods: ['boss-fight'], tags: ['boss', 'final', 'climax', 'desperate'], url: `${CDN}/FIGHTING/LIGHT_NOVEL_BOSS_FIGHT_1_FINAL_BOSS.mp3` },
  { id: 'WAR_1', mood: 'war', moods: ['war'], tags: ['battlefield', 'army', 'siege', 'march'], url: `${CDN}/WAR/WAR_1.mp3` },
  { id: 'WAR_LOSES', mood: 'war', moods: ['war', 'tragedy'], tags: ['defeat', 'retreat', 'loses', 'aftermath'], url: `${CDN}/WAR/WAR_LOSES.wav` },
];
