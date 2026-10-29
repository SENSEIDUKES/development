import { useEffect, useId, useRef, useState } from 'react';
import { CHAPTER_REWRITE_NOTE_LIMIT } from '../../../narrative/generation';
import './reader-colors.css';

/**
 * Rewrite this chapter, at the end of the story's latest chapter: one quiet
 * link that opens a box for an optional note on what to change. The note is
 * kept if the rewrite fails, so the reader can simply ask again.
 */
export function ChapterRewrite({ chapterNumber, disabled, onRewrite }: {
  chapterNumber: number;
  disabled?: boolean;
  /** Writes the chapter again; resolves true once the new version is saved. */
  onRewrite: (note?: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const noteId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  // The box opens at the chapter's end, where the Listen bar sits: bring all of it into view.
  useEffect(() => {
    if (open) formRef.current?.scrollIntoView?.({ block: 'center' });
  }, [open]);

  if (!open) {
    return <div className="mt-4 flex justify-center">
      <button type="button" disabled={disabled} onClick={() => setOpen(true)}
        className="min-h-11 rounded-full px-4 text-xs text-(--reader-text-dim) underline-offset-4 hover:text-(--reader-text-soft) hover:underline disabled:cursor-not-allowed disabled:opacity-40">
        Rewrite this chapter
      </button>
    </div>;
  }

  const rewrite = async () => {
    setOpen(false);
    if (await onRewrite(note.trim() || undefined)) setNote('');
    else setOpen(true);
  };

  return <form ref={formRef} aria-label={`Rewrite Chapter ${chapterNumber}`} className="mt-4 rounded-2xl border border-(--reader-light)/10 bg-(--reader-light)/[0.03] p-4"
    onSubmit={event => { event.preventDefault(); void rewrite(); }}>
    <label htmlFor={noteId} className="text-sm text-(--reader-text-soft)">
      What should change? <span className="text-(--reader-text-faint)">Optional</span>
    </label>
    <textarea id={noteId} value={note} onChange={event => setNote(event.target.value)} rows={3} maxLength={CHAPTER_REWRITE_NOTE_LIMIT}
      placeholder="Leave it blank for a fresh take on the same chapter."
      className="mt-2 w-full resize-y rounded-xl border border-(--reader-light)/15 bg-(--reader-shade)/30 p-3 text-sm text-(--reader-text) placeholder:text-(--reader-text-faint) focus:border-(--reader-accent-bright)/50 focus:outline-none" />
    <div className="mt-3 flex flex-wrap justify-end gap-2">
      <button type="button" onClick={() => setOpen(false)}
        className="min-h-11 rounded-full border border-(--reader-light)/15 px-4 text-sm text-(--reader-text-soft) hover:border-(--reader-light)/30">Cancel</button>
      <button type="submit" disabled={disabled}
        className="min-h-11 rounded-full border border-(--reader-accent-bright)/50 bg-(--reader-accent)/15 px-4 text-sm font-semibold text-(--reader-accent-mist) hover:bg-(--reader-accent)/25 disabled:cursor-not-allowed disabled:opacity-40">
        Rewrite Chapter {chapterNumber}
      </button>
    </div>
  </form>;
}
