import type { SpokenCueTarget } from '@seihouse/sen/highlight-engine';

/** What follows "add" in a spoken or typed Sound Cue request. */
export type ReaderSoundCommand = { ok: true; sound: string; target: SpokenCueTarget } | { ok: false; problem: string };

/** Words that only point at what Listen just read: "here", "right there", "now". */
const JUST_READ = /^(?:right\s+)?(?:here|there|now|this)$/;
/** Between the sound and its words: "on", "to", "at", "over". */
const JOIN = /\s+(?:on|onto|to|at|over)\s+/g;
/** Filler around the sound: "a", "the", "sound", "sound cue". */
const LEAD = /^(?:a|an|the|some)\s+/;
const TRAIL = /\s+(?:sound\s+cue|sound|cue|effect|noise)$/;

// Apostrophes join ("Wei's" → "weis", as the chapter's words are matched); other marks part words.
const clean = (text: string) => text.toLocaleLowerCase('en-US').replace(/['’]/g, '').replace(/[“”"‘.,!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * The story sound word a phrase names: the word itself ("wind"), or the
 * longest story sound word inside it ("howling wind" → "wind"). Never a
 * guess at a word the story does not have.
 */
function soundIn(phrase: string, soundWords: readonly string[]): string | undefined {
  const words = phrase.replace(LEAD, '').replace(TRAIL, '').trim();
  const padded = ` ${words} `;
  return [...soundWords].sort((left, right) => right.length - left.length)
    .find(sound => words === sound || padded.includes(` ${sound} `));
}

/**
 * Reads "wind on whistling drafts" or "blade clash right there" (what was
 * said after "add") against the story's sound words. Deterministic: the sound
 * must be one of the story's, and where it goes is either the words named or
 * the words Listen just read.
 */
export function parseReaderSoundCommand(input: string, soundWords: readonly string[]): ReaderSoundCommand {
  const text = clean(input);
  const where = 'Say where it goes: “Add wind on whistling drafts”, or “Add wind right there” while listening.';
  const list = soundWords.length ? ` This story's sounds are: ${soundWords.join(', ')}.` : ' This story has no sounds to add.';
  // "wind here", "wind right there"
  const justRead = text.match(/^(.*?)\s+((?:right\s+)?(?:here|there|now))$/);
  if (justRead) {
    const sound = soundIn(justRead[1], soundWords);
    return sound ? { ok: true, sound, target: { kind: 'just-read' } } : { ok: false, problem: `Which sound?${list}` };
  }
  // The first "on" (or "to", "at") with a story sound before it: the sound's words never contain one.
  for (const join of text.matchAll(JOIN)) {
    const sound = soundIn(text.slice(0, join.index), soundWords);
    if (!sound) continue;
    const words = text.slice(join.index + join[0].length).trim();
    return JUST_READ.test(words) ? { ok: true, sound, target: { kind: 'just-read' } } : { ok: true, sound, target: { kind: 'words', words } };
  }
  return soundIn(text, soundWords) ? { ok: false, problem: where } : { ok: false, problem: `Which sound?${list}` };
}
