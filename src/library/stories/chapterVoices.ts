import { chapterReadAloudBlocks, chapterReadAloudScript, minorFiguresSeen, normalizeIdentityLabel as identity, type HarnessChapter, type HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import { isSpeakerOnText, spokenReadAloudLines, type ReadAloudLine, type ReadAloudScript } from '@seihouse/sen/reader-runtime';
import { voiceEnergyPrice } from '../../components/energy/shared/energyGrades';

/**
 * Character voices for a chapter: its spoken lines made in their characters'
 * cast voices, at an Energy price for what is spoken. The narration is never
 * voiced this way; the device reads it (NOVEL_EXPANDED.md, How we build).
 */

/** A spoken line that gets a paid voice, and whose voice it is. */
export interface ChapterVoiceLine {
  /** The Read Aloud line's key, which the Reader finds its clip by. */
  key: string;
  text: string;
  /** Who the chapter's speaker record says speaks it. A line said by someone else is a different line. */
  speaker: string;
  /** Whose voice speaks it: the character's Codex card, or a minor figure by the name they speak under. */
  cardKey: string;
}

/**
 * What a cast voice is chosen from: a character's Codex card, or, for a minor
 * figure, what the chapters show of them (a man or a woman; young, middle-aged
 * or old) and the sentence that introduced them.
 */
export interface ChapterVoiceCharacter {
  key: string;
  name?: string;
  gender?: string;
  age?: string;
  voice?: string;
  bio?: string;
  mainCharacter?: boolean;
  /**
   * On a card a reader promoted from a minor figure: the keys their voice may
   * have been kept under while they had no card (its name first, then each
   * other name it answers to), so they keep the voice they already speak with
   * instead of being cast a second time.
   */
  was?: string[];
}

export interface ChapterVoicePlan {
  lines: ChapterVoiceLine[];
  /** The characters who speak those lines. */
  cast: ChapterVoiceCharacter[];
  /** Spoken lines with no speaker record: the device reads them. */
  unvoiced: number;
}

// A chapter's script depends only on the saved chapter, so it is built once per chapter.
const scripts = new WeakMap<HarnessChapter, ReadAloudScript>();
const scriptOf = (state: HarnessWorkspaceState, chapter: HarnessChapter) => {
  let script = scripts.get(chapter);
  if (!script) { script = chapterReadAloudScript(state, chapter); scripts.set(chapter, script); }
  return script;
};

/** What the record holds of the story's minor figures: what its chapters show of each, and the sentence that introduced them. */
interface MinorFigures {
  seen: ReturnType<typeof minorFiguresSeen>;
  introduced: Map<string, string>;
}
// Worked out once per saved workspace.
const figuresByState = new WeakMap<HarnessWorkspaceState, Map<string, MinorFigures>>();
const shown = (state: HarnessWorkspaceState, storyId: string): MinorFigures => {
  let stories = figuresByState.get(state);
  if (!stories) { stories = new Map(); figuresByState.set(state, stories); }
  let figures = stories.get(storyId);
  if (!figures) {
    const chapters = state.chapters.filter(chapter => chapter.storyId === storyId).sort((left, right) => left.chapterNumber - right.chapterNumber);
    const introduced = new Map<string, string>();
    for (const chapter of chapters) {
      for (const { payload, anchor } of chapter.appearances ?? []) {
        const key = identity(payload.subject.name);
        if (payload.event === 'appears' && key && !introduced.has(key)) introduced.set(key, anchor.selectedText);
      }
    }
    figures = { seen: minorFiguresSeen(chapters), introduced };
    stories.set(storyId, figures);
  }
  return figures;
};
const nameKey = (name: string) => name.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();

/** The key a minor figure's voice is kept under: the name they speak by. */
const minorKey = (speaker: string) => `minor:${nameKey(speaker)}`;

/**
 * The chapter's spoken lines that a speaker record gives to someone, and those
 * speakers: a character by their Codex card, anyone else as a minor figure, so
 * no spoken line drops back to the device's voice between two characters
 * (SENSEI, 2026-11-16). Quoted words nobody was recorded as saying
 * (a sign, a remembered phrase) are never voiced: Read Aloud's own guess at who
 * speaks them is good enough for the device's voice, not for a paid one.
 */
export function chapterVoicePlan(state: HarnessWorkspaceState, chapter: HarnessChapter): ChapterVoicePlan {
  const cards = state.worldCards.filter(card => card.storyId === chapter.storyId && card.kind === 'character');
  const main = cards.find(card => card.mainCharacter);
  const byName = new Map(cards.flatMap(card => [card.name, ...(card.aliases ?? [])].map(name => [nameKey(name), card] as const)));
  const lines: ChapterVoiceLine[] = [];
  const speaking = new Map<string, ChapterVoiceCharacter>();
  let unvoiced = 0;
  // Only a line the chapter's own speaker record covers is voiced: Read Aloud's guess from the narration is not a record,
  // and neither is a record whose words the paragraph no longer holds.
  const paragraphs = new Map(chapterReadAloudBlocks(chapter).map(block => [block.id, block.text]));
  const recorded = (line: ReadAloudLine) => (chapter.speakers ?? []).some(record =>
    line.blockId !== undefined && isSpeakerOnText(record, line.blockId, paragraphs.get(line.blockId) ?? '')
    && record.anchor.startOffset < line.end && record.anchor.endOffset > line.start);
  for (const line of spokenReadAloudLines(scriptOf(state, chapter))) {
    if (!line.speaker || !recorded(line)) { unvoiced += 1; continue; }
    const card = byName.get(nameKey(line.speaker)) ?? (line.role === 'protagonist' ? main : undefined);
    const key = card?.key ?? minorKey(line.speaker);
    lines.push({ key: line.key, text: line.text, speaker: line.speaker, cardKey: key });
    if (speaking.has(key)) continue;
    if (card) {
      const { gender, age, voice, bio } = card.slots;
      speaking.set(key, {
        key, name: card.name, gender, age, voice, bio, ...(card.mainCharacter ? { mainCharacter: true } : {}),
        // A card that entered after the story began was a minor figure first, under one of the names it answers to.
        ...(card.enteredInChapter > 0 ? { was: [...new Set([card.name, ...(card.aliases ?? []), line.speaker].map(minorKey))] } : {}),
      });
    } else {
      const figures = shown(state, chapter.storyId);
      const seen = figures.seen.get(identity(line.speaker));
      speaking.set(key, { key, name: line.speaker, gender: seen?.sex, age: seen?.age, bio: figures.introduced.get(identity(line.speaker)) });
    }
  }
  return { lines, cast: [...speaking.values()], unvoiced };
}

/** The Energy to voice `lines` on `model`: what is spoken, at the voice price. */
export const chapterVoiceEnergy = (lines: readonly Pick<ChapterVoiceLine, 'text'>[], model: string | undefined): number =>
  voiceEnergyPrice(lines.reduce((total, line) => total + line.text.length, 0), model);

/**
 * The host's narration made on the reader's own device (Kokoro): free voices
 * for every line that has no cast voice, in place of the device's robotic
 * one. The Reader shows its switch in Narration.
 */
export interface DeviceNarrationService {
  /** What the setting is called. */
  name: string;
  on: boolean;
  setOn: (on: boolean) => void;
  /** One line saying where it stands, for a story it can read (`english`) or cannot. */
  status: (english: boolean) => string;
  /** A line's clip: its address, a promise while it is made, or nothing when this cannot read it. */
  clip: (line: ReadAloudLine, upcoming: readonly ReadAloudLine[]) => string | Promise<string | undefined> | undefined;
}

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
  /** A kept clip's address for a Read Aloud line, when its words and its speaker are still the ones voiced. */
  clip(storyId: string, chapterId: string, line: Pick<ReadAloudLine, 'key' | 'text' | 'speaker'>): string | undefined;
  /**
   * Voices the plan's lines that have no clip yet, one line a call, keeping each
   * as it arrives. `onLine` reports each line kept. Rejects with a reason the
   * reader can read; the lines already kept stay.
   */
  voice(storyId: string, chapterId: string, plan: ChapterVoicePlan, onLine?: (kept: number, total: number) => void): Promise<void>;
}
