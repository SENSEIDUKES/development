import { parseModelJson } from '../../../narrative/modelJson';
import { worldCardsOfKind, type WorldCard, type WorldRecord } from '../../../narrative/worldRecord';
import type { CodexEntry, CodexEntryKind, HoldingsSection } from '../../../narrative/holdings';
import type { HarnessChapter, HarnessChapterTagging, HarnessTagRequest, HarnessTagSubject, HarnessWorkspaceState } from '../../../narrative/generation';
import { activeAttemptForStory } from './attempts';
import { findStory } from './foundation';
import type { SoundWord } from '../../../audio/soundWords';
import type { SoundtrackVocabulary } from '../../../audio/soundtrackVocabulary';
import type { HarnessTagFocus, HarnessWarning } from '../../../narrative/generation';
import { soundVocabulary } from '../../../audio/media';
import { soundtrackVocabulary } from '../../../audio/soundtrackVocabulary';
import { SOUNDTRACK_TAG_WORDS, SOUND_TAG_WORDS, readMarks } from '../../../narrative/marks';
import { conditionLabel, type CharacterConditions } from './conditions';
import { placeOfEntry, type CurrentPlace } from './places';
import { TAG_SUBJECT_TIES, tiesOfEntry, type CurrentTie } from './ties';
import { findSpokenLines } from '../../../narrative/speech';
import { splitSentences } from '../../highlight-engine/shared/manuscript';
import { normalizeIdentityLabel } from './canonicalProjection';
import { isMinorEntry, pointedSentence } from './holdings';
import { acceptChapterTags, type HarnessResponseAcceptanceOptions } from './responseAcceptance';

/**
 * The tagger in the HARNESS (SENSEI, 2026-10-24): the chapter is written
 * first, and one call afterwards reads it and writes the app's tags for it.
 *
 * This side plans that call and reads its answer. Everything it sends is
 * something a chapter has on its own: the prose, who and what the story
 * already holds, what each character was carrying, and the words the tagger
 * may name. Nothing here touches the Foundation, the arc or the Story
 * Information Packet, because a chapter an author wrote themselves has none of
 * those and must tag exactly as well.
 *
 * The answer is a list of notes in the margin, never the chapter (SENSEI,
 * 2026-10-29: "You write a page. Your teacher looks over it, writes marks. The
 * page is never retyped."). Each note names a paragraph, the exact words the
 * tag belongs to, and the tag. The HARNESS places every note on its own copy
 * of the paragraph, so there is one copy of the novel and the tagger cannot
 * change a word of it: not a rule it is held to, a fact of the shape. A note
 * whose words are not in its paragraph is dropped by itself, and the rest
 * stand.
 */

/** The most conditions one character's line lists for the tagger. */
export const TAG_SUBJECT_CONDITIONS = 8;
/** The longest "who they are" line a card character carries to the tagger. */
export const TAG_SUBJECT_WHO_CHARACTERS = 200;

/** The world card kinds that are also Codex kinds: the only ones a tag can name today. */
const CARD_KIND_SUBJECTS: ReadonlyArray<CodexEntryKind> = ['character', 'thing', 'ability', 'place'];

/**
 * Who and what the story already has, for the one list that keeps a tag from
 * inventing a second identity: its Codex entries, then the world record's
 * cards for anything no chapter has tagged yet. A name the story holds twice
 * is listed once, and the Codex wins, because its entry is the identity a tag
 * actually resolves to.
 *
 * In a story with a world, the list is the pool the tagger uncovers (SENSEI,
 * 2026-11-11): each card is marked as one, and a card character carries their
 * card's one line of who they are, so the tagger knows them from a description
 * before the prose names them. Anyone else is a minor figure, listed by name
 * alone so one who comes back keeps the same name: what they carry, where they
 * are and how they stand with anyone is not the record's to keep.
 */
export function tagSubjectsOfStory({ entries, world, conditions, places, ties }: {
  entries: readonly CodexEntry[];
  world?: WorldRecord;
  /** What each character carries going into the chapter. */
  conditions?: readonly CharacterConditions[];
  /** Where each character is going into the chapter. */
  places?: ReadonlyMap<string, CurrentPlace>;
  /** How each pair stands going into the chapter. */
  ties?: ReadonlyMap<string, CurrentTie>;
}): HarnessTagSubject[] {
  const subjects: HarnessTagSubject[] = [];
  // What someone carries, by their entry or their card: each in a few words, as many as a list holds.
  const conditionsOf = (entryId: string | undefined, cardKey: string | undefined) =>
    (conditions?.find(character => (entryId && character.key === entryId) || (cardKey && character.cardKey === cardKey))?.conditions ?? [])
      .slice(0, TAG_SUBJECT_CONDITIONS).map(conditionLabel);
  const cardOf = (key: string | undefined) => (key ? world?.cards.find(card => card.key === key) : undefined);
  // Who a card character is: their card's own line, or their part in the story when it has none.
  const whoOf = (card: WorldCard | undefined) => (card?.kind === 'character'
    ? (card.slots.bio?.trim() || card.slots.role?.trim() || '').slice(0, TAG_SUBJECT_WHO_CHARACTERS).trim() : '');
  const hasCards = Boolean(world?.cards.length);
  const taken = new Set<string>();
  const add = (subject: HarnessTagSubject) => {
    const key = `${subject.kind}:${normalizeIdentityLabel(subject.name)}`;
    if (!subject.name.trim() || taken.has(key)) return;
    taken.add(key);
    subjects.push(subject);
  };
  for (const entry of entries) {
    // A minor figure is listed by name alone.
    const tracked = entry.kind === 'character' && !isMinorEntry(entry, world);
    const carried = tracked ? conditionsOf(entry.id, entry.cardKey) : [];
    const place = tracked && places ? placeOfEntry(places, entry)?.place : undefined;
    const tied = tracked && ties ? tiesOfEntry(ties, entry).slice(-TAG_SUBJECT_TIES).map(tie => ({ with: tie.with, tie: tie.tie })) : [];
    const who = whoOf(cardOf(entry.cardKey));
    add({
      name: entry.name,
      kind: entry.kind,
      ...(entry.aliases?.length ? { aliases: [...entry.aliases] } : {}),
      ...(entry.mainCharacter ? { mainCharacter: true as const } : {}),
      ...(hasCards && !isMinorEntry(entry, world) ? { card: true as const } : {}),
      ...(who ? { who } : {}),
      ...(carried.length ? { conditions: carried } : {}),
      ...(place ? { place } : {}),
      ...(tied.length ? { ties: tied } : {}),
    });
  }
  for (const kind of CARD_KIND_SUBJECTS) {
    for (const card of worldCardsOfKind(world, kind)) {
      const carried = kind === 'character' ? conditionsOf(undefined, card.key) : [];
      const who = whoOf(card);
      add({
        name: card.name,
        kind,
        ...(card.aliases?.length ? { aliases: [...card.aliases] } : {}),
        ...(card.mainCharacter ? { mainCharacter: true as const } : {}),
        card: true as const,
        ...(who ? { who } : {}),
        ...(carried.length ? { conditions: carried } : {}),
      });
    }
  }
  return subjects;
}

/**
 * The tagger's call for one chapter. The chapter's own paragraphs are sent as
 * they stand: a chapter already tagged is tagged again from its clean prose,
 * which is what makes re-tagging an existing chapter the same operation as
 * tagging a new one.
 */
export function planChapterTagging({ chapter, entries, world, holdings, conditions, places, ties, soundWords, soundtrack, language, model, reasoningLevel, focus }: {
  chapter: Pick<HarnessChapter, 'id' | 'storyId' | 'chapterNumber' | 'paragraphs'>;
  entries: readonly CodexEntry[];
  world?: WorldRecord;
  /** What each character had going into this chapter. */
  holdings?: HoldingsSection;
  /** What each character carried going into this chapter. */
  conditions?: readonly CharacterConditions[];
  /** Where each character was going into this chapter. */
  places?: ReadonlyMap<string, CurrentPlace>;
  /** How each pair stood going into this chapter. */
  ties?: ReadonlyMap<string, CurrentTie>;
  soundWords?: readonly SoundWord[];
  soundtrack?: SoundtrackVocabulary;
  language: string;
  /** The model that reads the chapter: the host's tagger choice, else the chapter's writer. */
  model: string;
  /** How hard it thinks, when the host chose; otherwise as little as the model allows. */
  reasoningLevel?: string;
  /** One group read again on its own: media sends only the sound words and categories, nobody and nothing the story has. */
  focus?: HarnessTagFocus;
}): HarnessTagRequest {
  const media = focus === 'media';
  return {
    operation: 'tag-chapter',
    storyId: chapter.storyId,
    chapterId: chapter.id,
    chapterNumber: chapter.chapterNumber,
    model,
    ...(reasoningLevel ? { reasoningLevel } : {}),
    language,
    paragraphs: [...chapter.paragraphs],
    subjects: media ? [] : tagSubjectsOfStory({ entries, world, conditions, places, ties }),
    ...(!media && holdings?.characters.length ? { holdings } : {}),
    ...(soundWords?.length ? { soundWords: [...soundWords] } : {}),
    ...(soundtrack ? { soundtrack } : {}),
    ...(focus ? { focus } : {}),
  };
}

/**
 * The warnings that belong to the media tags: a media-only read replaces
 * these in the chapter's record and leaves every other warning as it was.
 */
export const MEDIA_TAG_WARNING_CODES: ReadonlySet<HarnessWarning['code']> = new Set(['soundtrack_incomplete', 'sound_cue_set_aside', 'sound_tag_moved']);

/**
 * Why one of this story's committed chapters cannot be tagged (again), when it
 * cannot, in words a reader can act on. `undefined` means it can.
 *
 * Any committed chapter (SENSEI, 2026-10-29, `docs/create-hub.md` phase B:
 * "one chapter at a time, a couple chapters at a time, until we get this
 * right"). Until then only the newest was read again, as Create mode and the
 * rewrite work on the newest; what made that safe, taking the chapter's own
 * Codex entries back out before the new tags go in, now keeps every entry a
 * later chapter still names (`codexEntriesWithoutChapter`).
 *
 * A prose edit is no obstacle: a reader who changed the words wants the chapter
 * read again. What is refused is work a machine cannot give back.
 */
export function retagChapterGap(state: HarnessWorkspaceState, storyId: string, chapterId: string, focus?: HarnessTagFocus): string | undefined {
  const story = findStory(state, storyId);
  if (!story) return 'Open a story before tagging a chapter.';
  const target = state.chapters.find(chapter => chapter.storyId === storyId && chapter.id === chapterId);
  if (!target) return 'This chapter is not saved in this story, so it cannot be tagged.';
  const chapter = `Chapter ${target.chapterNumber}`;
  // Who the main character is, and the words the chapter was written with, come
  // from the attempt that wrote it; without that record the tagger would guess.
  if (!state.attempts.some(attempt => attempt.id === target.attemptId)) {
    return `${chapter} no longer has the record of how it was written, so it cannot be tagged.`;
  }
  if (activeAttemptForStory(state, storyId)) return `Wait for the chapter being written before tagging ${chapter}.`;
  if (state.batches.some(batch => batch.storyId === storyId && ['running', 'pause_requested'].includes(batch.status))) {
    return `Pause the batch writing this story before tagging ${chapter}.`;
  }
  // A Sound Cue the reader placed on exact words by hand. It is the one kind a
  // person can place (`createManualSoundCue`), and tagging again would replace
  // the chapter's cues with the tagger's, taking theirs with them.
  if ((target.soundCues ?? []).some(cue => cue.payload.origin === 'manual')) {
    return `${chapter} has a Sound Cue you placed yourself, so tagging it again would remove it.`;
  }
  // Media read again on its own leaves every name, holding and Codex entry as it is.
  if (focus === 'media') {
    // A media-only read joins a full one: the information tags it keeps came from that read.
    if (target.tagging?.status !== 'tagged') return `Tag all of ${chapter} first; its media can be tagged again on its own after that.`;
    const vocabulary = soundtrackVocabulary(target.mediaLoadout);
    if (!soundVocabulary(target.mediaLoadout).length && !vocabulary.music.length && !vocabulary.atmospheres.length) {
      return `${chapter} has no sound words, soundscapes or atmospheres equipped, so it has no media to tag.`;
    }
    return undefined;
  }
  // The Holdings fixer taught an older entry one of this chapter's names. That
  // alias lives on the other entry, and only a rewrite of this chapter takes it
  // back, so replacing these tags would leave it with nothing behind it.
  if ((target.fixer?.fixes ?? []).some(fix => fix.merged?.alias)) {
    return `${chapter} had two names joined into one by the Holdings fixer, so it cannot be tagged again.`;
  }
  return undefined;
}

/** The tags one accepted answer placed: what goes on the chapter's own fields. */
export interface ChapterTags {
  soundCues: ReturnType<typeof acceptChapterTags>['soundCues'];
  speakers: ReturnType<typeof acceptChapterTags>['speakers'];
  holdingChanges: ReturnType<typeof acceptChapterTags>['holdingChanges'];
  appearances: ReturnType<typeof acceptChapterTags>['appearances'];
  statuses: ReturnType<typeof acceptChapterTags>['statuses'];
  places: ReturnType<typeof acceptChapterTags>['places'];
  ties: ReturnType<typeof acceptChapterTags>['ties'];
  settings: ReturnType<typeof acceptChapterTags>['settings'];
  scene: ReturnType<typeof acceptChapterTags>['scene'];
}

/**
 * What one tagging call came to: the record the chapter keeps either way, and
 * the tags when the answer was accepted. The two are separate because the tags
 * belong on the chapter's own fields, where a writer's tags went before, and
 * only the record is new storage.
 */
export interface ChapterTagging {
  record: HarnessChapterTagging;
  /** Absent when the answer placed no tag; the record then says why. */
  tags?: ChapterTags;
}

// ─── Notes in the margin ────────────────────────────────────────────────────

/**
 * One note the tagger writes in the margin: which paragraph, the exact words
 * the tag belongs to, and the tag itself in the tag language. The tagger never
 * writes the prose, so it cannot change it.
 */
export interface TagNote {
  /** The paragraph's number as the tagger was shown it: 1 for the first. */
  paragraph: number;
  /**
   * The exact words in that paragraph the tag belongs to: the spoken line for
   * a speaker, the sentence for a holding or an appearance, the words where a
   * sound happens. Empty only for the chapter's music and atmosphere, which
   * open their paragraph.
   */
  words: string;
  /** The tag: `[[@MC]]`, `[[gained: MC | Iron Key]]`, `[[sound: growl | low]]`, `[[soundscape: Tense | dark | urgent | high]]`. */
  tag: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** The tag as written, without the brackets a note may or may not have put around it. */
const tagBody = (tag: string) => tag.trim().replace(/^[[［]{1,2}\s*/u, '').replace(/\s*[\]］]{1,2}$/u, '').trim();

const escapeForPattern = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[ \t-]+/g, '[ \\t-]?');
const openingWord = (words: readonly string[]) => new RegExp(`^(?:${words.map(escapeForPattern).join('|')})\\s*[:：]`, 'iu');
/** A sound tag, by the language's own words for it: the one kind whose words sit inside the tag. */
const SOUND_NOTE = openingWord(SOUND_TAG_WORDS);
/** A soundtrack tag, by the language's own words for it: the one kind that needs no words, since it opens its paragraph. */
const SOUNDTRACK_NOTE = openingWord(Object.values(SOUNDTRACK_TAG_WORDS).flat());
/** A speaker tag: placed at the start of the spoken line its words are in. */
const SPEAKER_NOTE = /^[@＠]/u;

type NoteKind = 'sound' | 'soundtrack' | 'speaker' | 'point';
const noteKind = (body: string): NoteKind =>
  SOUNDTRACK_NOTE.test(body) ? 'soundtrack' : SOUND_NOTE.test(body) ? 'sound' : SPEAKER_NOTE.test(body) ? 'speaker' : 'point';

/**
 * Quotation marks and apostrophes as a model often writes them back: straight
 * for curly. Each stands in for one character, so an offset found in the
 * folded text is the same offset in the real one.
 */
const foldQuotes = (text: string) => text.replace(/[“”„]/g, '"').replace(/[‘’‚]/g, "'");

/** Where `words` sit in a paragraph, when they sit there exactly once. */
type WordsFound = { start: number; end: number } | 'missing' | 'ambiguous';

const findOnce = (haystack: string, needle: string): { at: number; count: number } => {
  let at = haystack.indexOf(needle);
  const first = at;
  let count = 0;
  while (at !== -1 && count < 2) {
    count += 1;
    at = haystack.indexOf(needle, at + 1);
  }
  return { at: first, count };
};

/** The note's words in its paragraph: as written first, then with straight quotes read as the paragraph's curly ones. */
const findWords = (paragraph: string, words: string): WordsFound => {
  for (const [text, needle] of [[paragraph, words], [foldQuotes(paragraph), foldQuotes(words)]] as const) {
    const { at, count } = findOnce(text, needle);
    if (count === 1) return { start: at, end: at + needle.length };
    if (count > 1) return 'ambiguous';
  }
  return 'missing';
};

/** The words a note names, as it names them, for a warning. */
const quoted = (words: string) => {
  const trimmed = words.trim();
  return trimmed.length > 60 ? `“${trimmed.slice(0, 57)}…”` : `“${trimmed}”`;
};

/** One place in a paragraph where tag text goes: a closing before a point tag before an opening, at the same offset. */
interface Insertion { at: number; rank: 0 | 1 | 2; text: string }

/**
 * Where one note's tag text goes in its paragraph, in the inline form the tag
 * reader reads: a speaker, holding, appearance or soundtrack tag is written
 * just before its words, and a sound tag is written around them.
 */
const insertionsOf = (paragraph: string, note: TagNote, kind: NoteKind): Insertion[] | string => {
  const body = tagBody(note.tag);
  if (!body) return 'it names no tag';
  const words = note.words.trim();
  if (!words) {
    if (kind !== 'soundtrack') return 'it names no words';
    return [{ at: 0, rank: 1, text: `[[${body}]]` }];
  }
  const found = findWords(paragraph, words);
  if (found === 'missing') return `its words ${quoted(words)} are not in that paragraph`;
  if (found === 'ambiguous') return `its words ${quoted(words)} are in that paragraph more than once`;
  if (kind === 'sound') {
    // The words sit inside a sound tag. One written the old way, with the words
    // in it, is read as the note it is: the paragraph's own characters are
    // wrapped, never the note's copy of them.
    const [head, ...parts] = body.split(/[|｜]/).map(part => part.trim());
    const own = foldQuotes(words);
    const rest = parts.filter(part => part && foldQuotes(part) !== own);
    return [
      { at: found.start, rank: 2, text: `[[${[head, ...rest].join(' | ')} | ` },
      { at: found.end, rank: 0, text: ']]' },
    ];
  }
  let at = found.start;
  if (kind === 'speaker') {
    // A speaker names a spoken line, and the line takes the nearest tag at or
    // before its opening mark: words quoted from inside the line move the tag
    // to where the line begins.
    const line = findSpokenLines(paragraph).find(spoken => spoken.start < at && at < spoken.end);
    if (line) at = line.start;
  }
  return [{ at, rank: 1, text: `[[${body}]]` }];
};

/** The paragraph with its tag text written in at every insertion. */
const written = (paragraph: string, insertions: readonly Insertion[]) => {
  const ordered = insertions.map((insertion, index) => ({ ...insertion, index }))
    .sort((left, right) => left.at - right.at || left.rank - right.rank || left.index - right.index);
  let text = '';
  let cursor = 0;
  for (const insertion of ordered) {
    text += paragraph.slice(cursor, insertion.at) + insertion.text;
    cursor = insertion.at;
  }
  return text + paragraph.slice(cursor);
};

export interface PlacedTagNotes {
  /** The chapter's own paragraphs with every placed note's tag written in, for the tag reader. */
  paragraphs: string[];
  /** Why each note that was not placed was dropped, in the order the notes came. */
  dropped: string[];
  /** How many notes were placed. */
  placed: number;
}

/**
 * Places the tagger's notes on the chapter's own paragraphs, one note at a
 * time. A note is kept only while the paragraph still reads, with every tag
 * taken back out, exactly as the chapter has it; one that would change a
 * character of the prose (a tag the reader would read as standing in for a
 * name, say) is dropped on its own, named, and the rest stand. The inline form
 * is the tag reader's and never the model's: it exists here only so every tag
 * is placed through the one path a writer's tags went through.
 */
export function placeTagNotes(paragraphs: readonly string[], notes: readonly TagNote[], { soundWords }: { soundWords?: readonly string[] } = {}): PlacedTagNotes {
  const dropped: string[] = [];
  let placed = 0;
  const kept = paragraphs.map(() => [] as Insertion[]);
  const reading = soundWords?.length ? { soundWords } : {};
  const label = (note: TagNote) => `${tagBody(note.tag) ? `[[${tagBody(note.tag)}]]` : 'a note'} on paragraph ${note.paragraph}`;
  for (const note of notes) {
    const index = note.paragraph - 1;
    if (!Number.isInteger(index) || index < 0 || index >= paragraphs.length) {
      dropped.push(`${label(note)}: the chapter has ${paragraphs.length} paragraph${paragraphs.length === 1 ? '' : 's'}`);
      continue;
    }
    const paragraph = paragraphs[index];
    const insertions = insertionsOf(paragraph, note, noteKind(tagBody(note.tag)));
    if (typeof insertions === 'string') { dropped.push(`${label(note)}: ${insertions}`); continue; }
    const candidate = [...kept[index], ...insertions];
    if (readMarks(written(paragraph, candidate), reading).text !== paragraph) {
      dropped.push(`${label(note)}: it could not be placed without changing the paragraph`);
      continue;
    }
    kept[index] = candidate;
    placed += 1;
  }
  return { paragraphs: paragraphs.map((paragraph, index) => written(paragraph, kept[index])), dropped, placed };
}

/**
 * The notes that put a tagged chapter's tags back where they are: the inverse
 * of `placeTagNotes`, for a saved chapter replayed through the tagger (the
 * Workshop's replaying writer, and tests built from tagged fixtures). Each tag
 * read out of the inline form becomes a note on the words it marks: a sound's
 * own words, a speaker's spoken line, a holding's or an appearance's sentence,
 * and no words for the soundtrack. A tag the reader could not read is no note.
 */
export function notesOfTaggedChapter(tagged: readonly string[], locale?: string): TagNote[] {
  const notes: Array<TagNote & { offset: number }> = [];
  tagged.forEach((source, index) => {
    const reading = readMarks(source);
    const text = reading.text;
    const paragraph = index + 1;
    const lines = findSpokenLines(text);
    const sentences = splitSentences(text, locale);
    for (const tag of reading.soundtracks) notes.push({ paragraph, words: '', tag: `[[${tag.kind}: ${tag.parts.join(' | ')}]]`, offset: tag.offset });
    for (const tag of reading.sounds) {
      notes.push({ paragraph, words: text.slice(tag.start, tag.end), tag: `[[sound: ${tag.sound}${tag.energy ? ` | ${tag.energy}` : ''}]]`, offset: tag.start });
    }
    for (const tag of reading.speakers) {
      const line = lines.find(spoken => spoken.end > tag.offset) ?? lines.at(-1);
      const words = line ? text.slice(line.start, line.end) : text.slice(tag.offset);
      if (words) notes.push({ paragraph, words, tag: `[[@${tag.name}]]`, offset: tag.offset });
    }
    for (const tag of reading.wordTags) {
      const sentence = pointedSentence(sentences, tag.offset);
      const words = sentence ? text.slice(sentence.start, sentence.end) : text;
      if (words) notes.push({ paragraph, words, tag: `[[${tag.word}: ${tag.parts.join(' | ')}]]`, offset: tag.offset });
    }
  });
  return notes
    .sort((left, right) => left.paragraph - right.paragraph || left.offset - right.offset)
    .map(({ offset: _offset, ...note }) => note);
}

/**
 * A paragraph as the tag reader leaves it with no tag in it: the text every
 * attachment's offsets are measured from.
 */
const cleanForm = (paragraph: string) => readMarks(paragraph).text;

/**
 * A paragraph the chapter cannot be tagged from: one the tag reader would not
 * leave as it is, such as a paragraph with space around it or nothing but
 * space. Every attachment's offsets are measured from the text the tag reader
 * returns, so tagging such a paragraph would place its tags at the wrong
 * character of the chapter the reader actually has. A committed chapter never
 * holds one (`harnessChapterBody` trims every paragraph and drops the empty
 * ones); a chapter brought in from somewhere else can, so it is refused and
 * named rather than quietly misplaced.
 */
const untaggableParagraph = (sent: readonly string[]) => {
  const at = sent.findIndex(paragraph => paragraph !== cleanForm(paragraph));
  return at === -1 ? undefined : `paragraph ${at + 1} is not the prose the reader has (space around it, or nothing but space), and a tag on it would land on the wrong words`;
};

/** The notes in one answer, as far as it can be read as a list of them; an entry that is no note is dropped and named. */
const readNotes = (raw: string | undefined): { notes: TagNote[]; dropped: string[]; count: number } | string => {
  const parsed = parseModelJson(raw);
  if (parsed === undefined) return 'The answer was not readable JSON.';
  // `{ notes: [...] }` as asked, or the bare list a model sometimes returns instead.
  const list = Array.isArray(parsed) ? parsed : isRecord(parsed) && Array.isArray(parsed.notes) ? parsed.notes : undefined;
  if (!list) return 'The answer held no list of notes.';
  const notes: TagNote[] = [];
  const dropped: string[] = [];
  list.forEach((entry, index) => {
    if (!isRecord(entry) || typeof entry.tag !== 'string') { dropped.push(`note ${index + 1}: it is not a note with a tag`); return; }
    const paragraph = typeof entry.paragraph === 'number' ? entry.paragraph : typeof entry.paragraph === 'string' ? Number(entry.paragraph) : Number.NaN;
    notes.push({ paragraph, words: typeof entry.words === 'string' ? entry.words : '', tag: entry.tag });
  });
  return { notes, dropped, count: list.length };
};

/**
 * Reads one tagging answer: the tagger's notes, placed on the chapter's own
 * paragraphs and then read and placed through the same path the writer's own
 * reply goes through.
 *
 * The prose cannot change, because the tagger never wrote any: the chapter's
 * paragraphs are the ones that are tagged. The check that the prose that comes
 * back out of the tag reader is the prose that went in is kept all the same,
 * paragraph by paragraph, as the HARNESS's own guarantee: a paragraph that
 * failed it would be a HARNESS fault, not the tagger's, and loses only its own
 * notes. Failure is a note's, never the chapter's: a note that cannot be placed
 * is dropped and named, and every other note lands.
 */
export function readChapterTagging({ raw, sent, chapterNumber, at, model, options }: {
  raw: string | undefined;
  /** The paragraphs the tagger was given: the ones its notes are placed on. */
  sent: readonly string[];
  chapterNumber: number;
  at: string;
  model?: string;
  options?: HarnessResponseAcceptanceOptions;
}): ChapterTagging {
  const failed = (problem: string, warnings: HarnessWarning[] = [], notes?: HarnessChapterTagging['notes']): ChapterTagging =>
    ({ record: { status: 'failed', at, ...(model ? { model } : {}), problem, ...(notes ? { notes } : {}), ...(warnings.length ? { warnings } : {}) } });
  const answer = readNotes(raw);
  if (typeof answer === 'string') return failed(answer);
  const untaggable = untaggableParagraph(sent);
  if (untaggable) return failed(`This chapter cannot be tagged as it stands: ${untaggable}.`);
  const soundWords = options?.soundVocabulary?.map(sound => sound.word);
  let remaining = answer.notes;
  // Notes a pass lost because their paragraph did not read back: kept apart
  // from what the final placement drops, so no note is counted twice.
  const lost: string[] = [];
  for (;;) {
    const placement = placeTagNotes(sent, remaining, { soundWords });
    const dropped = [...answer.dropped, ...lost, ...placement.dropped];
    const warnings: HarnessWarning[] = [];
    const read = acceptChapterTags(placement.paragraphs, chapterNumber, warnings, options);
    // The HARNESS's own guarantee, checked: the prose that falls out of the tag
    // reader is the prose the chapter has. A paragraph that fails it loses its
    // notes and the chapter is read again without them.
    const changed = new Set(sent.map((paragraph, index) => (read.paragraphs[index] === paragraph ? -1 : index + 1)).filter(index => index > 0));
    if (read.paragraphs.length === sent.length && !changed.size) {
      if (dropped.length) {
        warnings.unshift({
          code: 'tag_note_dropped',
          message: `Dropped ${dropped.length} of the tagger's ${answer.count} note${answer.count === 1 ? '' : 's'}: ${dropped.join('; ')}.`,
        });
      }
      return {
        record: {
          status: 'tagged', at, ...(model ? { model } : {}),
          notes: { written: answer.count, placed: placement.placed },
          ...(warnings.length ? { warnings } : {}),
        },
        tags: {
          soundCues: read.soundCues,
          speakers: read.speakers,
          holdingChanges: read.holdingChanges,
          appearances: read.appearances,
          statuses: read.statuses,
          places: read.places,
          ties: read.ties,
          settings: read.settings,
          scene: read.scene,
        },
      };
    }
    const losing = remaining.filter(note => changed.has(note.paragraph) || read.paragraphs.length !== sent.length);
    if (!losing.length) return failed('The HARNESS could not read the chapter back as it stands after placing the notes, so no tag was kept.', warnings, { written: answer.count, placed: 0 });
    lost.push(...losing.map(note => `[[${tagBody(note.tag)}]] on paragraph ${note.paragraph}: the paragraph did not read back as it stands with it placed`));
    remaining = remaining.filter(note => !losing.includes(note));
  }
}
