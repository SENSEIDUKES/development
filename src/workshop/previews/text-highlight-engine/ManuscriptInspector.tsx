import {
  locateSelection, resolveAnchor,
  type ManuscriptAddress, type ManuscriptAttachment, type ManuscriptParagraph, type ManuscriptSentence, type ManuscriptState, type PassageSelection,
} from '@seihouse/sen/text-highlight-engine';

const LEVEL_LABEL = { span: 'Words', sentence: 'Sentence', paragraph: 'Paragraph' } as const;
const STATUS_LABEL = { placed: 'Placed', changed: 'Words changed', missing: 'Missing' } as const;
const shortId = (id: string) => id.slice(0, 8);
const excerpt = (text: string, length = 72) => (text.length > length ? `${text.slice(0, length - 1)}…` : text);

export const describeAddress = (address: ManuscriptAddress) => {
  const numbers = address.sentences.map(sentence => sentence.number);
  const sentences = numbers.length === 0 ? '' : numbers.length === 1 ? ` · Sentence ${numbers[0]}` : ` · Sentences ${numbers[0]}–${numbers.at(-1)}`;
  return `Paragraph ${address.paragraph.number}${sentences}`;
};

/** The same address the way the model writes it: P2 S8, P2 S8–S9, or P2 for a whole paragraph. */
export const modelAddress = (address: ManuscriptAddress) => {
  const numbers = address.sentences.map(sentence => sentence.number);
  if (address.wholeParagraph || numbers.length === 0) return `P${address.paragraph.number}`;
  return `P${address.paragraph.number} S${numbers[0]}${numbers.length > 1 ? `–S${numbers.at(-1)}` : ''}`;
};

/**
 * Workshop-only lab readout: where the current selection sits, what is
 * attached to the page, and the saved structure under the prose.
 */
export function ManuscriptInspector<Payload>({ state, selection, describe, onKeep, onRemove, onSelectSentence }: {
  state: ManuscriptState<Payload>;
  selection: PassageSelection | null;
  describe: (attachment: ManuscriptAttachment<Payload>) => string;
  onKeep: (id: string) => void;
  onRemove: (id: string) => void;
  onSelectSentence: (paragraph: ManuscriptParagraph, sentence: ManuscriptSentence) => void;
}) {
  const { manuscript } = state;
  const draft = manuscript.status === 'draft';
  const address = selection ? locateSelection(manuscript, selection) : undefined;
  const order = new Map(manuscript.paragraphs.map((paragraph, index) => [paragraph.id, index]));
  const rows = state.attachments.map(attachment => {
    const resolution = resolveAnchor(manuscript, attachment.anchor);
    const range = resolution.status === 'placed' ? resolution.selection : resolution.status === 'changed' ? resolution.current : undefined;
    const placed = range ? locateSelection(manuscript, range) : undefined;
    const words = attachment.anchor.level === 'span' ? attachment.anchor.selectedText : attachment.anchor.text;
    const position = range?.startOffset ?? Number.MAX_SAFE_INTEGER;
    return { attachment, status: resolution.status, placed, words, sort: [order.get(attachment.anchor.blockId) ?? Number.MAX_SAFE_INTEGER, position] };
  }).sort((left, right) => left.sort[0] - right.sort[0] || left.sort[1] - right.sort[1]);
  let sentenceNumber = 0;

  return <aside className="mt-10 space-y-6 border-t border-slate-700/70 pt-6 text-sm text-slate-300" aria-label="Manuscript inspector">
    <section aria-labelledby="manuscript-selection-heading" data-testid="manuscript-selection">
      <h2 id="manuscript-selection-heading" className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Selection</h2>
      {selection && address ? <div className="space-y-1">
        <p className="text-slate-100" data-testid="manuscript-address">{describeAddress(address)}</p>
        <p className="text-xs text-slate-400">Model address <span className="font-semibold text-slate-200" data-testid="manuscript-model-address">{modelAddress(address)}</span></p>
        <p className="text-slate-400">Characters {selection.startOffset}–{selection.endOffset}
          {address.exactSentence ? ' · exactly one sentence' : address.wholeParagraph ? ' · the whole paragraph' : address.sentences.length > 1 ? ' · crosses a sentence boundary' : ''}</p>
        <p className="font-serif text-slate-200">“{excerpt(selection.selectedText, 160)}”</p>
        <p className="break-all font-mono text-[11px] text-slate-500">
          ¶ {shortId(address.paragraph.id)} · {address.sentences.map(sentence => shortId(sentence.id)).join(', ')}
        </p>
      </div> : <p className="text-slate-500">Select words on the page to see the paragraph, sentences, and exact range they belong to.</p>}
    </section>

    <section aria-labelledby="manuscript-attachments-heading">
      <h2 id="manuscript-attachments-heading" className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Attachments ({rows.length})</h2>
      {rows.length === 0 ? <p className="text-slate-500">Nothing attached yet. Select words, then Media → Audio → Cue.</p>
        : <ul className="space-y-2">
          {rows.map(({ attachment, status, placed, words }) => <li key={attachment.id} data-testid="manuscript-attachment" data-status={status}
            className={`rounded-lg border px-3 py-2 ${status === 'placed' ? 'border-slate-700 bg-slate-900/40' : 'border-amber-400/40 bg-amber-400/[0.06]'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-slate-100">{describe(attachment)}</p>
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${status === 'placed' ? 'bg-slate-800 text-slate-300' : 'bg-amber-400/15 text-amber-200'}`}>{STATUS_LABEL[status]}</span>
            </div>
            <p className="text-xs text-slate-400">{LEVEL_LABEL[attachment.anchor.level]}{placed ? ` · ${describeAddress(placed)}` : ''}</p>
            <p className="font-serif text-slate-300">“{excerpt(words)}”</p>
            {status !== 'placed' && <p className="text-xs text-amber-200/90">
              {status === 'missing' ? 'Its paragraph or sentence no longer exists.' : attachment.anchor.level === 'span'
                ? 'An edit changed these words, so it came off the page. Place it again or remove it.' : 'Its words were edited. Keep it on the new words or remove it.'}
            </p>}
            {draft && <div className="mt-1 flex gap-2">
              {status === 'changed' && attachment.anchor.level !== 'span' && <button type="button" className="min-h-9 rounded px-2 text-amber-100 underline-offset-2 hover:underline" onClick={() => onKeep(attachment.id)}>Keep</button>}
              <button type="button" className="min-h-9 rounded px-2 text-slate-300 underline-offset-2 hover:underline" onClick={() => onRemove(attachment.id)}>Remove</button>
            </div>}
          </li>)}
        </ul>}
    </section>

    <details className="group" data-testid="manuscript-structure">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Page structure · {manuscript.paragraphs.length} paragraphs · {manuscript.paragraphs.reduce((total, paragraph) => total + paragraph.sentences.length, 0)} sentences
      </summary>
      <ol className="mt-3 space-y-3">
        {manuscript.paragraphs.map((paragraph, index) => <li key={paragraph.id}>
          <p className="text-xs text-slate-400">Paragraph {index + 1} <span className="font-mono text-slate-500">{shortId(paragraph.id)}</span></p>
          <ol className="mt-1 space-y-1">
            {paragraph.sentences.map(sentence => {
              sentenceNumber += 1;
              return <li key={sentence.id}>
                <button type="button" className="w-full rounded px-2 py-1 text-left hover:bg-slate-800/70" data-sentence-id={sentence.id}
                  onClick={() => onSelectSentence(paragraph, sentence)}>
                  <span className="mr-2 text-xs text-slate-500">S{sentenceNumber}</span>
                  <span className="font-serif text-slate-300">{excerpt(paragraph.text.slice(sentence.start, sentence.end), 96)}</span>
                </button>
              </li>;
            })}
          </ol>
        </li>)}
      </ol>
    </details>
  </aside>;
}
