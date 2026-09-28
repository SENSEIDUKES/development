import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { createMediaCatalog } from '@seihouse/sen/audio';
import { InlineAudioText } from '@seihouse/sen/reader-chamber';
import {
  MANUSCRIPT_PROTOTYPE_WORD_LIMIT, ManualCuePicker, TextHighlightEngine,
  anchorAtLevel, applyPassageEdit, countManuscriptWords, createManualCueMoment, flaggedAttachments, keepAttachment, passageRange,
  placeAttachment, removeAttachment, resolveAnchor, sameAnchorTarget, sealManuscript,
  type ManuscriptAnchorLevel, type ManuscriptAttachment, type ManuscriptParagraph, type ManuscriptSentence, type ManuscriptState,
  type PassageAction, type PassageEdit, type PassageSelection,
} from '@seihouse/sen/text-highlight-engine';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { ManuscriptInspector } from './ManuscriptInspector';
import { createPreviewManuscript } from './previewData';

const catalog = createMediaCatalog(LIBRARY_BASE_MEDIA);

/** The Sound Cue system's payload. The manuscript never reads it. */
interface SoundCuePayload { cueUrl: string }
type LabState = ManuscriptState<SoundCuePayload>;
type LabAttachment = ManuscriptAttachment<SoundCuePayload>;
const SOUND_CUE = 'sound-cue';
const LEVELS: ReadonlyArray<{ level: ManuscriptAnchorLevel; label: string }> = [
  { level: 'span', label: 'Words' }, { level: 'sentence', label: 'Sentence' }, { level: 'paragraph', label: 'Paragraph' },
];
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

function CueAttachPanel({ state, selection, onPlace, onRemove, onClose }: {
  state: LabState;
  selection: PassageSelection;
  onPlace: (attachment: LabAttachment) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const [level, setLevel] = useState<ManuscriptAnchorLevel>('span');
  const anchor = anchorAtLevel(state.manuscript, selection, level);
  const target = anchor ? resolveAnchor(state.manuscript, anchor) : undefined;
  const paragraph = state.manuscript.paragraphs.find(candidate => candidate.id === selection.blockId);
  const cues = state.attachments.filter(attachment => attachment.kind === SOUND_CUE);
  const existing = anchor && cues.find(attachment => sameAnchorTarget(attachment.anchor, anchor));
  const occupied = cues.filter(attachment => attachment !== existing).flatMap(attachment => {
    const resolution = resolveAnchor(state.manuscript, attachment.anchor);
    return resolution.status === 'placed' ? [resolution.selection] : [];
  });
  return <div className="sen-manuscript-cue-panel">
    <div role="group" aria-label="Attach to" className="flex flex-wrap items-center gap-1 px-1 pb-1 text-xs text-slate-300">
      <span className="mr-1">Attach to</span>
      {LEVELS.map(option => <button key={option.level} type="button" aria-pressed={level === option.level}
        className={level === option.level ? 'bg-[var(--sen-passage-highlight)] text-white' : 'text-slate-300'}
        onClick={() => setLevel(option.level)}>{option.label}</button>)}
    </div>
    {anchor && target?.status === 'placed' && paragraph
      ? <ManualCuePicker key={level} block={paragraph} selection={target.selection} catalog={catalog}
        existing={existing ? cueMoment(state, existing) : undefined} occupiedSelections={occupied}
        onPlace={moment => onPlace({ id: existing?.id ?? newAttachmentId(), kind: SOUND_CUE, anchor, payload: { cueUrl: moment.cue.publicUrl } })}
        onRemove={() => existing && onRemove(existing.id)} onClose={onClose} />
      : <p role="status" className="px-2 py-3 text-sm text-slate-300">This selection covers more than one sentence. Attach it to its words or its paragraph.</p>}
  </div>;
}

export function TextHighlightEnginePreview() {
  const [state, setState] = useState<LabState>(createLabState);
  const [selection, setSelection] = useState<PassageSelection | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmSeal, setConfirmSeal] = useState(false);
  const [highlightColor, setHighlightColor] = useState('#8c6ee1');
  const proseRef = useRef<HTMLDivElement>(null);
  const draft = state.manuscript.status === 'draft';
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
    id: 'cue', label: 'Cue', onActivate: (selected, close) => <CueAttachPanel state={state} selection={selected}
      onPlace={attachment => setState(current => placeAttachment(current, attachment))}
      onRemove={id => setState(current => removeAttachment(current, id))} onClose={close} />,
  }] }] }] : [];

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
    {notice && <p role="status" className="mb-4 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">{notice}</p>}
    <div ref={proseRef} className="text-lg text-slate-200" style={{ fontFamily: 'Georgia, serif' }}>
      <TextHighlightEngine blocks={state.manuscript.paragraphs} onBlocksChange={edit} onSelectionChange={setSelection}
        actions={actions} editable={draft}
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
