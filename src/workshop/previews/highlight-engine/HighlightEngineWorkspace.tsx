import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { SOUNDSCAPE_CHANGE_KIND, createMediaCatalog, isSoundtrackChange, type SoundCuePayload, type SoundtrackChangeAttachment } from '@seihouse/sen/audio';
import { InlineAudioText } from '@seihouse/sen/inline-audio';
import {
  MANUSCRIPT_PROTOTYPE_WORD_LIMIT, ManuscriptOverlaySwitch, OVERLAY_KINDS, HighlightEngine,
  applyPassageEdit, attachmentMarks, countManuscriptWords, flaggedAttachments, keepAttachment, passageRange,
  placedSoundCues, removeAttachment, sealManuscript, audioActions, structurePins,
  type ManuscriptOverlayMode, type ManuscriptParagraph, type ManuscriptSentence, type ManuscriptState,
  SOUNDTRACK_KIND_WORDS, soundtrackOptionLabel,
  type PassageAction, type PassageEdit, type PassageSelection, type SoundtrackChoices,
} from '@seihouse/sen/highlight-engine';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { ManuscriptInspector } from './ManuscriptInspector';
import { PartsBoard } from './PartsBoard';
import { createPreviewManuscript } from './previewData';

const catalog = createMediaCatalog(LIBRARY_BASE_MEDIA);
/** The Library's own pieces and atmospheres, as a story's Create mode offers them (the lab plays no preview). */
const soundtrack: SoundtrackChoices = { pieces: catalog.soundscapes.map(entry => entry.track), atmospheres: catalog.atmospheres };

/** The lab stores Sound Cues exactly as SEN does: span attachments whose payload the manuscript never reads. */
type LabState = ManuscriptState<SoundCuePayload>;
const createLabState = (): LabState => ({ manuscript: createPreviewManuscript(), attachments: [] });

export function HighlightEnginePreview() {
  const [state, setState] = useState<LabState>(createLabState);
  const [selection, setSelection] = useState<PassageSelection | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmSeal, setConfirmSeal] = useState(false);
  const [highlightColor, setHighlightColor] = useState('#9055ff');
  const [overlayMode, setOverlayMode] = useState<ManuscriptOverlayMode>('off');
  const proseRef = useRef<HTMLDivElement>(null);
  const draft = state.manuscript.status === 'draft';
  const overlay = useMemo(() => overlayMode === 'off' ? undefined
    : { marks: attachmentMarks(state, OVERLAY_KINDS[overlayMode]), pins: structurePins(state.manuscript) }, [overlayMode, state]);
  const words = countManuscriptWords(state.manuscript);
  const flagged = flaggedAttachments(state).length;
  const placedCues = useMemo(() => placedSoundCues(state), [state]);

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

  const authoring = audioActions({ state, update: setState, catalog, onNotice: setNotice, soundtrack });
  const actions: PassageAction[] = draft ? authoring.actions : [];
  const removeActions: PassageAction[] = draft ? authoring.removeActions : [];

  return <section className="mx-auto max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
      <p>{draft ? 'Hold a word, tap Select text, then choose Edit, Copy or Media. With a mouse, drag to select.' : 'Sealed: highlight words to read their address.'}</p>
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
      <ManuscriptOverlaySwitch mode={overlayMode} onChange={setOverlayMode} overlay={overlay} />
    </div>
    {notice && <p role="status" className="mb-4 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">{notice}</p>}
    {/* A quiet gutter on phones gives the overlay's ¶ numbers room, so turning an overlay on never moves a word. */}
    <div ref={proseRef} className="pl-3 text-lg text-slate-200 sm:pl-0" style={{ fontFamily: 'Georgia, serif' }}>
      <HighlightEngine blocks={state.manuscript.paragraphs} onBlocksChange={edit} onSelectionChange={setSelection}
        actions={actions} removeActions={removeActions} editable={draft} overlay={overlay} locale={state.manuscript.locale}
        style={{ '--sen-passage-highlight': `${highlightColor}99` } as CSSProperties}
        renderBlockText={block => {
          const blockCues = placedCues.filter(cue => cue.anchor.blockId === block.id);
          return blockCues.length > 0
            ? <InlineAudioText text={block.text} cues={blockCues} renderText={text => text} />
            : block.text;
        }} />
    </div>
    <ManuscriptInspector state={state} selection={selection} onSelectSentence={selectSentence}
      describe={attachment => {
        if (isSoundtrackChange(attachment)) {
          const change = attachment as unknown as SoundtrackChangeAttachment;
          return `${SOUNDTRACK_KIND_WORDS[change.kind].name} change · ${soundtrackOptionLabel(change.kind, change.kind === SOUNDSCAPE_CHANGE_KIND ? change.payload.pieceId : change.payload.atmosphereId, soundtrack)}`;
        }
        const cue = catalog.soundCues.byUrl.get(attachment.payload.cue.publicUrl);
        return `Sound Cue · ${attachment.payload.sound}${cue ? ` · ${cue.metadata.description}` : ''}`;
      }}
      onKeep={id => setState(current => keepAttachment(current, id))}
      onRemove={id => setState(current => removeAttachment(current, id))} />
  </section>;
}

export function HighlightEngineWorkspace() {
  return <FeatureWorkspace entry={workshopEntries.find(entry => entry.id === 'highlight-engine')!}
    renderDevelopment={() => <HighlightEnginePreview />} />;
}
