export type NarrativeCueEventType = 
  | 'narrative.scene.set'
  | 'narrative.ambience.crossfade'
  | 'narrative.fx.play'
  | 'narrative.metadata.signature'
  | 'narrative.chapter.enter'
  | 'narrative.paragraph.enter';

export interface NarrativeCuePayload {
  name?: string;
  intensity?: number;
  tension?: number;
  powerShift?: number;
  emotion?: string;
  relationshipShift?: number;
  danger?: number;
  mysticism?: number;
  element?: string;
  signature?: string;
  [key: string]: any;
}

export interface NarrativeCue {
  id: string;
  type: NarrativeCueEventType;
  once?: boolean;
  value?: string | NarrativeCuePayload;
  metadata?: NarrativeCuePayload;
}

export interface NarrationEventDetail {
  status: 'start' | 'block' | 'pause' | 'resume' | 'end';
  blockId?: string;
  blockIndex?: number;
  durationMs?: number;
  /** Normalized progress for the current paragraph/clip when available. */
  progress?: NarrationProgress;
}

export function dispatchNarration(detail: NarrationEventDetail) {
  // Narration lifecycle drives the effect governor's TTS/listen signal:
  // one-shot audio cues and camera shake only run in cinematic modes.
  if (detail.status === 'start' || detail.status === 'resume') {
    cinematicEffectGovernor.setSignal('narration', true);
  } else if (detail.status === 'pause' || detail.status === 'end') {
    cinematicEffectGovernor.setSignal('narration', false);
  }

  const event = new CustomEvent('seihouse-narration', { detail });
  window.dispatchEvent(event);
}

const triggeredOnce = new Set<string>();

export function dispatchNarrativeCue(cue: NarrativeCue) {
  if (cue.once) {
    if (triggeredOnce.has(cue.id)) {
      return;
    }
    triggeredOnce.add(cue.id);
  }

  const event = new CustomEvent('narrative-cue', { detail: cue });
  window.dispatchEvent(event);
}
import type { NarrationProgress } from './narration/progress';
import { cinematicEffectGovernor } from './effects/cinematicEffectGovernor';
