import { StoryBlock } from '../../types';
import { isDevBuild } from '../env';

/**
 * Policy for AUTOMATIC one-shot narrative audio (narrative.fx.play).
 *
 * Random footsteps, territory Foley and other frequent procedural effects
 * break immersion when they fire at the wrong moment, so the automatic path
 * is restricted to a small set of high-confidence, narratively important
 * events. Anything that doesn't clearly match is suppressed — never guessed.
 * Intentional entity sounds live on the World Card instead (see
 * cardSoundCatalog), which is a separate system with no shared budget or
 * dedupe state.
 *
 * The cinematicEffectGovernor's rules still apply downstream of this policy:
 * cinematic modes only (TTS/listen or cinematic scroll — never default
 * manual reading), max three cues per chapter, one per chapter zone,
 * cooldown and dedupe.
 */

export const HIGH_CONFIDENCE_AUTO_CUES = [
  /** A major System notification. */
  'system_alert',
  /** A genuine cultivation/realm breakthrough. */
  'breakthrough',
  /** A powerful artifact activating. */
  'artifact_activation',
  /** A major beast reveal. */
  'beast_reveal',
  /** A major Fate/death event. */
  'fate_shift',
  /** A clearly defined high-impact attack. */
  'major_impact',
] as const;

export type HighConfidenceAutoCue = (typeof HIGH_CONFIDENCE_AUTO_CUES)[number];

export function isHighConfidenceAutoCue(value: string): value is HighConfidenceAutoCue {
  return (HIGH_CONFIDENCE_AUTO_CUES as readonly string[]).includes(value);
}

// Movement / environment / territory vocabulary is never automatic audio,
// no matter what else the tag says.
const SUPPRESSED_PATTERN =
  /footstep|walking|steps?\b|stride|march|crunch|territory|ambien|environment|wind|rain|water|ocean|river|door|creak|rustle|bird|crowd|murmur|fire ?crackle/i;

// High-precision matching only: each pattern names the event, not a mood.
const CUE_PATTERNS: Array<[HighConfidenceAutoCue, RegExp]> = [
  ['system_alert', /^system_alert$|\bsystem\b.*\b(alert|notification|warning|announcement)\b/i],
  ['breakthrough', /^breakthrough$|\b(realm|cultivation|core|dao)\b.*\bbreakthrough\b|\bbreakthrough\b.*\b(realm|cultivation|core|dao)\b|\bascension\b/i],
  ['artifact_activation', /^artifact_activation$|\b(artifact|relic|talisman|treasure)\b.*\b(activat\w*|awaken\w*)\b/i],
  ['beast_reveal', /^beast_reveal$|\b(beast|dragon|monster)\b.*\b(reveal\w*|descend\w*|emerg\w*|appear\w*)\b/i],
  ['fate_shift', /^fate_shift$|\b(fate|doom|karma)\b.*\b(shift\w*|seal\w*|manifest\w*)\b|\bdeath knell\b/i],
  ['major_impact', /^major_impact$|\b(devastating|cataclysmic|earth-?shattering|world-?shaking)\b.*\b(blow|strike|impact|attack)\b/i],
];

const warnedSuppressions = new Set<string>();

/**
 * Map a raw cue value (an [SFX: ...] tag or an already-canonical id) to a
 * high-confidence automatic cue, or null when it must be suppressed.
 */
export function normalizeAutoCue(raw: string): HighConfidenceAutoCue | null {
  const value = (raw || '').trim().toLowerCase();
  if (!value) return null;
  if (isHighConfidenceAutoCue(value)) return value;
  if (!SUPPRESSED_PATTERN.test(value)) {
    for (const [cue, pattern] of CUE_PATTERNS) {
      if (pattern.test(value)) return cue;
    }
  }
  // Curation aid, dev builds only: one line per distinct suppressed tag.
  if (!warnedSuppressions.has(value) && isDevBuild()) {
    warnedSuppressions.add(value);
    console.info(`[auto-cue] suppressed low-confidence sfx tag: "${value}"`);
  }
  return null;
}

/** Beast reveals only qualify when the beast is a genuine headline threat. */
const MAJOR_THREAT_TIERS = ['boss', 'calamity', 'mythic'];

/**
 * Derive an automatic cue from a block's STRUCTURED narrative data — the
 * only justification besides an explicitly high-confidence [SFX] tag.
 * Broad metadata (environment, motion, location) never produces a cue.
 */
export function deriveStructuredAutoCue(
  block: Pick<StoryBlock, 'system' | 'metadata'>,
): HighConfidenceAutoCue | null {
  const promptType = block.system?.promptType;
  if (promptType === 'breakthrough') return 'breakthrough';
  if (promptType === 'death_event' || promptType === 'fate_event') return 'fate_shift';
  if (promptType === 'critical_danger') return 'major_impact';

  const beastEvent = block.metadata?.beastEvent;
  if (
    beastEvent?.type === 'reveal' &&
    beastEvent.profile &&
    MAJOR_THREAT_TIERS.includes(beastEvent.profile.threatTier)
  ) {
    return 'beast_reveal';
  }
  return null;
}

/**
 * The complete set of automatic cues a block may request: its high-confidence
 * [SFX] tags plus at most one structured-data cue, deduplicated. The governor
 * still decides whether any of them actually play.
 */
export function collectBlockAutoCues(
  sfxList: string[],
  block?: Pick<StoryBlock, 'system' | 'metadata'>,
): HighConfidenceAutoCue[] {
  const cues = sfxList
    .map(normalizeAutoCue)
    .filter((cue): cue is HighConfidenceAutoCue => cue !== null);
  if (block) {
    const structured = deriveStructuredAutoCue(block);
    if (structured) cues.push(structured);
  }
  return [...new Set(cues)];
}
