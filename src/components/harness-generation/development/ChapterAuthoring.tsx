import { useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import { useOptionalReaderMixer } from '@seihouse/audio-player';
import {
  ATMOSPHERE_CHANGE_KIND, SOUNDSCAPE_CHANGE_KIND, SOUND_CUE_KIND, SOUND_CUE_RULES, createMediaCatalog, isSoundtrackChange,
  type ChapterOpeningSound, type SoundCueAttachment, type SoundtrackChangeAttachment, type SoundtrackChangeKind,
} from '@seihouse/sen/audio';
import { InlineAudioText } from '@seihouse/sen/inline-audio';
import {
  HighlightEngine, SOUNDTRACK_KIND_WORDS, WRITER_OPENING,
  applyPassageEdit, attachmentMarks, createManuscript, openingSoundMark, createManuscriptId, flaggedAttachments, placedSoundCues, removeAttachment, resolveAnchor,
  audioActions, soundtrackOptionLabel, structurePins,
  type ManuscriptAttachment, type ManuscriptState, type PassageEdit, type SoundtrackChoices, type TextHighlightBlock,
} from '@seihouse/sen/highlight-engine';
import { storySoundtrack, type ResolvedReaderText } from '@seihouse/sen/reader-runtime';
import { chapterTitleText } from '../../../narrative/chapterTitle';
import { SPEAKER_KIND, type SpeakerAttachment } from '../../../narrative/speech';
import { HOLDING_CHANGE_KIND, type HoldingChangeAttachment } from '../../../narrative/holdings';
import { APPEARANCE_KIND, type AppearanceAttachment } from '../../../narrative/appearances';
import { STATUS_KIND, type StatusAttachment } from '../../../narrative/statuses';
import { PLACE_KIND, type PlaceAttachment } from '../../../narrative/places';
import { TIE_KIND, type TieAttachment } from '../../../narrative/ties';
import { SETTING_KIND, type SettingAttachment } from '../../../narrative/settings';
import { settingLine } from '../shared/settings';
import { harnessParagraphBlockId } from '../shared/chapterBody';
import { chapterTagFindings, describeChapterTagging } from '../shared/chapterTagging';
import type { CodexEntry } from '../../../narrative/holdings';
import type { HarnessTagFocus } from '../../../narrative/generation';
import { CreateTagPanel } from './CreateTagPanel';
import { READ_ALOUD_TONE } from './ProseChapterBody';
import type { NarrationHighlight } from './useFollowNarration';
import { CREATE_TAG_GROUPS, CREATE_TAG_KINDS, createTagLine, createTagRows, litKinds, type CreateTagKind, type CreateTagLit } from './createTags';
import type { HarnessGenerationController } from '../shared/controller';
import type { ReaderChapter } from './readerChapterBody';
import './reader-colors.css';

type ChapterState = ManuscriptState<unknown>;

/**
 * Create mode's chapter as it stands on screen (edits not yet saved
 * included), for Sound Cues asked for in words. A cue added here joins the
 * page and its saves, in order, so neither can overwrite the other.
 */
export interface ChapterAuthoringHandle {
  blocks(): TextHighlightBlock[];
  soundCues(): SoundCueAttachment[];
  /** Saved with the page; rejects when its words now hold a cue, the chapter is full, or the save fails. */
  addSoundCue(cue: SoundCueAttachment): Promise<void>;
}

/** A sealed chapter is shown, never changed. */
const keepProse = () => undefined;

/** A chapter is longer than the lab's 500-word page; Create mode never limits its length. */
const NO_WORD_LIMIT = Number.POSITIVE_INFINITY;

/** The chapter as a draft page: its own paragraph ids (`c{n}-p{i}`), so every attachment stays on its words. */
function chapterState(chapter: ReaderChapter, locale: string): ChapterState {
  let paragraph = 0;
  const manuscript = createManuscript(chapter.paragraphs, {
    locale, wordLimit: NO_WORD_LIMIT,
    createId: kind => kind === 'paragraph' ? harnessParagraphBlockId(chapter.chapterNumber, paragraph++) : createManuscriptId(kind),
  });
  return { manuscript, attachments: [
    ...chapter.soundCues ?? [], ...chapter.speakers ?? [], ...chapter.holdingChanges ?? [], ...chapter.appearances ?? [], ...chapter.statuses ?? [], ...chapter.places ?? [], ...chapter.ties ?? [], ...chapter.settings ?? [], ...chapter.soundtrackChanges ?? [],
    // Effects still waiting for a new spot from an earlier visit: off the page, so flagged.
    ...chapter.authoring?.waiting ?? [],
  ] };
}

type Waiting = NonNullable<NonNullable<ReaderChapter['authoring']>['waiting']>[number];

/** What a waiting effect was: its kind, what it does, and the words it sat on. */
function describeWaiting(attachment: ManuscriptAttachment<unknown>): { title: string; detail: string } {
  const was = 'selectedText' in attachment.anchor ? `was on “${attachment.anchor.selectedText}”` : '';
  if (attachment.kind === SOUND_CUE_KIND) return { title: `Sound Cue · ${(attachment as SoundCueAttachment).payload.sound}`, detail: `${was}. Highlight its new words and place it with Media → Audio → Cue.` };
  if (isSoundtrackChange(attachment)) {
    const words = SOUNDTRACK_KIND_WORDS[attachment.kind];
    return { title: `${words.name} change`, detail: `${was}. Highlight the word where it should begin and place it again with Media → Audio → ${words.name}.` };
  }
  if (attachment.kind === SPEAKER_KIND) return { title: `Speaker · ${(attachment as SpeakerAttachment).payload.speaker}`, detail: `${was}. It waits here until the chapter is sealed.` };
  if (attachment.kind === APPEARANCE_KIND) {
    const appearance = (attachment as AppearanceAttachment).payload;
    return { title: `${appearance.event === 'appears' ? 'Appearance' : 'Change of look'} · ${appearance.subject.name}`, detail: `${was}. It waits here until the chapter is sealed.` };
  }
  if (attachment.kind === STATUS_KIND) {
    const status = (attachment as StatusAttachment).payload;
    return { title: `Status · ${status.subject.name} ${status.status}`, detail: `${was}. It waits here until the chapter is sealed.` };
  }
  if (attachment.kind === PLACE_KIND) {
    const place = (attachment as PlaceAttachment).payload;
    return { title: `Place · ${place.subject.name} at ${place.place.name}`, detail: `${was}. It waits here until the chapter is sealed.` };
  }
  if (attachment.kind === TIE_KIND) {
    const tie = (attachment as TieAttachment).payload;
    return { title: `Tie · ${tie.subject.name} and ${tie.other.name} ${tie.tie}`, detail: `${was}. It waits here until the chapter is sealed.` };
  }
  if (attachment.kind === SETTING_KIND) {
    return { title: `Setting · ${settingLine((attachment as SettingAttachment).payload)}`, detail: `${was}. It waits here until the chapter is sealed.` };
  }
  const holding = (attachment as HoldingChangeAttachment).payload;
  return { title: `Holding change · ${holding.holder.name} ${holding.verb}${holding.target ? ` ${holding.target.name}` : ''}`, detail: `${was}. It waits here until the chapter is sealed.` };
}

const placed = (state: ChapterState) => (attachment: ManuscriptAttachment<unknown>) => resolveAnchor(state.manuscript, attachment.anchor).status === 'placed';

const KIND_NAMES: Record<string, [string, string]> = {
  [SOUND_CUE_KIND]: ['Sound Cue', 'Sound Cues'], [SPEAKER_KIND]: ['speaker', 'speakers'], [HOLDING_CHANGE_KIND]: ['holding change', 'holding changes'],
  [APPEARANCE_KIND]: ['appearance', 'appearances'], [STATUS_KIND]: ['status', 'statuses'], [PLACE_KIND]: ['place tag', 'place tags'], [TIE_KIND]: ['tie', 'ties'], [SETTING_KIND]: ['setting', 'settings'],
  [SOUNDSCAPE_CHANGE_KIND]: ['soundscape change', 'soundscape changes'], [ATMOSPHERE_CHANGE_KIND]: ['atmosphere change', 'atmosphere changes'],
};

/**
 * Create mode: the creator's chapter with every tag lit, in the Reader's own
 * look, so what they see is what a reader gets (SENSEI, 2026-11-04: the
 * Chapter Tagger's page and Create mode's overlays made one). The panel above
 * the chapter holds every tag in two groups, Media and Story info; a kind
 * lights alone with the page's numbering (P2 S6), Off shows the page as a
 * reader sees it, and Tag this chapter (again) reads it again.
 *
 * On a chapter that can be changed (`editable`), highlight words to change
 * them (Edit), to place a Sound Cue, or to change the soundscape or
 * atmosphere there (Media → Audio); in the chapter's first sentence the
 * soundscape or atmosphere is its opening, locked at the start. On a sealed
 * chapter the tags show and nothing changes. Every change is saved as it is made, so there is no
 * seal step: moving on to the next chapter seals this one. An effect whose
 * words a change replaced (a cue, a speaker, a holding change or an appearance) has nothing
 * left to sit on, so it waits in "Needs a new spot" until the reader places it
 * again or removes it, or the chapter is sealed. A changed chapter is marked
 * as changed, so it is read again at its seal.
 */
export function ChapterAuthoring({ chapter, controller, locale, text, articleRef, handle, editable = true, sealedNote, entries, tagging, highlight, reading = false, lit: litFromHost, onLight }: {
  chapter: ReaderChapter;
  controller: HarnessGenerationController;
  locale: string;
  text: ResolvedReaderText;
  articleRef?: Ref<HTMLElement>;
  handle?: Ref<ChapterAuthoringHandle>;
  /** Whether the chapter can be changed here; a sealed chapter shows its tags and nothing changes. */
  editable?: boolean;
  /** Why it cannot be changed, when it cannot. */
  sealedNote?: string;
  /** The story's Codex entries, so a tag reads by the name the Codex knows. */
  entries?: readonly CodexEntry[];
  /** Tag this chapter (again); absent where this Reader cannot tag. */
  tagging?: {
    gap?: string;
    /** Reads the whole chapter again. */
    run: () => Promise<void>;
    /** Reads its media alone again (Tag media again), where the host offers it; `gap` says why it cannot, when it cannot. */
    media?: { gap?: string; run: () => Promise<void> };
    /** The host's Energy price for a read. */
    cost?: ReactNode;
  };
  /** The sentence (or title) Listen is reading, lit as in the Reader. */
  highlight?: NarrationHighlight;
  /** Whether Listen is playing or paused. */
  reading?: boolean;
  /**
   * What the page lights, when the host keeps it: then it outlives this page,
   * from chapter to chapter and through a chapter tagged again. Without it the page keeps its own.
   */
  lit?: CreateTagLit;
  onLight?: (lit: CreateTagLit) => void;
}) {
  const [state, setState] = useState<ChapterState>(() => chapterState(chapter, locale));
  // The page as last set, for a cue added in words between renders.
  const latest = useRef(state);
  latest.current = state;
  const [opening, setOpening] = useState<ChapterOpeningSound | undefined>(chapter.openingSound);
  const [ownLit, setOwnLit] = useState<CreateTagLit>('all');
  const lit = litFromHost ?? ownLit;
  const setLit = onLight ?? setOwnLit;
  const [retagging, setRetagging] = useState<'all' | 'media'>();
  // While the tagger reads the chapter the controller refuses saves, and its new tags replace this page:
  // nothing on it changes until the tagging is done, so no edit is made only to be lost.
  const retaggingNow = useRef(false);
  const changeable = editable && !retagging;
  const [tagProblem, setTagProblem] = useState<string>();
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState<'saved' | 'saving' | 'failed'>('saved');
  const saves = useRef<Promise<void>>(Promise.resolve());
  // Cues added in words whose save failed: asking again saves the page rather than refusing them as overlaps.
  const unsaved = useRef(new Set<string>());
  // The recordings the chapter was written with; where its frozen catalog holds none, the story's media now.
  const catalog = useMemo(() => createMediaCatalog(chapter.mediaLoadout.soundCues.length
    ? chapter.mediaLoadout : controller.describeStoryMedia(chapter.storyId) ?? chapter.mediaLoadout), [chapter.mediaLoadout, chapter.storyId, controller]);
  /** The chapter's opening music or atmosphere: the writer's (cleared) or one the reader chose. */
  const chooseOpening = (kind: SoundtrackChangeKind, id: string) => {
    if (retaggingNow.current) return;
    const next: ChapterOpeningSound = { ...opening };
    if (kind === SOUNDSCAPE_CHANGE_KIND) { if (id === WRITER_OPENING) delete next.soundscape; else next.soundscape = { pieceId: id }; }
    else if (id === WRITER_OPENING) delete next.atmosphere; else next.atmosphere = { atmosphereId: id };
    const kept = next.soundscape || next.atmosphere ? next : undefined;
    setOpening(kept);
    save(state, kept);
  };
  const writerLabel = (kind: SoundtrackChangeKind, choices: SoundtrackChoices) => {
    const music = chapter.scene?.music;
    const chosen = kind === SOUNDSCAPE_CHANGE_KIND
      ? (music ? [music.category, music.tone, music.tension, music.energy].filter(Boolean).join(' · ') : chapter.scene?.soundscape)
      : chapter.scene?.atmosphere && soundtrackOptionLabel(kind, chapter.scene.atmosphere, choices);
    return chosen ? `The writer's choice: ${chosen}` : 'The writer\'s choice (none: the one before goes on)';
  };
  // The music and atmospheres the chapter was written with, each heard through the reader mixer before it is chosen.
  const mixer = useOptionalReaderMixer();
  const soundtrack = useMemo((): SoundtrackChoices => ({
    pieces: chapter.mediaLoadout.soundscapes.map(entry => entry.track),
    atmospheres: chapter.mediaLoadout.atmospheres ?? [],
    ...(mixer ? { preview: option => {
      if (option.kind === SOUNDSCAPE_CHANGE_KIND) {
        const piece = chapter.mediaLoadout.soundscapes.find(entry => entry.track.id === option.id)?.track;
        return piece ? storySoundtrack(mixer).hold({ piece }) : undefined;
      }
      if (!mixer.getAtmosphereOptions().some(entry => entry.id === option.id)) return undefined;
      const before = mixer.getPreferences().atmosphereId;
      mixer.setAtmosphere(option.id);
      return () => { if (before) mixer.setAtmosphere(before); };
    } } : {}),
  }), [chapter.mediaLoadout, mixer]);
  const choices = useMemo((): SoundtrackChoices => ({
    ...soundtrack,
    opening: {
      chosen: kind => kind === SOUNDSCAPE_CHANGE_KIND ? opening?.soundscape?.pieceId : opening?.atmosphere?.atmosphereId,
      writer: kind => writerLabel(kind, soundtrack),
      choose: chooseOpening,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chooseOpening saves the page as it stands
  }), [soundtrack, opening, state]);

  /** Saves the page as it stands now; effects whose words are gone wait for a new spot, and the reader is told which. */
  const save = (next: ChapterState, nextOpening = opening) => {
    const kept = next.attachments.filter(placed(next));
    const waiting = flaggedAttachments(next);
    const newlyWaiting = waiting.filter(attachment => !flaggedAttachments(state).some(earlier => earlier.id === attachment.id));
    if (newlyWaiting.length) {
      const counts = new Map<string, number>();
      for (const attachment of newlyWaiting) counts.set(attachment.kind, (counts.get(attachment.kind) ?? 0) + 1);
      const list = [...counts].map(([kind, count]) => `${count} ${KIND_NAMES[kind]?.[count === 1 ? 0 : 1] ?? 'effect'}`).join(', ');
      setNotice(`Your change replaced the words ${list} sat on. ${newlyWaiting.length === 1 ? 'It waits' : 'They wait'} under Needs a new spot.`);
    }
    setSaving('saving');
    const saved = saves.current.then(() => controller.authorChapter(chapter.id, {
      paragraphs: next.manuscript.paragraphs.map(paragraph => paragraph.text),
      soundCues: kept.filter(attachment => attachment.kind === SOUND_CUE_KIND) as SoundCueAttachment[],
      speakers: kept.filter(attachment => attachment.kind === SPEAKER_KIND) as SpeakerAttachment[],
      holdingChanges: kept.filter(attachment => attachment.kind === HOLDING_CHANGE_KIND) as HoldingChangeAttachment[],
      appearances: kept.filter(attachment => attachment.kind === APPEARANCE_KIND) as AppearanceAttachment[],
      statuses: kept.filter(attachment => attachment.kind === STATUS_KIND) as StatusAttachment[],
      places: kept.filter(attachment => attachment.kind === PLACE_KIND) as PlaceAttachment[],
      ties: kept.filter(attachment => attachment.kind === TIE_KIND) as TieAttachment[],
      settings: kept.filter(attachment => attachment.kind === SETTING_KIND) as SettingAttachment[],
      soundtrackChanges: kept.filter(isSoundtrackChange) as SoundtrackChangeAttachment[],
      openingSound: nextOpening,
      waiting: waiting as Waiting[],
    }));
    saves.current = saved.then(() => { unsaved.current.clear(); setSaving('saved'); }, error => {
      setSaving('failed');
      setNotice(error instanceof Error ? error.message : 'Your change could not be saved.');
    });
    return saved;
  };
  useImperativeHandle(handle, () => ({
    blocks: () => latest.current.manuscript.paragraphs.map(paragraph => ({ id: paragraph.id, text: paragraph.text })),
    soundCues: () => placedSoundCues(latest.current),
    addSoundCue: cue => {
      if (retaggingNow.current) return Promise.reject(new Error('Wait until the chapter is tagged before adding sounds.'));
      const current = latest.current;
      // Reviewed before an edit: its words must still be exactly where they were, or it is asked for again.
      const paragraph = current.manuscript.paragraphs.find(entry => entry.id === cue.anchor.blockId);
      if (paragraph?.text.slice(cue.anchor.startOffset, cue.anchor.endOffset) !== cue.anchor.selectedText) {
        return Promise.reject(new Error(`“${cue.anchor.selectedText}” changed after you reviewed it. Ask for the sound again.`));
      }
      const keep = (saved: Promise<void>) => { saved.catch(() => unsaved.current.add(cue.id)); return saved; };
      if (unsaved.current.has(cue.id) && current.attachments.some(attachment => attachment.id === cue.id)) return keep(save(current));
      const cues = placedSoundCues(current);
      if (cues.length >= SOUND_CUE_RULES.maxPerChapter) return Promise.reject(new Error(`This chapter already has ${SOUND_CUE_RULES.maxPerChapter} Sound Cues, the most a chapter holds.`));
      const { blockId, startOffset, endOffset } = cue.anchor;
      if (cues.some(other => other.anchor.blockId === blockId && startOffset < other.anchor.endOffset && endOffset > other.anchor.startOffset)) {
        return Promise.reject(new Error(`“${cue.anchor.selectedText}” already has a Sound Cue on some of its words.`));
      }
      const next = { ...current, attachments: [...current.attachments, cue] };
      latest.current = next;
      setState(next);
      return keep(save(next));
    },
  }));
  const update = (change: (current: ChapterState) => ChapterState) => {
    if (retaggingNow.current) return;
    const next = change(state);
    if (next === state) return;
    setState(next);
    save(next);
  };
  const edit = (_blocks: unknown, change: PassageEdit) => {
    if (change.after.text.trim() === '') { setNotice('A paragraph keeps at least a few words.'); return; }
    const result = applyPassageEdit(state, change, { wordLimit: NO_WORD_LIMIT });
    if (!result.ok) { setNotice('That change no longer matches the page, so it was not saved.'); return; }
    setNotice(null);
    update(() => result.state);
  };
  const { actions, removeActions } = audioActions({ state, update, catalog, onNotice: setNotice, soundtrack: choices });
  // The Soundscapes and Atmospheres overlays mark where the opening begins: the reader's own, or the writer's.
  const opens = { [SOUNDSCAPE_CHANGE_KIND]: Boolean(opening?.soundscape ?? chapter.scene?.music ?? chapter.scene?.soundscape), [ATMOSPHERE_CHANGE_KIND]: Boolean(opening?.atmosphere ?? chapter.scene?.atmosphere) };
  // The sentence Listen is reading stays lit in Create mode, as in the Reader, tags shown or hidden.
  const spoken = reading && highlight && highlight !== 'title' ? { id: 'read-aloud', selection: highlight, tone: READ_ALOUD_TONE } : undefined;
  const tags = useMemo(() => {
    if (lit === 'off') return undefined;
    const kinds = litKinds(lit);
    const starts = ([['soundscape', SOUNDSCAPE_CHANGE_KIND], ['atmosphere', ATMOSPHERE_CHANGE_KIND]] as const)
      .flatMap(([kind, change]) => kinds.includes(kind) && opens[change] ? [openingSoundMark(state.manuscript, change)].filter(mark => mark !== undefined) : []);
    // One kind alone shows the page's numbering, the way the model addresses it.
    // Each group in its own style (Media as highlights, Story info as underlines), each kind with its own line (Status dotted).
    const marks = CREATE_TAG_GROUPS.flatMap(group => group.kinds.filter(kind => kinds.includes(kind)).flatMap(kind =>
      attachmentMarks(state, [CREATE_TAG_KINDS[kind].attachment], { style: group.style, line: createTagLine(kind) })));
    return { marks: [...starts, ...marks], ...(kinds.length === 1 ? { pins: structurePins(state.manuscript) } : {}) };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- opens is read from the chapter and its opening, both deps through state and opening
  }, [lit, state, opening]);
  const overlay = useMemo(() => !spoken ? tags : { ...tags, marks: [spoken, ...tags?.marks ?? []] },
  // eslint-disable-next-line react-hooks/exhaustive-deps -- spoken is rebuilt from highlight and reading
    [tags, reading, highlight]);
  const cues = useMemo(() => placedSoundCues(state), [state]);
  // Every tag on the page as it stands (edits included), each kind counted and said.
  const account = useMemo(() => describeChapterTagging(chapter, { entries, locale }), [chapter, entries, locale]);
  const rows = useMemo(() => {
    const on = (kind: string) => state.attachments.filter(attachment => attachment.kind === kind && placed(state)(attachment));
    const live = {
      ...chapter, soundCues: on(SOUND_CUE_KIND) as SoundCueAttachment[], speakers: on(SPEAKER_KIND) as SpeakerAttachment[],
      holdingChanges: on(HOLDING_CHANGE_KIND) as HoldingChangeAttachment[], appearances: on(APPEARANCE_KIND) as AppearanceAttachment[],
      statuses: chapter.statuses ? on(STATUS_KIND) as StatusAttachment[] : undefined,
      places: chapter.places ? on(PLACE_KIND) as PlaceAttachment[] : undefined,
      ties: chapter.ties ? on(TIE_KIND) as TieAttachment[] : undefined,
      settings: chapter.settings ? on(SETTING_KIND) as SettingAttachment[] : undefined,
    };
    const findings = chapterTagFindings(live, { entries });
    const changes = (kind: SoundtrackChangeKind) => on(kind).length;
    const soundtrackSaid = (kind: SoundtrackChangeKind, chosen: string | undefined, writer: string | undefined) => {
      const base = chosen ? soundtrackOptionLabel(kind, chosen, soundtrack) : writer;
      const changed = changes(kind);
      const parts = [base, changed ? `${changed === 1 ? 'changes once' : `changes ${changed} times`} in the chapter` : undefined].filter(Boolean);
      return parts.length ? parts.join(' · ') : undefined;
    };
    findings.music = soundtrackSaid(SOUNDSCAPE_CHANGE_KIND, opening?.soundscape?.pieceId, findings.music);
    findings.atmosphere = soundtrackSaid(ATMOSPHERE_CHANGE_KIND, opening?.atmosphere?.atmosphereId, findings.atmosphere);
    const counts: Record<CreateTagKind, number> = {
      soundscape: (opens[SOUNDSCAPE_CHANGE_KIND] ? 1 : 0) + changes(SOUNDSCAPE_CHANGE_KIND),
      atmosphere: (opens[ATMOSPHERE_CHANGE_KIND] ? 1 : 0) + changes(ATMOSPHERE_CHANGE_KIND),
      cues: live.soundCues.length, speakers: live.speakers.length, holdings: live.holdingChanges.length,
      appearances: live.appearances.length, status: live.statuses?.length ?? 0, place: live.places?.length ?? 0, ties: live.ties?.length ?? 0, setting: live.settings?.length ?? 0,
    };
    return createTagRows({ counts, findings, account });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- opens is read from the chapter and its opening
  }, [state, chapter, entries, opening, soundtrack, account]);
  const read = (focus?: HarnessTagFocus) => async () => {
    if (!tagging) return;
    retaggingNow.current = true;
    setRetagging(focus ?? 'all');
    setTagProblem(undefined);
    try {
      await (focus === 'media' ? tagging.media!.run() : tagging.run());
    } catch (error) {
      setTagProblem(error instanceof Error ? error.message : 'The chapter could not be tagged.');
    } finally {
      retaggingNow.current = false;
      setRetagging(undefined);
    }
  };
  const tag = tagging && !tagging.gap ? read() : undefined;
  const tagMedia = tagging?.media && !tagging.media.gap ? read('media') : undefined;
  const prose = useMemo((): CSSProperties => ({
    fontFamily: text.font.family, fontSize: `calc(${text.fontSize} * var(--reader-scale, 1))`, fontWeight: text.fontWeight,
    fontSynthesis: 'none', fontKerning: 'normal', '--sen-text-line-height': text.lineHeight,
  } as CSSProperties), [text]);

  return <article ref={articleRef} className="mx-auto mt-6 max-w-[var(--reader-measure,34em)]" style={prose} data-chapter-number={chapter.chapterNumber}
    data-testid="chapter-authoring" lang={locale} aria-labelledby={`harness-reader-chapter-${chapter.chapterNumber}`}>
    <CreateTagPanel rows={rows} lit={lit} onLight={setLit} saving={saving} editable={editable} sealedNote={sealedNote} account={account}
      tagging={(tag || tagMedia) && {
        busy: retagging, disabled: saving !== 'saved', problem: tagProblem, cost: tagging?.cost,
        // A chapter whose whole read is refused may still have its media read on its own, and the other way round.
        onTag: () => { if (tag) void tag(); else setTagProblem(tagging?.gap); },
        ...(tagMedia ? { onTagMedia: () => void tagMedia() } : {}),
      }}>
      {/* A chapter may have no Sound Cues, but where there should be some their absence is loud: say so here, never in the Reader. */}
      {editable && cues.length === 0 && <p role="status" className="rounded-lg border border-(--reader-warning-bright)/25 bg-(--reader-warning)/[0.06] px-3 py-2 text-xs leading-relaxed text-(--reader-warning-pale)" data-testid="create-mode-no-cues">
        This chapter has no Sound Cues. Where a sound happens, highlight its words and choose Media → Audio → Cue.
      </p>}
      {notice && <p role="alert" className="rounded-lg border border-(--reader-light)/10 bg-(--reader-surface-raised)/70 px-3 py-2 text-xs text-(--reader-warning-pale)">{notice}</p>}
      {editable && flaggedAttachments(state).length > 0 && <section aria-labelledby="create-mode-waiting" className="space-y-2" data-testid="create-mode-waiting">
        <h2 id="create-mode-waiting" className="text-xs font-semibold uppercase tracking-[0.14em] text-(--reader-text-muted)">Needs a new spot</h2>
        <ul className="space-y-2">
          {flaggedAttachments(state).map(attachment => {
            const { title, detail } = describeWaiting(attachment);
            return <li key={attachment.id} className="flex items-start justify-between gap-3 rounded-lg border border-(--reader-light)/10 bg-(--reader-surface-raised)/50 px-3 py-2">
              <span className="min-w-0 text-xs leading-relaxed"><span className="block font-medium text-(--reader-text)">{title}</span><span className="text-(--reader-text-dim)">{detail}</span></span>
              <button type="button" disabled={Boolean(retagging)} onClick={() => update(current => removeAttachment(current, attachment.id))}
                className="min-h-11 shrink-0 rounded-lg border border-(--reader-light)/15 px-3 text-xs text-(--reader-text-soft) hover:bg-(--reader-light)/10">Remove</button>
            </li>;
          })}
        </ul>
      </section>}
    </CreateTagPanel>
    <p className="font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-(--reader-text-faint)">Chapter {chapter.chapterNumber}</p>
    <h1 id={`harness-reader-chapter-${chapter.chapterNumber}`} data-read-aloud-title="" data-speaking={reading && highlight === 'title' ? '' : undefined}
      style={{ fontFamily: text.titleFont.family }}
      className={`mt-1 rounded text-[length:calc(1.5rem*var(--reader-scale,1))] font-normal text-(--reader-light) transition-colors sm:text-[length:calc(1.875rem*var(--reader-scale,1))] ${reading && highlight === 'title' ? 'bg-(--reader-accent-bright)/15' : ''}`}>{chapterTitleText(chapter.title) || chapter.title}</h1>
    {/* A quiet gutter on phones gives the overlay's ¶ numbers room, so turning an overlay on never moves a word. */}
    <div className="ps-3 sm:ps-0">
      <HighlightEngine blocks={state.manuscript.paragraphs} onBlocksChange={changeable ? edit : keepProse}
        {...changeable ? { actions, removeActions } : {}} editable={changeable} overlay={overlay} locale={locale} className="mt-6 text-(--reader-text-soft)"
        renderBlockText={block => {
          const blockCues = cues.filter(cue => cue.anchor.blockId === block.id);
          return blockCues.length ? <InlineAudioText text={block.text} cues={blockCues} renderText={words => words} /> : block.text;
        }} />
    </div>
  </article>;
}
