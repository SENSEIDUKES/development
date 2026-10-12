import { useMemo, useRef, useState, type CSSProperties, type Ref } from 'react';
import { createMediaCatalog, SOUND_CUE_KIND, type SoundCueAttachment } from '@seihouse/sen/audio';
import { InlineAudioText } from '@seihouse/sen/inline-audio';
import {
  ManuscriptOverlaySwitch, OVERLAY_KINDS, HighlightEngine,
  applyPassageEdit, attachmentMarks, createManuscript, createManuscriptId, flaggedAttachments, placedSoundCues, removeAttachment, resolveAnchor,
  soundCueActions, structurePins,
  type ManuscriptAttachment, type ManuscriptOverlayMode, type ManuscriptState, type PassageEdit,
} from '@seihouse/sen/highlight-engine';
import type { ResolvedReaderText } from '@seihouse/sen/reader-runtime';
import { chapterTitleText } from '../../../narrative/chapterTitle';
import { SPEAKER_KIND, type SpeakerAttachment } from '../../../narrative/speech';
import { HOLDING_CHANGE_KIND, type HoldingChangeAttachment } from '../../../narrative/holdings';
import { harnessParagraphBlockId } from '../shared/chapterBody';
import type { HarnessGenerationController } from '../shared/controller';
import type { ReaderChapter } from './readerChapterBody';

type ChapterState = ManuscriptState<unknown>;

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
    ...chapter.soundCues ?? [], ...chapter.speakers ?? [], ...chapter.holdingChanges ?? [],
    // Effects still waiting for a new spot from an earlier visit: off the page, so flagged.
    ...chapter.authoring?.waiting ?? [],
  ] };
}

type Waiting = NonNullable<NonNullable<ReaderChapter['authoring']>['waiting']>[number];

/** What a waiting effect was: its kind, what it does, and the words it sat on. */
function describeWaiting(attachment: ManuscriptAttachment<unknown>): { title: string; detail: string } {
  const was = 'selectedText' in attachment.anchor ? `was on “${attachment.anchor.selectedText}”` : '';
  if (attachment.kind === SOUND_CUE_KIND) return { title: `Sound Cue · ${(attachment as SoundCueAttachment).payload.sound}`, detail: `${was}. Highlight its new words and place it with Media → Audio → Cue.` };
  if (attachment.kind === SPEAKER_KIND) return { title: `Speaker · ${(attachment as SpeakerAttachment).payload.speaker}`, detail: `${was}. It waits here until the chapter is sealed.` };
  const holding = (attachment as HoldingChangeAttachment).payload;
  return { title: `Holding change · ${holding.holder.name} ${holding.verb}${holding.target ? ` ${holding.target.name}` : ''}`, detail: `${was}. It waits here until the chapter is sealed.` };
}

const placed = (state: ChapterState) => (attachment: ManuscriptAttachment<unknown>) => resolveAnchor(state.manuscript, attachment.anchor).status === 'placed';

const KIND_NAMES: Record<string, [string, string]> = {
  [SOUND_CUE_KIND]: ['Sound Cue', 'Sound Cues'], [SPEAKER_KIND]: ['speaker', 'speakers'], [HOLDING_CHANGE_KIND]: ['holding change', 'holding changes'],
};

/**
 * Create mode: the reader authors the chapter in place, on the Highlight
 * Engine with its overlays. Highlight words to change them (Edit) or to place a
 * Sound Cue (Media → Audio → Cue); the Overlays switch shows the cues and the
 * page's numbering (P2 S6). Every change is saved as it is made, so there is no
 * seal step: moving on to the next chapter seals this one. An effect whose
 * words a change replaced (a cue, a speaker or a holding change) has nothing
 * left to sit on, so it waits in "Needs a new spot" until the reader places it
 * again or removes it, or the chapter is sealed. A changed chapter is marked
 * as changed, so it is read again at its seal.
 */
export function ChapterAuthoring({ chapter, controller, locale, text, articleRef }: {
  chapter: ReaderChapter;
  controller: HarnessGenerationController;
  locale: string;
  text: ResolvedReaderText;
  articleRef?: Ref<HTMLElement>;
}) {
  const [state, setState] = useState<ChapterState>(() => chapterState(chapter, locale));
  const [overlayMode, setOverlayMode] = useState<ManuscriptOverlayMode>('cues');
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState<'saved' | 'saving' | 'failed'>('saved');
  const saves = useRef<Promise<void>>(Promise.resolve());
  // The recordings the chapter was written with; where its frozen catalog holds none, the story's media now.
  const catalog = useMemo(() => createMediaCatalog(chapter.mediaLoadout.soundCues.length
    ? chapter.mediaLoadout : controller.describeStoryMedia(chapter.storyId) ?? chapter.mediaLoadout), [chapter.mediaLoadout, chapter.storyId, controller]);

  /** Saves the page as it stands now; effects whose words are gone wait for a new spot, and the reader is told which. */
  const save = (next: ChapterState) => {
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
    saves.current = saves.current.then(() => controller.authorChapter(chapter.id, {
      paragraphs: next.manuscript.paragraphs.map(paragraph => paragraph.text),
      soundCues: kept.filter(attachment => attachment.kind === SOUND_CUE_KIND) as SoundCueAttachment[],
      speakers: kept.filter(attachment => attachment.kind === SPEAKER_KIND) as SpeakerAttachment[],
      holdingChanges: kept.filter(attachment => attachment.kind === HOLDING_CHANGE_KIND) as HoldingChangeAttachment[],
      waiting: waiting as Waiting[],
    })).then(() => setSaving('saved'), error => {
      setSaving('failed');
      setNotice(error instanceof Error ? error.message : 'Your change could not be saved.');
    });
  };
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
  const { actions, removeActions } = soundCueActions({ state, update, catalog, onNotice: setNotice });
  const overlay = useMemo(() => overlayMode === 'off' ? undefined
    : { marks: attachmentMarks(state, OVERLAY_KINDS[overlayMode]), pins: structurePins(state.manuscript) }, [overlayMode, state]);
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
      <p className="text-xs leading-relaxed text-neutral-400">Highlight words to change them, or choose Media to place a Sound Cue. Changes save as you make them; moving on to the next chapter seals this one.</p>
      <ManuscriptOverlaySwitch mode={overlayMode} onChange={setOverlayMode} overlay={overlay} />
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
    <div className="pl-3 sm:pl-0">
      <HighlightEngine blocks={state.manuscript.paragraphs} onBlocksChange={edit} actions={actions} removeActions={removeActions}
        editable overlay={overlay} locale={locale} className="mt-6 text-neutral-200"
        renderBlockText={block => {
          const blockCues = cues.filter(cue => cue.anchor.blockId === block.id);
          return blockCues.length ? <InlineAudioText text={block.text} cues={blockCues} renderText={words => words} /> : block.text;
        }} />
    </div>
  </article>;
}
