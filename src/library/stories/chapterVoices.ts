import { chapterReadAloudScript, type HarnessChapter, type HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import { spokenReadAloudLines, type ReadAloudLine, type ReadAloudScript } from '@seihouse/sen/reader-runtime';
import { voiceEnergyPrice } from '../../components/energy/shared/energyGrades';

/**
 * Character voices for a chapter: its spoken lines made in their characters'
 * cast voices, at an Energy price for what is spoken. The narration is never
 * voiced this way; the device reads it (NOVEL_EXPANDED.md, How we build).
 */

/** A spoken line that gets a paid voice: whose it is, by Codex card. */
export interface ChapterVoiceLine {
  /** The Read Aloud line's key, which the Reader finds its clip by. */
  key: string;
  text: string;
  /** The speaking character's Codex card. */
  cardKey: string;
}

/** What a character's Codex card says that a cast voice is chosen from. */
export interface ChapterVoiceCharacter {
  key: string;
  name?: string;
  gender?: string;
  age?: string;
  voice?: string;
  bio?: string;
  mainCharacter?: boolean;
}

export interface ChapterVoicePlan {
  lines: ChapterVoiceLine[];
  /** The characters who speak those lines. */
  cast: ChapterVoiceCharacter[];
  /** Spoken lines by someone with no Codex card: the device reads them. */
  unvoiced: number;
}

// A chapter's script depends only on the saved chapter, so it is built once per chapter.
const scripts = new WeakMap<HarnessChapter, ReadAloudScript>();
const scriptOf = (state: HarnessWorkspaceState, chapter: HarnessChapter) => {
  let script = scripts.get(chapter);
  if (!script) { script = chapterReadAloudScript(state, chapter); scripts.set(chapter, script); }
  return script;
};

const nameKey = (name: string) => name.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();

/** The chapter's spoken lines that a character with a Codex card says, and those characters. */
export function chapterVoicePlan(state: HarnessWorkspaceState, chapter: HarnessChapter): ChapterVoicePlan {
  const cards = state.worldCards.filter(card => card.storyId === chapter.storyId && card.kind === 'character');
  const main = cards.find(card => card.mainCharacter);
  const byName = new Map(cards.flatMap(card => [card.name, ...(card.aliases ?? [])].map(name => [nameKey(name), card] as const)));
  const lines: ChapterVoiceLine[] = [];
  const speaking = new Map<string, ChapterVoiceCharacter>();
  let unvoiced = 0;
  for (const line of spokenReadAloudLines(scriptOf(state, chapter))) {
    const card = (line.speaker ? byName.get(nameKey(line.speaker)) : undefined) ?? (line.role === 'protagonist' ? main : undefined);
    if (!card) { unvoiced += 1; continue; }
    lines.push({ key: line.key, text: line.text, cardKey: card.key });
    if (!speaking.has(card.key)) {
      const { gender, age, voice, bio } = card.slots;
      speaking.set(card.key, { key: card.key, name: card.name, gender, age, voice, bio, ...(card.mainCharacter ? { mainCharacter: true } : {}) });
    }
  }
  return { lines, cast: [...speaking.values()], unvoiced };
}

/** The Energy to voice `lines` on `model`: what is spoken, at the voice price. */
export const chapterVoiceEnergy = (lines: readonly Pick<ChapterVoiceLine, 'text'>[], model: string | undefined): number =>
  voiceEnergyPrice(lines.reduce((total, line) => total + line.text.length, 0), model);

/** The host's character voices: making them, keeping them, and handing the Reader a line's clip. */
export interface ChapterVoiceService {
  /** Whether voices can be made here; undefined until the server has answered. */
  available: boolean | undefined;
  /** The Model Router id of the voice model, which sets the price. */
  model?: string;
  /** How many of these lines already have a kept clip. */
  voiced(storyId: string, chapterId: string, lines: readonly ChapterVoiceLine[]): number;
  /** The lines of these that have no kept clip yet. */
  missing(storyId: string, chapterId: string, lines: readonly ChapterVoiceLine[]): ChapterVoiceLine[];
  /** A kept clip's address for a Read Aloud line, when its words are still the ones voiced. */
  clip(storyId: string, chapterId: string, line: Pick<ReadAloudLine, 'key' | 'text'>): string | undefined;
  /**
   * Voices the plan's lines that have no clip yet, one line a call, keeping each
   * as it arrives. `onLine` reports each line kept. Rejects with a reason the
   * reader can read; the lines already kept stay.
   */
  voice(storyId: string, chapterId: string, plan: ChapterVoicePlan, onLine?: (kept: number, total: number) => void): Promise<void>;
}
