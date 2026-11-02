import type { SoundCueAttachment } from '../audio/inlineAudio';
import type { ReadAloudScript } from './readAloud';

/** Space nearby cue starts without a chapter budget or a filter on sound kinds. */
export const READ_ALOUD_CUE_COOLDOWN_MS = 500;

/**
 * Session-only cue history, driven by actual speech starts. A seek consumes
 * the cues before its destination without playing them. Pause/seek discard
 * pending sounds, so neither a resume nor a backwards jump replays them.
 */
export function createReadAloudCuePlayback(play: (cue: SoundCueAttachment) => void, stop: () => void) {
  const chapters = new Map<string, Set<string>>();
  let seen = new Set<string>();
  let pending: SoundCueAttachment[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastPlayed = -Infinity;
  let sounding = false;

  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    pending = [];
    if (sounding) {
      sounding = false;
      stop();
    }
  };
  const drain = () => {
    timer = undefined;
    if (!pending.length) return;
    const wait = READ_ALOUD_CUE_COOLDOWN_MS - (Date.now() - lastPlayed);
    if (wait > 0) { timer = setTimeout(drain, wait); return; }
    const cue = pending.shift()!;
    lastPlayed = Date.now();
    sounding = true;
    play(cue);
    if (pending.length) timer = setTimeout(drain, READ_ALOUD_CUE_COOLDOWN_MS);
  };
  const passBefore = (script: ReadAloudScript, index: number) => {
    for (const line of script.lines.slice(0, index)) for (const cue of line.soundCues ?? []) seen.add(cue.id);
  };
  return {
    chapter(key: string) {
      cancel();
      seen = chapters.get(key) ?? new Set<string>();
      chapters.set(key, seen);
    },
    seek(script: ReadAloudScript, index: number) {
      cancel();
      passBefore(script, index);
    },
    start(script: ReadAloudScript, index: number) {
      passBefore(script, index);
      for (const cue of script.lines[index]?.soundCues ?? []) {
        if (seen.has(cue.id)) continue;
        seen.add(cue.id);
        pending.push(cue);
      }
      if (timer === undefined) drain();
    },
    cancel,
  };
}
