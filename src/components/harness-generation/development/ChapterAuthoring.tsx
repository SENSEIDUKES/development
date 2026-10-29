import { useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type Ref } from 'react';
import { useOptionalReaderMixer } from '@seihouse/audio-player';
import {
  ATMOSPHERE_CHANGE_KIND, SOUNDSCAPE_CHANGE_KIND, SOUND_CUE_KIND, SOUND_CUE_RULES, createMediaCatalog, isSoundtrackChange,
  type ChapterOpeningSound, type SoundCueAttachment, type SoundtrackChangeAttachment, type SoundtrackChangeKind,
} from '@seihouse/sen/audio';
import { InlineAudioText } from '@seihouse/sen/inline-audio';
import {
  ManuscriptOverlaySwitch, OVERLAY_KINDS, OVERLAY_SOUNDTRACK_KIND, HighlightEngine, SOUNDTRACK_KIND_WORDS, WRITER_OPENING,
  applyPassageEdit, attachmentMarks, createManuscript, openingSoundMark, createManuscriptId, flaggedAttachments, placedSoundCues, removeAttachment, resolveAnchor,
  audioActions, soundtrackOptionLabel, structurePins,
  type ManuscriptAttachment, type ManuscriptOverlayMode, type ManuscriptState, type PassageEdit, type SoundtrackChoices, type TextHighlightBlock,
} from '@seihouse/sen/highlight-engine';
import { storySoundtrack, type ResolvedReaderText } from '@seihouse/sen/reader-runtime';
import { chapterTitleText } from '../../../narrative/chapterTitle';
import { SPEAKER_KIND, type SpeakerAttachment } from '../../../narrative/speech';
import { HOLDING_CHANGE_KIND, type HoldingChangeAttachment } from '../../../narrative/holdings';
import { APPEARANCE_KIND, type AppearanceAttachment } from '../../../narrative/appearances';
import { harnessParagraphBlockId } from '../shared/chapterBody';
import type { HarnessGenerationController } from '../shared/controller';
import type { ReaderChapter } from './readerChapterBody';

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
    ...chapter.soundCues ?? [], ...chapter.speakers ?? [], ...chapter.holdingChanges ?? [], ...chapter.appearances ?? [], ...chapter.soundtrackChanges ?? [],
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
  const holding = (attachment as HoldingChangeAttachment).payload;
  return { title: `Holding change · ${holding.holder.name} ${holding.verb}${holding.target ? ` ${holding.target.name}` : ''}`, detail: `${was}. It waits here until the chapter is sealed.` };
}

const placed = (state: ChapterState) => (attachment: ManuscriptAttachment<unknown>) => resolveAnchor(state.manuscript, attachment.anchor).status === 'placed';

const KIND_NAMES: Record<string, [string, string]> = {
  [SOUND_CUE_KIND]: ['Sound Cue', 'Sound Cues'], [SPEAKER_KIND]: ['speaker', 'speakers'], [HOLDING_CHANGE_KIND]: ['holding change', 'holding changes'],
  [APPEARANCE_KIND]: ['appearance', 'appearances'],
  [SOUNDSCAPE_CHANGE_KIND]: ['soundscape change', 'soundscape changes'], [ATMOSPHERE_CHANGE_KIND]: ['atmosphere change', 'atmosphere changes'],
};

/**
 * Create mode: the reader authors the chapter in place, on the Highlight
 * Engine with its overlays. Highlight words to change them (Edit), to place a
 * Sound Cue, or to change the soundscape or atmosphere there (Media → Audio);
 * in the chapter's first sentence the soundscape or atmosphere is its opening,
 * locked at the start. The Overlays switch shows one kind at a time (Sound
 * Cues, Soundscapes or Atmospheres) and the page's numbering (P2 S6). Every change is saved as it is made, so there is no
 * seal step: moving on to the next chapter seals this one. An effect whose
 * words a change replaced (a cue, a speaker, a holding change or an appearance) has nothing
 * left to sit on, so it waits in "Needs a new spot" until the reader places it
 * again or removes it, or the chapter is sealed. A changed chapter is marked
 * as changed, so it is read again at its seal.
 */
export function ChapterAuthoring({ chapter, controller, locale, text, articleRef, handle }: {
  chapter: ReaderChapter;
  controller: HarnessGenerationController;
  locale: string;
  text: ResolvedReaderText;
  articleRef?: Ref<HTMLElement>;
  handle?: Ref<ChapterAuthoringHandle>;
}) {
  const [state, setState] = useState<ChapterState>(() => chapterState(chapter, locale));
  // The page as last set, for a cue added in words between renders.
  const latest = useRef(state);
  latest.current = state;
  const [opening, setOpening] = useState<ChapterOpeningSound | undefined>(chapter.openingSound);
  const [overlayMode, setOverlayMode] = useState<ManuscriptOverlayMode>('cues');
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
  const opensWith = OVERLAY_SOUNDTRACK_KIND[overlayMode];
  const showsOpening = Boolean(opensWith && opens[opensWith]);
  const overlay = useMemo(() => {
    if (overlayMode === 'off') return undefined;
    const start = showsOpening && opensWith ? openingSoundMark(state.manuscript, opensWith) : undefined;
    return { marks: [...start ? [start] : [], ...attachmentMarks(state, OVERLAY_KINDS[overlayMode])], pins: structurePins(state.manuscript) };
  }, [overlayMode, state, opensWith, showsOpening]);
  const cues = useMemo(() => placedSoundCues(state), [state]);
  const prose = useMemo((): CSSProperties => ({
    fontFamily: text.font.family, fontSize: `calc(${text.fontSize} * var(--reader-scale, 1))`, fontWeight: text.fontWeight,
    fontSynthesis: 'none', fontKerning: 'normal', '--sen-text-line-height': text.lineHeight,
  } as CSSProperties), [text]);

  return <article ref={articleRef} className="mx-auto mt-6 max-w-[var(--reader-measure,34em)]" style={prose} data-chapter-number={chapter.chapterNumber}
    data-testid="chapter-authoring" lang={locale} aria-labelledby={`harness-reader-chapter-${chapter.chapterNumber}`}>
    <div className="mb-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 font-sans text-sm" data-testid="create-mode-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-neutral-100">Create mode</p>
        <p role="status" className="text-xs text-neutral-400" data-testid="create-mode-saving">
          {saving === 'saving' ? 'Saving…' : saving === 'failed' ? 'Not saved' : 'Saved'}
        </p>
      </div>
      <p className="text-xs leading-relaxed text-neutral-400">Hold a word or drag to select, then choose Edit, Copy or Media. Media places a Sound Cue or changes the soundscape or atmosphere there; in the first sentence, it chooses how the chapter opens. Changes save as you make them; moving on to the next chapter seals this one.</p>
      <ManuscriptOverlaySwitch mode={overlayMode} onChange={setOverlayMode} overlay={overlay} />
      {/* A chapter may have no Sound Cues, but where there should be some their absence is loud: say so here, never in the Reader. */}
      {cues.length === 0 && <p role="status" className="rounded-lg border border-amber-300/25 bg-amber-400/[0.06] px-3 py-2 text-xs leading-relaxed text-amber-100" data-testid="create-mode-no-cues">
        This chapter has no Sound Cues. Where a sound happens, highlight its words and choose Media → Audio → Cue.
      </p>}
      {notice && <p role="alert" className="rounded-lg border border-white/10 bg-neutral-900/70 px-3 py-2 text-xs text-amber-100">{notice}</p>}
      {flaggedAttachments(state).length > 0 && <section aria-labelledby="create-mode-waiting" className="space-y-2" data-testid="create-mode-waiting">
        <h2 id="create-mode-waiting" className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-300">Needs a new spot</h2>
        <ul className="space-y-2">
          {flaggedAttachments(state).map(attachment => {
            const { title, detail } = describeWaiting(attachment);
            return <li key={attachment.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-neutral-900/50 px-3 py-2">
              <span className="min-w-0 text-xs leading-relaxed"><span className="block font-medium text-neutral-100">{title}</span><span className="text-neutral-400">{detail}</span></span>
              <button type="button" onClick={() => update(current => removeAttachment(current, attachment.id))}
                className="min-h-9 shrink-0 rounded-lg border border-white/15 px-3 text-xs text-neutral-200 hover:bg-white/10">Remove</button>
            </li>;
          })}
        </ul>
      </section>}
    </div>
    <p className="font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-neutral-500">Chapter {chapter.chapterNumber}</p>
    <h1 id={`harness-reader-chapter-${chapter.chapterNumber}`} data-read-aloud-title="" style={{ fontFamily: text.titleFont.family }}
      className="mt-1 text-[length:calc(1.5rem*var(--reader-scale,1))] font-normal text-white sm:text-[length:calc(1.875rem*var(--reader-scale,1))]">{chapterTitleText(chapter.title) || chapter.title}</h1>
    {/* A quiet gutter on phones gives the overlay's ¶ numbers room, so turning an overlay on never moves a word. */}
    <div className="ps-3 sm:ps-0">
      <HighlightEngine blocks={state.manuscript.paragraphs} onBlocksChange={edit} actions={actions} removeActions={removeActions}
        editable overlay={overlay} locale={locale} className="mt-6 text-neutral-200"
        renderBlockText={block => {
          const blockCues = cues.filter(cue => cue.anchor.blockId === block.id);
          return blockCues.length ? <InlineAudioText text={block.text} cues={blockCues} renderText={words => words} /> : block.text;
        }} />
    </div>
  </article>;
}
