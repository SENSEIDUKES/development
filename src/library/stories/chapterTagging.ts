import { soundVocabulary, soundtrackVocabulary } from '@seihouse/sen/audio';
import { harnessParagraphBlockId, type CodexEntry, type HarnessChapter, type HarnessWarning } from '@seihouse/sen/harness-generation';
import { ATTACHMENT_COLORS, type OverlayMark, type TextHighlightBlock } from '@seihouse/sen/highlight-engine';

/**
 * A chapter's tagging record, in words for the page (SENSEI, 2026-10-29,
 * `docs/create-hub.md` phase B and decision 4): whether the tagger read the
 * chapter, by which model and when, how many notes it wrote and how many
 * landed, and then one line per kind of tag. A kind the tagger was never
 * taught (no Sound Words equipped, no soundscapes equipped) says so; a kind it
 * was taught and placed nothing for says "the tagger found nothing here" in
 * those words, so a quiet chapter and a failed one never look alike.
 */

export type ChapterTaggingKind = 'Soundscape and atmosphere' | 'Sound Cues' | 'Speakers' | 'Holdings' | 'Appearances' | 'Status';

export interface ChapterTaggingKindLine {
  kind: ChapterTaggingKind;
  /** What the record shows for this kind. */
  said: string;
  /**
   * `found`: tags landed; `nothing`: the tagger was taught the kind and
   * placed none; `set-aside`: it placed some and the HARNESS kept none, for
   * the reason said; `not-asked`: the story equipped nothing of the kind.
   */
  state: 'found' | 'nothing' | 'set-aside' | 'not-asked';
}

export interface ChapterTaggingAccount {
  status: 'untagged' | 'failed' | 'tagged';
  /** The one line that says whether the chapter was read, by what, and when. */
  headline: string;
  /** Why the answer placed no tag, when the tagging failed. */
  problem?: string;
  /** The notes written and placed, when the record counted them. */
  notes?: string;
  /** One line per kind, in the order the tags read. Empty unless the chapter was read. */
  kinds: ChapterTaggingKindLine[];
  /** Every note dropped and every tag set aside, each with its reason, as the record kept them. */
  problems: string[];
}

const KIND_WARNINGS: Record<ChapterTaggingKind, ReadonlyArray<HarnessWarning['code']>> = {
  'Soundscape and atmosphere': ['soundtrack_incomplete'],
  'Sound Cues': ['sound_cue_set_aside', 'sound_tag_moved'],
  Speakers: ['speaker_tags_incomplete'],
  Holdings: ['holding_tags_incomplete'],
  Appearances: ['appearance_tags_incomplete'],
  Status: ['status_tags_incomplete'],
};

const NOTHING_HERE = 'The tagger found nothing here.';

const count = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
const few = (names: readonly string[], limit = 6) => {
  const unique = [...new Set(names)];
  return unique.length > limit ? `${unique.slice(0, limit).join(', ')} and ${unique.length - limit} more` : unique.join(', ');
};

const when = (at: string, locale?: string) => {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return at;
  try {
    return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
};

/**
 * The record of one chapter's tagging, read for the page. `entries` are the
 * story's Codex entries, so a tag written as `MC` reads by the main
 * character's own name, as the Codex knows them.
 */
export function describeChapterTagging(
  chapter: Pick<HarnessChapter, 'tagging' | 'mediaLoadout' | 'soundCues' | 'speakers' | 'holdingChanges' | 'appearances' | 'statuses' | 'scene'>,
  { entries = [], locale }: { entries?: ReadonlyArray<Pick<CodexEntry, 'id' | 'name'>>; locale?: string } = {},
): ChapterTaggingAccount {
  const nameOf = (ref: { name: string; entryId?: string } | undefined) =>
    (ref?.entryId ? entries.find(entry => entry.id === ref.entryId)?.name : undefined) ?? ref?.name ?? '';
  const record = chapter.tagging;
  if (!record) return { status: 'untagged', headline: 'Not tagged yet.', kinds: [], problems: [] };
  const warnings = record.warnings ?? [];
  const by = record.model ? ` by ${record.model}` : '';
  const usage = record.providerReceipt?.usage;
  const tokens = usage && typeof usage.inputTokens === 'number' && typeof usage.outputTokens === 'number'
    ? ` · ${usage.inputTokens.toLocaleString()} tokens in, ${usage.outputTokens.toLocaleString()} out` : '';
  const notes = record.notes
    ? `${count(record.notes.written, 'note')} written · ${record.notes.placed.toLocaleString()} placed${record.notes.written > record.notes.placed ? ` · ${(record.notes.written - record.notes.placed).toLocaleString()} dropped` : ''}`
    : undefined;
  const problems = warnings.map(warning => warning.message);
  if (record.status !== 'tagged') {
    return {
      status: 'failed', headline: `Not read${by} · ${when(record.at, locale)}${tokens}`,
      ...(record.problem ? { problem: record.problem } : {}), ...(notes ? { notes } : {}), kinds: [], problems,
    };
  }

  const setAside = (kind: ChapterTaggingKind) => warnings.find(warning => KIND_WARNINGS[kind].includes(warning.code));
  const line = (kind: ChapterTaggingKind, found: string | undefined): ChapterTaggingKindLine => {
    if (found) return { kind, said: found, state: 'found' };
    const aside = setAside(kind);
    return aside ? { kind, said: aside.message, state: 'set-aside' } : { kind, said: NOTHING_HERE, state: 'nothing' };
  };

  const soundtrack = soundtrackVocabulary(chapter.mediaLoadout);
  const scene = chapter.scene;
  const atmosphere = scene?.atmosphere
    ? (chapter.mediaLoadout.atmospheres ?? []).find(bed => bed.id === scene.atmosphere)
    : undefined;
  const sceneParts = [
    scene?.music?.category ? `Music: ${scene.music.category}` : scene?.soundscape ? `Music: ${scene.soundscape}` : '',
    atmosphere ? `Atmosphere: ${atmosphere.label ?? atmosphere.word}` : scene?.atmosphere ? `Atmosphere: ${scene.atmosphere}` : '',
  ].filter(Boolean);
  const kinds: ChapterTaggingKindLine[] = [
    soundtrack.music.length || soundtrack.atmospheres.length
      ? line('Soundscape and atmosphere', sceneParts.length ? sceneParts.join(' · ') : undefined)
      : { kind: 'Soundscape and atmosphere', said: 'No soundscapes or atmospheres were equipped, so none were asked for.', state: 'not-asked' },
    soundVocabulary(chapter.mediaLoadout).length
      ? line('Sound Cues', chapter.soundCues?.length ? `${count(chapter.soundCues.length, 'cue')}: ${few(chapter.soundCues.map(cue => cue.payload.sound))}` : undefined)
      : { kind: 'Sound Cues', said: 'No Sound Words were equipped, so no cues were asked for.', state: 'not-asked' },
    line('Speakers', chapter.speakers?.length
      ? `${count(chapter.speakers.length, 'spoken line')}: ${few(chapter.speakers.map(speaker => speaker.payload.speaker))}`
      : undefined),
    line('Holdings', chapter.holdingChanges?.length
      ? `${count(chapter.holdingChanges.length, 'change')}: ${few(chapter.holdingChanges.map(change => [change.payload.verb, nameOf(change.payload.target) || change.payload.level || ''].filter(Boolean).join(' ')))}`
      : undefined),
    line('Appearances', chapter.appearances?.length
      ? `${count(chapter.appearances.length, 'appearance')}: ${few(chapter.appearances.map(appearance => nameOf(appearance.payload.subject)))}`
      : undefined),
    // A chapter tagged before Status existed has no list at all: it was never asked.
    chapter.statuses
      ? line('Status', chapter.statuses.length
        ? `${count(chapter.statuses.length, 'status', 'statuses')}: ${few(chapter.statuses.map(status => `${nameOf(status.payload.subject)} ${status.payload.status}`))}`
        : undefined)
      : { kind: 'Status', said: 'Tagged before Status existed: tag it again to read it.', state: 'not-asked' },
  ];
  return { status: 'tagged', headline: `Read${by} · ${when(record.at, locale)}${tokens}`, ...(notes ? { notes } : {}), kinds, problems };
}

/** The kinds in the order the tags read, each with the color its marks wear on the page. */
export const CHAPTER_TAGGING_KINDS: ReadonlyArray<{ kind: ChapterTaggingKind; tone: string }> = [
  { kind: 'Soundscape and atmosphere', tone: ATTACHMENT_COLORS['soundscape-change'].tone },
  { kind: 'Sound Cues', tone: ATTACHMENT_COLORS['sound-cue'].tone },
  { kind: 'Speakers', tone: ATTACHMENT_COLORS.speaker.tone },
  { kind: 'Holdings', tone: ATTACHMENT_COLORS['holding-change'].tone },
  { kind: 'Appearances', tone: ATTACHMENT_COLORS.appearance.tone },
  { kind: 'Status', tone: ATTACHMENT_COLORS.status.tone },
];

/** The chapter's paragraphs as Highlight Engine blocks, under the ids its tags are anchored to. */
export const chapterBlocks = (chapter: Pick<HarnessChapter, 'chapterNumber' | 'paragraphs'>): TextHighlightBlock[] =>
  chapter.paragraphs.map((text, index) => ({ id: harnessParagraphBlockId(chapter.chapterNumber, index), text }));

type Spanned = { id: string; anchor: { level: string; detached?: true; blockId?: string; startOffset?: number; endOffset?: number; selectedText?: string } };

/**
 * Where the chapter's tags landed, as tints behind the prose in each kind's
 * color: every speaker line, Sound Cue, holding change and appearance on the
 * exact words the tagger named, and the chapter's soundscape and atmosphere on
 * its first word, where they begin. `shown` chooses the kinds to light.
 */
export function chapterTagMarks(
  chapter: Pick<HarnessChapter, 'chapterNumber' | 'paragraphs' | 'soundCues' | 'speakers' | 'holdingChanges' | 'appearances' | 'statuses' | 'scene'>,
  shown: ReadonlySet<ChapterTaggingKind>,
): OverlayMark[] {
  const tone = (kind: ChapterTaggingKind) => CHAPTER_TAGGING_KINDS.find(entry => entry.kind === kind)!.tone;
  const spans = (kind: ChapterTaggingKind, attachments: readonly Spanned[] | undefined): OverlayMark[] => (shown.has(kind) ? (attachments ?? []) : []).flatMap(attachment => {
    const { anchor } = attachment;
    if (anchor.level !== 'span' || anchor.detached || typeof anchor.blockId !== 'string' || typeof anchor.startOffset !== 'number' || typeof anchor.endOffset !== 'number') return [];
    return [{ id: `mark:${attachment.id}`, selection: { blockId: anchor.blockId, startOffset: anchor.startOffset, endOffset: anchor.endOffset, selectedText: anchor.selectedText ?? '' }, tone: tone(kind) }];
  });
  const marks = [
    ...spans('Sound Cues', chapter.soundCues),
    ...spans('Speakers', chapter.speakers),
    ...spans('Holdings', chapter.holdingChanges),
    ...spans('Appearances', chapter.appearances),
    ...spans('Status', chapter.statuses),
  ];
  const scene = chapter.scene;
  const first = chapter.paragraphs[0];
  if (shown.has('Soundscape and atmosphere') && scene && (scene.music || scene.soundscape || scene.atmosphere) && first) {
    const letter = first.search(/[\p{L}\p{N}]/u);
    const end = letter < 0 ? -1 : first.slice(letter).search(/[^\p{L}\p{N}'’-]/u);
    if (letter >= 0) {
      const endOffset = end < 0 ? first.length : letter + end;
      marks.unshift({ id: 'mark:scene', selection: { blockId: harnessParagraphBlockId(chapter.chapterNumber, 0), startOffset: letter, endOffset, selectedText: first.slice(letter, endOffset) }, tone: tone('Soundscape and atmosphere') });
    }
  }
  return marks;
}

/** The Chapters card's line: how many chapters, and how many of them the tagger has read. */
export function storyTaggingSummary(chapters: ReadonlyArray<Pick<HarnessChapter, 'tagging'>>): string {
  if (!chapters.length) return 'No chapters yet';
  const read = chapters.filter(chapter => chapter.tagging?.status === 'tagged').length;
  const failed = chapters.filter(chapter => chapter.tagging?.status === 'failed').length;
  const untagged = chapters.length - read - failed;
  return [
    count(chapters.length, 'chapter'),
    `${read.toLocaleString()} tagged`,
    ...(failed ? [`${failed.toLocaleString()} not read`] : []),
    ...(untagged ? [`${untagged.toLocaleString()} not tagged yet`] : []),
  ].join(' · ');
}
