/**
 * Mode-aware cinematic effect governor.
 *
 * One-shot audio cues (narrative.fx.play) and the climax camera shake are
 * cinematic punctuation: they only make sense while the app — not the reader —
 * is pacing the experience. This module is the single arbiter for those two
 * effect families:
 *
 * - ACTIVATION: effects run only while a cinematic mode is active — TTS /
 *   listening narration (`narration` signal) or automated cinematic scroll
 *   (`cinematic-scroll` signal). A future cinematic-scroll mode WITHOUT TTS
 *   just raises the same `cinematic-scroll` signal; nothing else is required.
 *   In the default manual reader (no narration, no automated scroll) every
 *   request is denied.
 * - BUDGET: at most MAX_AUDIO_CUES_PER_CHAPTER one-shot audio cues per
 *   chapter, at most one per early/middle/late chapter zone, separated by
 *   AUDIO_CUE_COOLDOWN_MS, deduplicated by cue id. At most
 *   MAX_CAMERA_SHAKES_PER_CHAPTER camera shakes per chapter.
 *
 * These budgets are CEILINGS, not quotas. The governor is purely reactive: it
 * only ever responds to a request the reader logic already decided to make
 * (an SFX cue present in a block, an intensity threshold crossed). It never
 * manufactures an effect, so a chapter with no qualifying moment plays no
 * cues and no shake. A camera shake in particular should stay rare — the
 * limit of one caps the intense moments that do occur, it does not require
 * one to occur.
 *
 * Deliberately OUT of scope (they have their own toggles and pacing):
 * atmosphere beds, the scene-score music engine (narrative.metadata.signature
 * consumers), the rare death/critical-health chamber dimming, and World Card
 * sound-button playback (a user-initiated tap — see lib/audio/cardSoundCatalog
 * — which never consumes this budget or its dedupe state).
 */

export type CinematicSignalSource = 'narration' | 'cinematic-scroll';

export type ChapterZone = 'early' | 'middle' | 'late';

export const MAX_AUDIO_CUES_PER_CHAPTER = 3;
export const AUDIO_CUE_COOLDOWN_MS = 20_000;
export const MAX_CAMERA_SHAKES_PER_CHAPTER = 1;

export interface AudioCueRequest {
  /** Stable cue id (also used by the narrative-cue once-dedupe). */
  id: string;
  chapterNumber: number;
  /** Block/paragraph position of the cue inside the chapter, when known. */
  blockIndex?: number;
  /** Total blocks/paragraphs in the chapter, when known. */
  totalBlocks?: number;
}

/** Maps a block position to its early/middle/late chapter zone. */
export function resolveChapterZone(
  blockIndex?: number,
  totalBlocks?: number,
): ChapterZone | undefined {
  if (
    blockIndex == null ||
    totalBlocks == null ||
    !Number.isFinite(blockIndex) ||
    !Number.isFinite(totalBlocks) ||
    totalBlocks <= 0 ||
    blockIndex < 0
  ) {
    return undefined;
  }
  const ratio = Math.min(blockIndex / totalBlocks, 0.999);
  if (ratio < 1 / 3) return 'early';
  if (ratio < 2 / 3) return 'middle';
  return 'late';
}

export class CinematicEffectGovernor {
  private signals: Record<CinematicSignalSource, boolean> = {
    narration: false,
    'cinematic-scroll': false,
  };

  private chapterNumber: number | null = null;
  private grantedCueIds = new Set<string>();
  private cuesGranted = 0;
  private zonesUsed = new Set<ChapterZone>();
  private lastCueAt: number | null = null;
  private shakesGranted = 0;

  constructor(private readonly now: () => number = () => Date.now()) {}

  /**
   * Raise or clear a cinematic activation signal. Narration playback and the
   * cinematic scroll controller each own one signal; the governor is active
   * while ANY signal is up.
   */
  setSignal(source: CinematicSignalSource, active: boolean) {
    this.signals[source] = active;
  }

  /** True while at least one cinematic mode (TTS/listen or auto-scroll) is active. */
  isActive(): boolean {
    return this.signals.narration || this.signals['cinematic-scroll'];
  }

  /** Clears all per-chapter budgets and re-anchors to the given chapter. */
  resetChapter(chapterNumber: number | null) {
    this.chapterNumber = chapterNumber;
    this.resetBudget();
  }

  /**
   * Clears the current chapter's budgets without re-anchoring. Budgets are
   * deliberately per CHAPTER, not per narration session — restarting playback
   * on the same chapter does not re-grant cues or the camera shake.
   */
  resetBudget() {
    this.grantedCueIds.clear();
    this.cuesGranted = 0;
    this.zonesUsed.clear();
    this.lastCueAt = null;
    this.shakesGranted = 0;
  }

  private ensureChapter(chapterNumber: number) {
    if (this.chapterNumber !== chapterNumber) {
      this.resetChapter(chapterNumber);
    }
  }

  /**
   * Ask permission to play a one-shot audio cue. Granting consumes budget, so
   * call this only immediately before dispatching the cue.
   */
  requestAudioCue(request: AudioCueRequest): boolean {
    if (!this.isActive()) return false;
    this.ensureChapter(request.chapterNumber);

    if (this.grantedCueIds.has(request.id)) return false;
    if (this.cuesGranted >= MAX_AUDIO_CUES_PER_CHAPTER) return false;

    const zone = resolveChapterZone(request.blockIndex, request.totalBlocks);
    if (zone && this.zonesUsed.has(zone)) return false;

    if (
      this.lastCueAt != null &&
      this.now() - this.lastCueAt < AUDIO_CUE_COOLDOWN_MS
    ) {
      return false;
    }

    this.grantedCueIds.add(request.id);
    this.cuesGranted += 1;
    if (zone) this.zonesUsed.add(zone);
    this.lastCueAt = this.now();
    return true;
  }

  /**
   * Ask permission for the climax camera shake. At most
   * MAX_CAMERA_SHAKES_PER_CHAPTER grants per chapter, cinematic modes only.
   */
  requestCameraShake(chapterNumber: number): boolean {
    if (!this.isActive()) return false;
    this.ensureChapter(chapterNumber);
    if (this.shakesGranted >= MAX_CAMERA_SHAKES_PER_CHAPTER) return false;
    this.shakesGranted += 1;
    return true;
  }
}

/** App-wide singleton used by playback, scroll, viewport, and chamber. */
export const cinematicEffectGovernor = new CinematicEffectGovernor();
