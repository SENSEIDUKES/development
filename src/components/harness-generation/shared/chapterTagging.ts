import { soundVocabulary } from '../../../audio/media';
import { soundtrackVocabulary } from '../../../audio/soundtrackVocabulary';
import type { CodexEntry } from '../../../narrative/holdings';
import type { HarnessChapter, HarnessWarning } from '../../../narrative/generation';

/**
 * A chapter's tagging record, in words for the page (SENSEI, 2026-10-29,
 * `docs/create-hub.md` phase B and decision 4): whether the tagger read the
 * chapter, by which model and when, how many notes it wrote and how many
 * landed, and then one line per kind of tag. A kind the tagger was never
 * taught (no Sound Words equipped, no soundscapes equipped) says so; a kind it
 * was taught and placed nothing for says "the tagger found nothing here" in
 * those words, so a quiet chapter and a failed one never look alike.
 */

export type ChapterTaggingKind = 'Soundscape and atmosphere' | 'Sound Cues' | 'Speakers' | 'Holdings' | 'Appearances' | 'Status' | 'Place';

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
  Place: ['place_tags_incomplete'],
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
 * What a chapter carries now, one line per kind, in words for the page: its
 * opening music and atmosphere, then its Sound Cues, speakers, holding
 * changes, appearances, statuses and place tags, each counted and named. A kind with
 * nothing on the page has no line. `entries` are the story's Codex entries,
 * so a tag written as `MC` reads by the main character's own name.
 */
export interface ChapterTagFindings {
  music?: string;
  atmosphere?: string;
  cues?: string;
  speakers?: string;
  holdings?: string;
  appearances?: string;
  statuses?: string;
  places?: string;
}

export function chapterTagFindings(
  chapter: Pick<HarnessChapter, 'mediaLoadout' | 'soundCues' | 'speakers' | 'holdingChanges' | 'appearances' | 'statuses' | 'places' | 'scene'>,
  { entries = [] }: { entries?: ReadonlyArray<Pick<CodexEntry, 'id' | 'name'>> } = {},
): ChapterTagFindings {
  const nameOf = (ref: { name: string; entryId?: string } | undefined) =>
    (ref?.entryId ? entries.find(entry => entry.id === ref.entryId)?.name : undefined) ?? ref?.name ?? '';
  const scene = chapter.scene;
  const atmosphere = scene?.atmosphere
    ? (chapter.mediaLoadout.atmospheres ?? []).find(bed => bed.id === scene.atmosphere)
    : undefined;
  const findings: ChapterTagFindings = {};
  const music = scene?.music?.category || scene?.soundscape;
  if (music) findings.music = music;
  if (scene?.atmosphere) findings.atmosphere = atmosphere ? atmosphere.label ?? atmosphere.word : scene.atmosphere;
  if (chapter.soundCues?.length) findings.cues = `${count(chapter.soundCues.length, 'cue')}: ${few(chapter.soundCues.map(cue => cue.payload.sound))}`;
  if (chapter.speakers?.length) findings.speakers = `${count(chapter.speakers.length, 'spoken line')}: ${few(chapter.speakers.map(speaker => speaker.payload.speaker))}`;
  if (chapter.holdingChanges?.length) {
    findings.holdings = `${count(chapter.holdingChanges.length, 'change')}: ${few(chapter.holdingChanges.map(change => [change.payload.verb, nameOf(change.payload.target) || change.payload.level || ''].filter(Boolean).join(' ')))}`;
  }
  if (chapter.appearances?.length) findings.appearances = `${count(chapter.appearances.length, 'appearance')}: ${few(chapter.appearances.map(appearance => nameOf(appearance.payload.subject)))}`;
  if (chapter.statuses?.length) {
    findings.statuses = `${count(chapter.statuses.length, 'status', 'statuses')}: ${few(chapter.statuses.map(status => `${nameOf(status.payload.subject)} ${status.payload.status}`))}`;
  }
  if (chapter.places?.length) {
    findings.places = `${count(chapter.places.length, 'place tag')}: ${few(chapter.places.map(record => `${nameOf(record.payload.subject)} at ${nameOf(record.payload.place)}`))}`;
  }
  return findings;
}

/**
 * The record of one chapter's tagging, read for the page. `entries` are the
 * story's Codex entries, so a tag written as `MC` reads by the main
 * character's own name, as the Codex knows them.
 */
export function describeChapterTagging(
  chapter: Pick<HarnessChapter, 'tagging' | 'mediaLoadout' | 'soundCues' | 'speakers' | 'holdingChanges' | 'appearances' | 'statuses' | 'places' | 'scene'>,
  { entries = [], locale }: { entries?: ReadonlyArray<Pick<CodexEntry, 'id' | 'name'>>; locale?: string } = {},
): ChapterTaggingAccount {
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
  const found = chapterTagFindings(chapter, { entries });
  const sceneParts = [found.music ? `Music: ${found.music}` : '', found.atmosphere ? `Atmosphere: ${found.atmosphere}` : ''].filter(Boolean);
  const kinds: ChapterTaggingKindLine[] = [
    soundtrack.music.length || soundtrack.atmospheres.length
      ? line('Soundscape and atmosphere', sceneParts.length ? sceneParts.join(' · ') : undefined)
      : { kind: 'Soundscape and atmosphere', said: 'No soundscapes or atmospheres were equipped, so none were asked for.', state: 'not-asked' },
    soundVocabulary(chapter.mediaLoadout).length
      ? line('Sound Cues', found.cues)
      : { kind: 'Sound Cues', said: 'No Sound Words were equipped, so no cues were asked for.', state: 'not-asked' },
    line('Speakers', found.speakers),
    line('Holdings', found.holdings),
    line('Appearances', found.appearances),
    // A chapter tagged before Status existed has no list at all: it was never asked.
    chapter.statuses
      ? line('Status', found.statuses)
      : { kind: 'Status', said: 'Tagged before Status existed: tag it again to read it.', state: 'not-asked' },
    // Likewise for Place.
    chapter.places
      ? line('Place', found.places)
      : { kind: 'Place', said: 'Tagged before Place existed: tag it again to read it.', state: 'not-asked' },
  ];
  // A media-only read since (Tag media again) is said after the full read it joined.
  const media = record.media ? ` · media read again${record.media.model ? ` by ${record.media.model}` : ''} · ${when(record.media.at, locale)}` : '';
  return { status: 'tagged', headline: `Read${by} · ${when(record.at, locale)}${tokens}${media}`, ...(notes ? { notes } : {}), kinds, problems };
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
