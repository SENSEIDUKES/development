import { StoryBlockMetadata } from '../../types';

export interface SceneAudioTrack {
  id: string;          // e.g., 'FIGHTING_TOURNAMENT_FINAL', 'BOSS_FIGHT_1_FINAL_BOSS'
  mood: string;        // Primary mood ('fighting', 'boss-fight', 'adventure', etc.)
  moods: string[];     // All moods this track can serve
  tags: string[];      // Context matching tags (e.g., 'tournament', 'night')
  url: string;         // Celestial Library CDN link
  isPremium: boolean;  // Mark user-generated or premium track explicitly
}

// 1. Priority Map
// When multiple narrative blocks occur in the same chapter or scene window,
// the Highest Priority mood takes over the soundscape.
export const MOOD_PRIORITIES: Record<string, number> = {
  'boss-fight': 100,
  'tragedy': 95,
  'fighting': 90,
  'duel': 88,
  'war': 85,
  'triumph': 80,
  'horror': 75,
  'dread': 72,
  'tension': 70,
  'excitement': 65,
  'tribulation': 60,
  'adventure': 50,
  'mystery': 40,
  'travel': 30,
  'romance': 25,
  'sad': 20,
  'mystical': 15,
  'serenity': 10,
  'ambient': 5,
  'tired': 1,
};

// 2. Mood Families & Escalation Gates
// The reader spends most of a story in adventure/ambient territory, so those
// two families are the ungated default bed. Emotional, fighting and war
// tracks only fire when the narrative signals clear a strict threshold —
// otherwise the request is downgraded to its family's calm fallback.
export type MoodFamily = 'ambient' | 'adventure' | 'emotional' | 'fighting' | 'war';

export const MOOD_FAMILIES: Record<string, MoodFamily> = {
  'ambient': 'ambient',
  'serenity': 'ambient',
  'mystery': 'ambient',
  'adventure': 'adventure',
  'travel': 'adventure',
  'mystical': 'adventure',
  'triumph': 'adventure',
  'excitement': 'adventure',
  'tribulation': 'adventure',
  'tension': 'emotional',
  'dread': 'emotional',
  'horror': 'emotional',
  'romance': 'emotional',
  'sad': 'emotional',
  'tired': 'emotional',
  'tragedy': 'emotional',
  'fighting': 'fighting',
  'duel': 'fighting',
  'boss-fight': 'fighting',
  'war': 'war',
};

export interface SceneSignals {
  danger?: number;
  tension?: number;
  intensity?: number;
}

// When a gated mood fails its escalation check, resolve to this calm mood
// instead of going silent — the bed keeps playing.
const FAMILY_FALLBACK: Record<MoodFamily, string> = {
  'ambient': 'ambient',
  'adventure': 'adventure',
  'emotional': 'ambient',
  'fighting': 'adventure',
  'war': 'adventure',
};

// 3. The Celestial Library
const CDN = 'https://celestialaudio.seihouse.org/AUDIO';

export const TRACK_LIBRARY: SceneAudioTrack[] = [
  // --- Adventure (default bed) ---
  { id: 'ADVENTURE_4_BANISHED', mood: 'adventure', moods: ['adventure', 'tribulation'], tags: ['banished', 'exile', 'journey', 'wilderness'], url: `${CDN}/ADVENTURE/ADVENTURE_4_BANISHED.wav`, isPremium: false },
  { id: 'ADVENTURE_LEVELING_UP', mood: 'adventure', moods: ['adventure', 'excitement'], tags: ['training', 'growth', 'breakthrough', 'level-up', 'cultivation'], url: `${CDN}/ADVENTURE/ADVENTURE_LEVELING_UP.mp3`, isPremium: false },
  { id: 'ADVENTURE_MARKET', mood: 'adventure', moods: ['adventure', 'excitement'], tags: ['market', 'city', 'town', 'crowd', 'festival', 'trade'], url: `${CDN}/ADVENTURE/ADVENTURE_MARKET.mp3`, isPremium: false },
  { id: 'ADVENTURE_TRAVLING', mood: 'travel', moods: ['travel', 'adventure'], tags: ['travel', 'road', 'journey', 'caravan'], url: `${CDN}/ADVENTURE/ADVENTURE_TRAVLING.wav`, isPremium: false },
  { id: 'MYSTICAL_ELF', mood: 'mystical', moods: ['mystical', 'adventure', 'mystery'], tags: ['forest', 'elf', 'magic', 'spirit', 'ancient'], url: `${CDN}/ADVENTURE/MYSTICAL_ELF.wav`, isPremium: false },

  // --- Ambient (default bed) ---
  { id: 'AMBEINT_NIGHT', mood: 'ambient', moods: ['ambient', 'serenity'], tags: ['night', 'rest', 'camp', 'stars', 'quiet'], url: `${CDN}/AMBIENT/AMBEINT_NIGHT.wav`, isPremium: false },
  { id: 'AMBEINT_TRUIMPH', mood: 'triumph', moods: ['triumph', 'ambient'], tags: ['victory', 'celebration', 'aftermath'], url: `${CDN}/AMBIENT/AMBEINT_TRUIMPH.wav`, isPremium: false },
  { id: 'AMBIENT_GOOD_DAY', mood: 'serenity', moods: ['serenity', 'ambient'], tags: ['morning', 'peaceful', 'day', 'village', 'home'], url: `${CDN}/AMBIENT/AMBIENT_GOOD_DAY.wav`, isPremium: false },
  { id: 'AMBIENT_HISTORY', mood: 'mystery', moods: ['mystery', 'ambient', 'mystical'], tags: ['lore', 'history', 'flashback', 'library', 'ruins'], url: `${CDN}/AMBIENT/AMBIENT_HISTORY.mp3`, isPremium: false },
  { id: 'AMBIENT_STARTER', mood: 'ambient', moods: ['ambient', 'serenity'], tags: ['default', 'opening', 'beginning'], url: `${CDN}/AMBIENT/AMBIENT_STARTER.mp3`, isPremium: false },

  // --- Emotions (gated) ---
  { id: 'LIGHT_NOVEL_TENSION_1', mood: 'tension', moods: ['tension', 'dread', 'horror'], tags: ['suspense', 'stalking', 'threat'], url: `${CDN}/EMOTIONS/LIGHT_NOVEL_TENSION_1.mp3`, isPremium: false },
  { id: 'LIGHT_NOVEL_TENSION_2', mood: 'tension', moods: ['tension', 'dread', 'horror'], tags: ['suspense', 'confrontation', 'standoff'], url: `${CDN}/EMOTIONS/LIGHT_NOVEL_TENSION_2.mp3`, isPremium: false },
  { id: 'ROMANCE_LOVERS', mood: 'romance', moods: ['romance'], tags: ['love', 'confession', 'reunion'], url: `${CDN}/EMOTIONS/ROMANCE_LOVERS.wav`, isPremium: false },
  { id: 'SAD_LOST_OPPORUNIRTY', mood: 'sad', moods: ['sad'], tags: ['loss', 'regret', 'farewell', 'grief'], url: `${CDN}/EMOTIONS/SAD_LOST_OPPORUNIRTY.wav`, isPremium: false },
  { id: 'TIRED_DEFEATED', mood: 'tired', moods: ['tired', 'sad'], tags: ['defeat', 'exhaustion', 'low-point'], url: `${CDN}/EMOTIONS/TIRED_DEFEATED.mp3`, isPremium: false },
  { id: 'TRAGEDY_RECOVERY', mood: 'tragedy', moods: ['tragedy', 'sad'], tags: ['death', 'mourning', 'recovery', 'aftermath'], url: `${CDN}/EMOTIONS/TRAGEDY_RECOVERY.mp3`, isPremium: false },

  // --- Fighting (gated) ---
  { id: 'FIGHTING_DANGER', mood: 'fighting', moods: ['fighting'], tags: ['ambush', 'danger', 'beast', 'survival'], url: `${CDN}/FIGHTING/FIGHTING_DANGER.wav`, isPremium: false },
  { id: 'FIGHTING_RIVAL_Apperance', mood: 'duel', moods: ['duel', 'fighting'], tags: ['rival', 'challenge', 'face-off'], url: `${CDN}/FIGHTING/FIGHTING_RIVAL_Apperance.mp3`, isPremium: false },
  { id: 'FIGHTING_TOURNAMENT_BEGIN', mood: 'fighting', moods: ['fighting', 'duel'], tags: ['tournament', 'arena', 'crowd'], url: `${CDN}/FIGHTING/FIGHTING_TOURNAMENT_BEGIN.mp3`, isPremium: false },
  { id: 'FIGHTING_TOURNAMENT_FINAL', mood: 'fighting', moods: ['fighting', 'duel'], tags: ['tournament', 'final', 'arena', 'climax'], url: `${CDN}/FIGHTING/FIGHTING_TOURNAMENT_FINAL.mp3`, isPremium: false },
  { id: 'LIGHT_NOVEL_BOSS_FIGHT_1_FINAL_BOSS', mood: 'boss-fight', moods: ['boss-fight'], tags: ['boss', 'final', 'climax', 'desperate'], url: `${CDN}/FIGHTING/LIGHT_NOVEL_BOSS_FIGHT_1_FINAL_BOSS.mp3`, isPremium: false },

  // --- War (gated, strictest) ---
  { id: 'WAR_1', mood: 'war', moods: ['war'], tags: ['battlefield', 'army', 'siege', 'march'], url: `${CDN}/WAR/WAR_1.mp3`, isPremium: false },
  { id: 'WAR_LOSES', mood: 'war', moods: ['war', 'tragedy'], tags: ['defeat', 'retreat', 'loses', 'aftermath'], url: `${CDN}/WAR/WAR_LOSES.wav`, isPremium: false },
];

// 4. Escalation Gate
// A gated mood only survives when the scene's narrative signals (or the
// music cue's own intensity) clear its family threshold. Chapter-level
// signals raise the baseline so a war chapter can score war music even on
// blocks that don't restate the danger value.
export function isEscalationAllowed(
  family: MoodFamily,
  signals: SceneSignals,
  musicIntensity?: number
): boolean {
  const danger = signals.danger ?? 0;
  const tension = signals.tension ?? 0;
  const intensity = Math.max(signals.intensity ?? 0, musicIntensity ?? 0);

  switch (family) {
    case 'war':
      // War is the rarest bucket: needs sustained, near-max stakes.
      return danger >= 0.8 && (intensity >= 0.7 || tension >= 0.7);
    case 'fighting':
      return danger >= 0.7 || intensity >= 0.8;
    case 'emotional':
      return intensity >= 0.7 || tension >= 0.75;
    default:
      return true; // adventure / ambient always allowed
  }
}

// 5. Audio Resolution Controller
export class SceneScoreEngine {
  private currentTrackId: string | null = null;
  private currentPriority: number = -1;
  private chapterSignals: SceneSignals = {};

  // Called on chapter enter so blocks inherit the chapter's stakes as a
  // baseline (block signals only ever raise it, never lower it).
  public setChapterContext(signals: SceneSignals) {
    this.chapterSignals = {
      danger: signals.danger ?? 0,
      tension: signals.tension ?? 0,
      intensity: signals.intensity ?? 0,
    };
  }

  public evaluateSceneContext(
    musicMeta: StoryBlockMetadata['music'],
    sceneTags: string[] = [],
    blockSignals: SceneSignals = {}
  ): SceneAudioTrack | null {
    if (!musicMeta) return null;

    // RULE 1: SPECIFIC TRACK OVERRIDE
    // If LLM or user manually requests a specific custom premium track ID,
    // immediately respect it — no gating, the request is explicit.
    if (musicMeta.trackId) {
      const explicitTrack = TRACK_LIBRARY.find(t => t.id === musicMeta.trackId);
      if (explicitTrack) {
        const priority = MOOD_PRIORITIES[explicitTrack.mood] || 0;
        this.updateState(explicitTrack.id, priority);
        return explicitTrack;
      }
    }

    // RULE 2: ESCALATION GATE
    // Intense moods must earn their slot; otherwise downgrade to the calm
    // fallback so adventure/ambient beds carry most of the chapter.
    const signals = this.mergeSignals(blockSignals);
    const family = MOOD_FAMILIES[musicMeta.mood] ?? 'ambient';
    const requestedMood = isEscalationAllowed(family, signals, musicMeta.intensity)
      ? musicMeta.mood
      : FAMILY_FALLBACK[family];

    const moodPriority = MOOD_PRIORITIES[requestedMood] || 0;

    // RULE 3: STRICT OVERRIDE PRIORITY
    // Only switch tracks if the new narrative cue has a higher or equal
    // priority to the currently playing track. (e.g., Boss Fight overrides
    // Adventure.) A downgraded cue can't dethrone an escalated score.
    if (moodPriority < this.currentPriority) {
      return null;
    }

    // RULE 4: CONTEXT MATCHING
    // Find tracks serving this mood. If multiple match, score them against
    // scene environment tags.
    let candidates = TRACK_LIBRARY.filter(t => t.moods.includes(requestedMood));
    if (candidates.length === 0) {
      candidates = TRACK_LIBRARY.filter(t => t.moods.includes(FAMILY_FALLBACK[family]));
    }
    if (candidates.length === 0) return null;

    let bestMatch = candidates[0];
    let highestScore = -1;

    for (const track of candidates) {
      let score = 0;
      // Boost score based on overlapping tags (e.g. ['night', 'camp']
      // intersecting with scene tags)
      for (const tag of track.tags) {
        if (sceneTags.includes(tag)) score += 2;
      }
      // Exact primary-mood match beats a track merely covering the mood.
      if (track.mood === requestedMood) score += 1;
      // With no scene-tag overlap, prefer the neutral 'default' track over
      // a situational sibling (e.g. AMBIENT_STARTER over AMBEINT_NIGHT).
      if (track.tags.includes('default')) score += 0.5;
      // Keep the current track when nothing scores higher — avoids
      // crossfade churn between same-mood siblings.
      if (track.id === this.currentTrackId) score += 1;

      if (score > highestScore) {
        highestScore = score;
        bestMatch = track;
      }
    }

    this.updateState(bestMatch.id, moodPriority);
    return bestMatch;
  }

  // Pick the default bed for a fresh chapter so music starts immediately
  // instead of waiting for the first music-tagged block. Always calm —
  // escalation only happens through evaluateSceneContext.
  public resolveChapterDefault(sceneTags: string[] = []): SceneAudioTrack | null {
    const calm = TRACK_LIBRARY.filter(t => {
      const family = MOOD_FAMILIES[t.mood] ?? 'ambient';
      return family === 'ambient' || family === 'adventure';
    });
    if (calm.length === 0) return null;

    let bestMatch = calm.find(t => t.tags.includes('default')) ?? calm[0];
    let highestScore = 0;
    for (const track of calm) {
      let score = 0;
      for (const tag of track.tags) {
        if (sceneTags.includes(tag)) score += 2;
      }
      if (score > highestScore) {
        highestScore = score;
        bestMatch = track;
      }
    }

    // The bed claims zero priority so any explicit music cue — even a soft
    // one like 'serenity' — can replace it.
    this.updateState(bestMatch.id, 0);
    return bestMatch;
  }

  // Gracefully drop priority (e.g., moving to the next chapter) so lower
  // priority songs can play again
  public resetScene() {
    this.currentTrackId = null;
    this.currentPriority = -1;
    this.chapterSignals = {};
  }

  private mergeSignals(block: SceneSignals): SceneSignals {
    return {
      danger: Math.max(block.danger ?? 0, this.chapterSignals.danger ?? 0),
      tension: Math.max(block.tension ?? 0, this.chapterSignals.tension ?? 0),
      intensity: Math.max(block.intensity ?? 0, this.chapterSignals.intensity ?? 0),
    };
  }

  private updateState(trackId: string, priority: number) {
    this.currentTrackId = trackId;
    this.currentPriority = priority;
  }
}
