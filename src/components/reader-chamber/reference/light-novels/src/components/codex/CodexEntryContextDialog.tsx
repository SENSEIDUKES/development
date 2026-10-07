import { useEffect, useMemo, useState } from 'react';
import FocusLock from 'react-focus-lock';
import { X } from 'lucide-react';
import type { CodexEntryContextValue } from '../../lib/codexEntryContext';
import { normalizeCodexEntryContext } from '../../lib/codexEntryContext';
import {
  findCodexAliasCollisions,
  type NamedCodexEntry,
} from '../../lib/codexContext';
import { CodexEntryContextFields } from './CodexEntryContextFields';

interface CodexEntryContextDialogProps {
  entry: NamedCodexEntry;
  peerEntries: NamedCodexEntry[];
  onClose: () => void;
  onSave: (value: CodexEntryContextValue) => void;
}

export function CodexEntryContextDialog({
  entry,
  peerEntries,
  onClose,
  onSave,
}: CodexEntryContextDialogProps) {
  const [draft, setDraft] = useState<CodexEntryContextValue>(() => ({
    aliases: entry.aliases ? [...entry.aliases] : undefined,
    contextPriority: entry.contextPriority,
    authorContextNote: entry.authorContextNote || '',
    provenance: entry.provenance ? { ...entry.provenance } : undefined,
  }));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const normalizedDraft = useMemo(
    () => normalizeCodexEntryContext(draft, entry.provenance, entry.name),
    [draft, entry.name, entry.provenance],
  );
  const collisions = useMemo(
    () => findCodexAliasCollisions(
      entry.id,
      entry.name,
      normalizedDraft.aliases,
      peerEntries,
    ),
    [entry.id, entry.name, normalizedDraft.aliases, peerEntries],
  );

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close generation context editor backdrop"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <FocusLock returnFocus>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="codex-context-dialog-title"
          className="relative w-full max-w-lg rounded-xl border border-portal/35 bg-neutral-950 p-5 shadow-[0_0_30px_rgba(4,172,255,0.14)]"
        >
          <div className="flex items-start justify-between gap-4 border-b border-neutral-900 pb-3">
            <div>
              <h3 id="codex-context-dialog-title" className="font-display text-lg text-signal">
                Generation Context
              </h3>
              <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">
                Manual identity and author guidance for {entry.name || 'this Codex entry'}. Aliases are exact recognition keys and are never proposed by generation.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close generation context editor"
              className="rounded border border-neutral-800 p-1 text-neutral-500 hover:border-portal/40 hover:text-portal"
            >
              <X size={14} />
            </button>
          </div>

          <CodexEntryContextFields
            idPrefix={`context-${entry.id || 'entry'}`}
            entityLabel={entry.name || 'Codex entry'}
            value={draft}
            onChange={(updates) => setDraft(current => ({ ...current, ...updates }))}
          />

          {collisions.length > 0 && (
            <div role="alert" className="mt-3 rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-300">
              {collisions.map(collision => (
                <p key={`${collision.alias}-${collision.conflictingEntryId || collision.conflictingEntryName}`}>
                  “{collision.alias}” already identifies {collision.conflictingEntryName}. Remove it before saving.
                </p>
              ))}
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2 border-t border-neutral-900 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-neutral-800 px-3 py-1.5 text-[10px] uppercase tracking-wider text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={collisions.length > 0}
              onClick={() => onSave(normalizedDraft)}
              className="rounded border border-portal bg-portal px-3 py-1.5 font-sc text-[10px] font-bold uppercase tracking-wider text-void disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save Context
            </button>
          </div>
        </div>
      </FocusLock>
    </div>
  );
}
