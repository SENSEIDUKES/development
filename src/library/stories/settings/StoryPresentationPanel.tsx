import { useId, useState } from 'react';
import { NotebookPen } from 'lucide-react';
import { SEISwitch } from '@seihouse/ui';
import { AUTHOR_NOTES_LIMIT, type HarnessStory } from '@seihouse/sen/harness-generation';
import { NarrativePanel as LibraryPanel } from '@seihouse/sen/presentation';

/**
 * Story Settings' Author's notes and Shop: what the creator shows readers
 * beside the world. The notes close the world's Verification panel; Link my
 * Shop puts a Shop card on the world's page that opens the creator's Store.
 * Neither reaches the chapter writer.
 */
export function StoryPresentationPanel({ story, busy, onSave }: {
  story: Pick<HarnessStory, 'authorNotes' | 'shopLinked'>;
  busy: boolean;
  onSave: (changes: { authorNotes?: string; shopLinked?: boolean }) => void;
}) {
  const titleId = useId();
  const notesId = useId();
  const saved = story.authorNotes ?? '';
  const [notes, setNotes] = useState(saved);
  const changed = notes.trim() !== saved;
  return <LibraryPanel as="section" padding="md" aria-labelledby={titleId} data-testid="story-settings-presentation">
    <div className="flex items-center gap-2">
      <NotebookPen size={18} className="text-cyan-200" aria-hidden="true" />
      <h2 id={titleId} className="font-display text-xl text-white">Author’s notes and Shop</h2>
    </div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-[10px] uppercase tracking-[0.14em] text-neutral-500" htmlFor={notesId}>Author’s notes</label>
        <textarea id={notesId} value={notes} maxLength={AUTHOR_NOTES_LIMIT} rows={5} disabled={busy}
          placeholder="A word to your readers: where the story came from, what is coming next…"
          onChange={event => setNotes(event.target.value)}
          className="mt-1 w-full resize-y rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-cyan-300/60" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] leading-relaxed text-neutral-500">Readers find them at the bottom of the world’s Verification panel.</p>
          <button type="button" disabled={busy || !changed} onClick={() => onSave({ authorNotes: notes })}
            className="min-h-11 rounded-full border border-cyan-300/40 px-4 text-sm text-cyan-50 hover:border-cyan-300/70 disabled:opacity-40">
            Save notes
          </button>
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">Shop</p>
        <div className="mt-1">
          <SEISwitch size="compact" className="!min-h-11 sm:!min-h-11" isSelected={story.shopLinked === true} isDisabled={busy}
            aria-describedby={`${titleId}-shop`} onChange={isSelected => onSave({ shopLinked: isSelected })}>
            Link my Shop
          </SEISwitch>
        </div>
        <p id={`${titleId}-shop`} className="mt-2 text-[11px] leading-relaxed text-neutral-500">
          Adds a Shop card to this world’s page that opens your Store. Leaving the Store brings readers back to this world. Off, the world shows no Shop.
        </p>
      </div>
    </div>
  </LibraryPanel>;
}
