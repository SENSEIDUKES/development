import { useId, useState } from 'react';
import { NotebookPen } from 'lucide-react';
import { AUTHOR_NOTES_LIMIT, type HarnessStory } from '@seihouse/sen/harness-generation';
import { NarrativePanel as LibraryPanel } from '@seihouse/sen/presentation';

/**
 * Story Settings' Author's notes: what the creator tells readers about the
 * world, shown at the bottom of its Information panel. They never reach the
 * chapter writer.
 */
export function AuthorNotesPanel({ story, busy, onSave }: {
  story: Pick<HarnessStory, 'authorNotes'>;
  busy: boolean;
  onSave: (notes: string) => void;
}) {
  const titleId = useId();
  const notesId = useId();
  const saved = story.authorNotes ?? '';
  const [notes, setNotes] = useState(saved);
  const changed = notes.trim() !== saved;
  return <LibraryPanel as="section" padding="md" aria-labelledby={titleId} data-testid="story-settings-author-notes">
    <div className="flex items-center gap-2">
      <NotebookPen size={18} className="text-cyan-200" aria-hidden="true" />
      <h2 id={titleId} className="font-display text-xl text-white">Author’s notes</h2>
    </div>
    <label className="sr-only" htmlFor={notesId}>Author’s notes</label>
    <textarea id={notesId} value={notes} maxLength={AUTHOR_NOTES_LIMIT} rows={5} disabled={busy}
      placeholder="A word to your readers: where the story came from, what is coming next…"
      onChange={event => setNotes(event.target.value)}
      className="mt-4 w-full resize-y rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-cyan-300/60" />
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <p className="text-[11px] leading-relaxed text-neutral-500">Readers find them at the bottom of the world’s Information.</p>
      <button type="button" disabled={busy || !changed} onClick={() => onSave(notes)}
        className="min-h-11 rounded-full border border-cyan-300/40 px-4 text-sm text-cyan-50 hover:border-cyan-300/70 disabled:opacity-40">
        Save notes
      </button>
    </div>
  </LibraryPanel>;
}
