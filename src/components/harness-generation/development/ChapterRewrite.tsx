import { useEffect, useId, useRef, useState } from 'react';
import { CHAPTER_REWRITE_NOTE_LIMIT } from '../../../narrative/generation';

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
        className="min-h-11 rounded-full px-4 text-xs text-neutral-400 underline-offset-4 hover:text-neutral-200 hover:underline disabled:cursor-not-allowed disabled:opacity-40">
        Rewrite this chapter
      </button>
    </div>;
  }

  const rewrite = async () => {
    setOpen(false);
    if (await onRewrite(note.trim() || undefined)) setNote('');
    else setOpen(true);
  };

  return <form ref={formRef} aria-label={`Rewrite Chapter ${chapterNumber}`} className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    onSubmit={event => { event.preventDefault(); void rewrite(); }}>
    <label htmlFor={noteId} className="text-sm text-neutral-200">
      What should change? <span className="text-neutral-500">Optional</span>
    </label>
    <textarea id={noteId} value={note} onChange={event => setNote(event.target.value)} rows={3} maxLength={CHAPTER_REWRITE_NOTE_LIMIT}
      placeholder="Leave it blank for a fresh take on the same chapter."
      className="mt-2 w-full resize-y rounded-xl border border-white/15 bg-black/30 p-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-cyan-300/50 focus:outline-none" />
    <div className="mt-3 flex flex-wrap justify-end gap-2">
      <button type="button" onClick={() => setOpen(false)}
        className="min-h-11 rounded-full border border-white/15 px-4 text-sm text-neutral-200 hover:border-white/30">Cancel</button>
      <button type="submit" disabled={disabled}
        className="min-h-11 rounded-full border border-cyan-300/50 bg-cyan-400/15 px-4 text-sm font-semibold text-cyan-50 hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-40">
        Rewrite Chapter {chapterNumber}
      </button>
    </div>
  </form>;
}
