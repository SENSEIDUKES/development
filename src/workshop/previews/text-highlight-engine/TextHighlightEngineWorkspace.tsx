import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { SOUND_CUE_RULES, createMediaCatalog } from '@seihouse/sen/audio';
import { InlineAudioText } from '@seihouse/sen/reader-chamber';
import {
  MANUSCRIPT_PROTOTYPE_WORD_LIMIT, ManualCuePicker, TextHighlightEngine,
  anchorAtLevel, applyPassageEdit, countManuscriptWords, createManualCueMoment, flaggedAttachments, keepAttachment, passageRange,
  placeAttachment, removeAttachment, resolveAnchor, sameAnchorTarget, sealManuscript, snapSoundCueSelection,
  type ManuscriptAttachment, type ManuscriptParagraph, type ManuscriptSentence, type ManuscriptState,
  type PassageAction, type PassageEdit, type PassageSelection,
} from '@seihouse/sen/text-highlight-engine';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { ManuscriptInspector } from './ManuscriptInspector';
import { PartsBoard } from './PartsBoard';
import { ATTACHMENT_COLORS, OVERLAY_KINDS, attachmentMarks, structurePins, type LabOverlay } from './overlays';
import { createPreviewManuscript } from './previewData';

const catalog = createMediaCatalog(LIBRARY_BASE_MEDIA);

/** The Sound Cue system's payload. The manuscript never reads it. */
interface SoundCuePayload { cueUrl: string }
type LabState = ManuscriptState<SoundCuePayload>;
type LabAttachment = ManuscriptAttachment<SoundCuePayload>;
const SOUND_CUE = 'sound-cue';
const newAttachmentId = () => `a-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
const createLabState = (): LabState => ({ manuscript: createPreviewManuscript(), attachments: [] });

/** A placed Sound Cue in the Reader's current inline format, derived from its manuscript anchor. */
function cueMoment(state: LabState, attachment: LabAttachment, occupied: readonly PassageSelection[] = []) {
  const resolution = resolveAnchor(state.manuscript, attachment.anchor);
  const paragraph = state.manuscript.paragraphs.find(candidate => candidate.id === attachment.anchor.blockId);
  const cue = catalog.soundCues.byUrl.get(attachment.payload.cueUrl);
  if (resolution.status !== 'placed' || !paragraph || !cue) return undefined;
  const result = createManualCueMoment(paragraph, resolution.selection, cue, catalog, occupied);
  return result.ok ? result.moment : undefined;
}

const soundCues = (state: LabState) => state.attachments.filter(attachment => attachment.kind === SOUND_CUE);

/**
 * The Sound Cue a selection would hold — its whole words, and the cue already
 * on them — or why it cannot hold one. A person meets the finished-cue rules
 * as they select: 1–5 whole words, at most ten in the chapter.
 */
function soundCueTarget(state: LabState, selection: PassageSelection): { selection: PassageSelection; existing?: LabAttachment } | { reason: string } {
  const paragraph = state.manuscript.paragraphs.find(candidate => candidate.id === selection.blockId);
  const snapped = paragraph && snapSoundCueSelection(paragraph, selection, state.manuscript.locale);
  if (!snapped || !snapped.ok) return { reason: snapped?.reason === 'too-many-words' ? `Sound Cues fit 1–${SOUND_CUE_RULES.maxWords} words` : 'Select a word' };
  const anchor = anchorAtLevel(state.manuscript, snapped.selection, 'span');
  const cues = soundCues(state);
  const existing = anchor && cues.find(attachment => sameAnchorTarget(attachment.anchor, anchor));
  // A cue already on these words can still take another sound, even with the chapter full.
  if (!existing && cues.length >= SOUND_CUE_RULES.maxPerChapter) return { reason: `${cues.length} of ${SOUND_CUE_RULES.maxPerChapter} Sound Cues placed` };
  return { selection: snapped.selection, existing };
}

/** The placed Sound Cues whose words a selection touches. */
const cuesUnder = (state: LabState, selection: PassageSelection) => soundCues(state).filter(attachment => {
  const resolution = resolveAnchor(state.manuscript, attachment.anchor);
  return resolution.status === 'placed' && resolution.selection.blockId === selection.blockId
    && resolution.selection.startOffset < selection.endOffset && resolution.selection.endOffset > selection.startOffset;
});

function CueAttachPanel({ state, selection, onPlace, onRemove, onClose }: {
  state: LabState;
  selection: PassageSelection;
  onPlace: (attachment: LabAttachment) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const target = soundCueTarget(state, selection);
  const paragraph = state.manuscript.paragraphs.find(candidate => candidate.id === selection.blockId);
  const anchor = 'selection' in target ? anchorAtLevel(state.manuscript, target.selection, 'span') : undefined;
  if (!('selection' in target) || !paragraph || !anchor) {
    return <p role="status" className="px-2 py-3 text-sm text-slate-300">{'reason' in target ? `${target.reason}.` : 'Select the words again.'}</p>;
  }
  const occupied = soundCues(state).filter(attachment => attachment !== target.existing).flatMap(attachment => {
    const resolution = resolveAnchor(state.manuscript, attachment.anchor);
    return resolution.status === 'placed' ? [resolution.selection] : [];
  });
  return <div className="sen-manuscript-cue-panel">
    <ManualCuePicker block={paragraph} selection={target.selection} catalog={catalog}
      existing={target.existing ? cueMoment(state, target.existing) : undefined} occupiedSelections={occupied}
      onPlace={moment => onPlace({ id: target.existing?.id ?? newAttachmentId(), kind: SOUND_CUE, anchor, payload: { cueUrl: moment.cue.publicUrl } })}
      onRemove={() => target.existing && onRemove(target.existing.id)} onClose={onClose} />
  </div>;
}

export function TextHighlightEnginePreview() {
  const [state, setState] = useState<LabState>(createLabState);
  const [selection, setSelection] = useState<PassageSelection | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmSeal, setConfirmSeal] = useState(false);
  const [highlightColor, setHighlightColor] = useState('#8c6ee1');
  const [overlayMode, setOverlayMode] = useState<LabOverlay>('off');
  const proseRef = useRef<HTMLDivElement>(null);
  const draft = state.manuscript.status === 'draft';
  const overlay = useMemo(() => overlayMode === 'off' ? undefined
    : { marks: attachmentMarks(state, OVERLAY_KINDS[overlayMode]), pins: structurePins(state.manuscript) }, [overlayMode, state]);
  const words = countManuscriptWords(state.manuscript);
  const flagged = flaggedAttachments(state).length;
  const moments = useMemo(() => state.attachments.flatMap(attachment => {
    const moment = attachment.kind === SOUND_CUE ? cueMoment(state, attachment) : undefined;
    return moment ? [moment] : [];
  }), [state]);

  const edit = (_blocks: unknown, change: PassageEdit) => {
    const result = applyPassageEdit(state, change);
    if (result.ok) { setState(result.state); setNotice(null); return; }
    setNotice(result.reason === 'word-limit'
      ? `That edit would take the page past ${MANUSCRIPT_PROTOTYPE_WORD_LIMIT} words, so it was not saved.`
      : 'That edit no longer matches the page, so it was not saved.');
  };
  const seal = () => {
    const result = sealManuscript(state);
    setConfirmSeal(false);
    if (!result.ok) { setNotice(`Resolve ${result.count} flagged attachment${result.count === 1 ? '' : 's'} before sealing.`); return; }
    setState(result.state);
    setNotice('Sealed. This version is now the chapter: editing and attaching are closed.');
  };
  const reset = () => { setState(createLabState()); setNotice(null); setConfirmSeal(false); };
  const selectSentence = (paragraph: ManuscriptParagraph, sentence: ManuscriptSentence) => {
    const root = proseRef.current;
    const range = root && passageRange(root, {
      blockId: paragraph.id, startOffset: sentence.start, endOffset: sentence.end, selectedText: paragraph.text.slice(sentence.start, sentence.end),
    });
    if (!root || !range) return;
    const native = root.ownerDocument.getSelection();
    native?.removeAllRanges();
    native?.addRange(range);
    root.ownerDocument.dispatchEvent(new Event('selectionchange'));
    // Bring the sentence itself on screen: the engine shows its controls only for a visible selection.
    range.startContainer.parentElement?.closest('[data-sen-text-block]')?.scrollIntoView?.({ block: 'nearest' });
    const bounds = range.getBoundingClientRect?.();
    if (bounds && (bounds.top < 0 || bounds.bottom > window.innerHeight)) window.scrollBy({ top: bounds.top - window.innerHeight / 3 });
  };

  const actions: PassageAction[] = draft ? [{ id: 'media', label: 'Media', children: [{ id: 'audio', label: 'Audio', children: [{
    id: 'cue', label: 'Cue',
    unavailable: selected => { const target = soundCueTarget(state, selected); return 'reason' in target ? target.reason : undefined; },
    onActivate: (selected, close) => <CueAttachPanel state={state} selection={selected}
      onPlace={attachment => {
        // The chapter's cap holds even if the page changed while the picker was open.
        if (!state.attachments.some(placed => placed.id === attachment.id) && soundCues(state).length >= SOUND_CUE_RULES.maxPerChapter) {
          setNotice(`A chapter holds at most ${SOUND_CUE_RULES.maxPerChapter} Sound Cues.`);
          return;
        }
        setState(current => placeAttachment(current, attachment));
      }}
      onRemove={id => setState(current => removeAttachment(current, id))} onClose={close} />,
  }] }] }] : [];
  const removeActions: PassageAction[] = draft ? [{
    id: 'remove-cue', label: 'Remove cue here',
    unavailable: selected => cuesUnder(state, selected).length ? undefined : 'No Sound Cue here',
    onActivate: selected => {
      const ids = cuesUnder(state, selected).map(attachment => attachment.id);
      setState(current => ids.reduce((next, id) => removeAttachment(next, id), current));
      return null;
    },
  }] : [];

  return <section className="mx-auto max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
      <p>{draft ? 'Highlight words, then choose Edit or Media.' : 'Sealed: highlight words to read their address.'}</p>
      <label data-sen-selection-preserve className="flex items-center gap-2">Highlight color
        <input type="color" value={highlightColor} onChange={event => setHighlightColor(event.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-slate-600 bg-transparent p-0.5" />
      </label>
    </div>
    <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-400" data-testid="manuscript-toolbar">
      <span data-testid="manuscript-status" className={`rounded-full border px-2.5 py-1 ${draft ? 'border-slate-600 text-slate-300' : 'border-emerald-400/50 text-emerald-200'}`}>
        {draft ? 'Draft' : 'Sealed'}
      </span>
      <span>{words} / {MANUSCRIPT_PROTOTYPE_WORD_LIMIT} words</span>
      <span className="grow" />
      <button type="button" className="min-h-9 rounded-lg border border-slate-600 px-3 text-slate-300 hover:bg-slate-800" onClick={reset}>Reset sample</button>
      {draft && !confirmSeal && <button type="button" className="min-h-9 rounded-lg border border-emerald-400/50 px-3 text-emerald-200 hover:bg-emerald-400/10"
        onClick={() => setConfirmSeal(true)}>Seal chapter</button>}
      {draft && confirmSeal && <span className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm seal">
        <span className="text-slate-300">{flagged ? `${flagged} flagged attachment${flagged === 1 ? '' : 's'} must be resolved first.` : 'Seal this version? It cannot be edited afterwards.'}</span>
        <button type="button" disabled={flagged > 0} className="min-h-9 rounded-lg bg-emerald-500/20 px-3 text-emerald-100 disabled:opacity-40" onClick={seal}>Seal</button>
        <button type="button" className="min-h-9 rounded-lg px-3 text-slate-300" onClick={() => setConfirmSeal(false)}>Cancel</button>
      </span>}
    </div>
    <PartsBoard />
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400" role="group" aria-label="Overlays" data-testid="overlay-switch">
        <span className="mr-1 uppercase tracking-[0.14em] text-slate-500">Overlays</span>
        {([['off', 'Off'], ['cues', 'Cues']] as const).map(([mode, label]) => <button key={mode} type="button" aria-pressed={overlayMode === mode}
          className={`min-h-9 rounded-lg border px-3 ${overlayMode === mode ? 'border-teal-300/60 bg-teal-400/10 text-teal-100' : 'border-slate-600 text-slate-300 hover:bg-slate-800'}`}
          onClick={() => setOverlayMode(mode)}>{label}</button>)}
      </div>
      {overlayMode !== 'off' && <div className="space-y-2 text-xs leading-relaxed text-slate-400" data-testid="overlay-legend">
        <p>
          <span className="font-semibold text-slate-200">¶2</span> in the margin with a small raised <span className="font-semibold text-slate-200">6</span> is
          paragraph 2, sentence 6. The model writes it <span className="font-semibold text-slate-200">P2 S6</span>.
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Overlay colors">
          {OVERLAY_KINDS[overlayMode].map(kind => <li key={kind} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 w-3 rounded-[3px] ring-1 ring-inset ring-white/10" style={{ background: ATTACHMENT_COLORS[kind].tone }} />{ATTACHMENT_COLORS[kind].label}
          </li>)}
          {/* Only effects that stay on the page after an edit (passage-level ones) show the underline. */}
          {overlay?.marks?.some(mark => mark.attention) && <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-4 border-b-2 border-dashed border-amber-400" />Words changed
          </li>}
        </ul>
      </div>}
    </div>
    {notice && <p role="status" className="mb-4 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">{notice}</p>}
    {/* A quiet gutter on phones gives the overlay's ¶ numbers room, so turning an overlay on never moves a word. */}
    <div ref={proseRef} className="pl-3 text-lg text-slate-200 sm:pl-0" style={{ fontFamily: 'Georgia, serif' }}>
      <TextHighlightEngine blocks={state.manuscript.paragraphs} onBlocksChange={edit} onSelectionChange={setSelection}
        actions={actions} removeActions={removeActions} editable={draft} overlay={overlay} locale={state.manuscript.locale}
        style={{ '--sen-passage-highlight': `${highlightColor}59` } as CSSProperties}
        renderBlockText={block => {
          const blockMoments = moments.filter(moment => moment.blockId === block.id);
          return blockMoments.length > 0
            ? <InlineAudioText text={block.text} moments={blockMoments} renderText={text => text} />
            : block.text;
        }} />
    </div>
    <ManuscriptInspector state={state} selection={selection} onSelectSentence={selectSentence}
      describe={attachment => {
        const cue = catalog.soundCues.byUrl.get(attachment.payload.cueUrl);
        return cue ? `Sound Cue · ${cue.metadata.description}` : 'Sound Cue · unavailable';
      }}
      onKeep={id => setState(current => keepAttachment(current, id))}
      onRemove={id => setState(current => removeAttachment(current, id))} />
  </section>;
}

export function TextHighlightEngineWorkspace() {
  return <FeatureWorkspace entry={workshopEntries.find(entry => entry.id === 'text-highlight-engine')!}
    allowCompare={false} renderDevelopment={() => <TextHighlightEnginePreview />}
    renderReference={() => <p className="p-8 text-sm text-slate-400">New SEN primitive developed here. No production reference exists.</p>} />;
}
