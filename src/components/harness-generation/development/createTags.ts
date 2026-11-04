import { ATMOSPHERE_CHANGE_KIND, SOUNDSCAPE_CHANGE_KIND, SOUND_CUE_KIND } from '@seihouse/sen/audio';
import { ATTACHMENT_COLORS } from '@seihouse/sen/highlight-engine';
import { SPEAKER_KIND } from '../../../narrative/speech';
import { HOLDING_CHANGE_KIND } from '../../../narrative/holdings';
import { APPEARANCE_KIND } from '../../../narrative/appearances';
import { STATUS_KIND } from '../../../narrative/statuses';
import type { ChapterTaggingAccount, ChapterTaggingKind, ChapterTagFindings } from '../shared/chapterTagging';

/**
 * Create mode's tags (SENSEI, 2026-11-04): the Chapter Tagger's page and Create
 * mode's overlays made one. Every tag on the chapter in two groups, Media
 * (what the reader hears) and Story info (what the Codex is built from), one
 * color per kind. The page opens with every tag lit; a kind lights alone, the
 * way an overlay shows one kind; Off is the page as a reader sees it.
 */

export type CreateTagKind = 'soundscape' | 'atmosphere' | 'cues' | 'speakers' | 'holdings' | 'appearances' | 'status';
export type CreateTagGroupId = 'media' | 'info';
/** What the page lights: every tag, none, or one kind. */
export type CreateTagLit = 'all' | 'off' | CreateTagKind;

export const CREATE_TAG_KINDS: Readonly<Record<CreateTagKind, { label: string; attachment: string; tagger: ChapterTaggingKind; finding: keyof ChapterTagFindings }>> = {
  soundscape: { label: 'Soundscape', attachment: SOUNDSCAPE_CHANGE_KIND, tagger: 'Soundscape and atmosphere', finding: 'music' },
  atmosphere: { label: 'Atmosphere', attachment: ATMOSPHERE_CHANGE_KIND, tagger: 'Soundscape and atmosphere', finding: 'atmosphere' },
  cues: { label: 'Sound Cues', attachment: SOUND_CUE_KIND, tagger: 'Sound Cues', finding: 'cues' },
  speakers: { label: 'Speakers', attachment: SPEAKER_KIND, tagger: 'Speakers', finding: 'speakers' },
  holdings: { label: 'Holdings', attachment: HOLDING_CHANGE_KIND, tagger: 'Holdings', finding: 'holdings' },
  appearances: { label: 'Appearances', attachment: APPEARANCE_KIND, tagger: 'Appearances', finding: 'appearances' },
  status: { label: 'Status', attachment: STATUS_KIND, tagger: 'Status', finding: 'statuses' },
};

export const CREATE_TAG_GROUPS: ReadonlyArray<{ id: CreateTagGroupId; label: string; kinds: readonly CreateTagKind[] }> = [
  { id: 'media', label: 'Media', kinds: ['soundscape', 'atmosphere', 'cues'] },
  { id: 'info', label: 'Story info', kinds: ['speakers', 'holdings', 'appearances', 'status'] },
];

/** The color a kind's marks wear on the page. */
export const createTagTone = (kind: CreateTagKind) => ATTACHMENT_COLORS[CREATE_TAG_KINDS[kind].attachment].tone;

/** The kinds a choice lights, in the page's order. */
export function litKinds(lit: CreateTagLit): CreateTagKind[] {
  if (lit === 'off') return [];
  if (lit === 'all') return CREATE_TAG_GROUPS.flatMap(group => group.kinds);
  return [lit];
}

/** Tapping what is already lit alone goes back to every tag; anything else lights alone. */
export const nextLit = (current: CreateTagLit, tapped: CreateTagLit): CreateTagLit => (current === tapped ? 'all' : tapped);

export interface CreateTagRow {
  kind: CreateTagKind;
  /** How many marks of the kind are on the page. */
  count: number;
  /** What the kind holds, in words: what is on the page, or why nothing is. */
  said: string;
  found: boolean;
}

/**
 * One row per kind: what the chapter holds now (`findings`, read from the
 * page as it stands, edits included), or, where it holds nothing, what the
 * tagger's record says about that kind: found nothing, nothing equipped, or
 * set aside for a reason.
 */
export function createTagRows({ counts, findings, account }: {
  counts: Readonly<Record<CreateTagKind, number>>;
  findings: ChapterTagFindings;
  account: ChapterTaggingAccount;
}): CreateTagRow[] {
  return CREATE_TAG_GROUPS.flatMap(group => group.kinds).map(kind => {
    const { finding, tagger } = CREATE_TAG_KINDS[kind];
    const said = findings[finding];
    if (said) return { kind, count: counts[kind], said, found: true };
    const line = account.kinds.find(entry => entry.kind === tagger);
    const quiet = account.status === 'untagged' ? 'Not tagged yet'
      : account.status === 'failed' ? 'The tagger could not read this chapter'
      : line?.state === 'not-asked' ? 'Nothing equipped'
      : line?.state === 'set-aside' ? line.said
      : 'Nothing found';
    return { kind, count: counts[kind], said: quiet, found: counts[kind] > 0 };
  });
}
