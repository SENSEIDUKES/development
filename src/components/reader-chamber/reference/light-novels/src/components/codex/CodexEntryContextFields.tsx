import React, { useState } from 'react';
import { Pin, X } from 'lucide-react';
import type { CodexEntryContextValue } from '../../lib/codexEntryContext';
import { normalizeCodexAliases } from '../../lib/codexContext';

interface CodexEntryContextFieldsProps {
  idPrefix: string;
  entityLabel: string;
  value: CodexEntryContextValue;
  onChange: (updates: Partial<CodexEntryContextValue>) => void;
  compact?: boolean;
}

export function CodexEntryContextFields({
  idPrefix,
  entityLabel,
  value,
  onChange,
  compact = false,
}: CodexEntryContextFieldsProps) {
  const [aliasDraft, setAliasDraft] = useState('');
  const aliases = value.aliases || [];
  const isPinned = value.provenance?.isUserPinned === true;
  const aliasInputId = `${idPrefix}-alias`;
  const priorityInputId = `${idPrefix}-context-priority`;
  const noteInputId = `${idPrefix}-author-context-note`;

  const addAlias = () => {
    if (!aliasDraft.trim()) {
      setAliasDraft('');
      return;
    }

    const normalized = normalizeCodexAliases([...aliases, aliasDraft], entityLabel);
    const isUnchanged = normalized.length === aliases.length
      && normalized.every((alias, index) => alias === aliases[index]);
    if (isUnchanged) {
      setAliasDraft('');
      return;
    }

    onChange({ aliases: normalized });
    setAliasDraft('');
  };

  const removeAlias = (index: number) => {
    const nextAliases = aliases.filter((_, aliasIndex) => aliasIndex !== index);
    onChange({ aliases: nextAliases.length > 0 ? nextAliases : undefined });
  };

  return (
    <section
      aria-label={`Generation context for ${entityLabel}`}
      className={`${compact ? 'space-y-2 pt-2' : 'space-y-3 border-t border-neutral-800 pt-4 mt-4'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} text-portal uppercase tracking-wider font-bold font-sc`}>
          Generation Context
        </span>
        <button
          type="button"
          aria-pressed={isPinned}
          aria-label={isPinned ? `Unpin ${entityLabel} from context` : `Pin ${entityLabel} to context`}
          onClick={() => onChange({
            provenance: {
              ...(value.provenance || {}),
              isUserPinned: !isPinned,
            },
          })}
          className={`flex items-center gap-1 rounded border px-2 py-1 font-mono uppercase tracking-wider transition-colors ${
            isPinned
              ? 'border-portal/60 bg-portal/15 text-portal'
              : 'border-neutral-800 bg-neutral-950 text-neutral-500 hover:border-portal/40 hover:text-portal'
          } ${compact ? 'text-[8px]' : 'text-[9px]'}`}
        >
          <Pin size={compact ? 9 : 10} fill={isPinned ? 'currentColor' : 'none'} />
          <span>{isPinned ? 'Pinned' : 'Pin'}</span>
        </button>
      </div>

      <div>
        <label
          className={`${compact ? 'text-[8px]' : 'text-[10px]'} text-neutral-500 uppercase tracking-wider block mb-1`}
          htmlFor={aliasInputId}
        >
          Aliases &amp; known titles
        </label>
        {aliases.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {aliases.map((alias, index) => (
              <span
                key={`${alias}-${index}`}
                className={`${compact ? 'text-[8px]' : 'text-[9px]'} inline-flex items-center gap-1 rounded border border-portal/20 bg-portal/5 px-1.5 py-0.5 text-neutral-300`}
              >
                {alias}
                <button
                  type="button"
                  aria-label={`Remove ${alias} from ${entityLabel}`}
                  onClick={() => removeAlias(index)}
                  className="text-neutral-500 hover:text-human"
                >
                  <X size={compact ? 8 : 9} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            id={aliasInputId}
            type="text"
            value={aliasDraft}
            onChange={(event) => setAliasDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addAlias();
              }
            }}
            aria-label={`New alias or known title for ${entityLabel}`}
            placeholder="Exact alternate name or title"
            className={`${compact ? 'p-1 text-[9px]' : 'p-1.5 text-xs'} min-w-0 flex-1 rounded border border-neutral-800 bg-neutral-950 text-neutral-300 outline-none focus:border-portal`}
          />
          <button
            type="button"
            aria-label={`Add alias or known title for ${entityLabel}`}
            onClick={addAlias}
            className={`${compact ? 'px-1.5 text-[8px]' : 'px-2 text-[9px]'} rounded border border-neutral-700 bg-neutral-800 font-mono uppercase tracking-wider text-neutral-300 hover:bg-neutral-700`}
          >
            Add
          </button>
        </div>
      </div>

      <div>
        <label
          className={`${compact ? 'text-[8px]' : 'text-[10px]'} text-neutral-500 uppercase tracking-wider block mb-1`}
          htmlFor={priorityInputId}
        >
          Context priority
        </label>
        <input
          id={priorityInputId}
          type="number"
          step="1"
          value={value.contextPriority ?? ''}
          onChange={(event) => {
            const nextValue = event.target.value;
            const parsed = Number(nextValue);
            onChange({
              contextPriority: nextValue !== '' && Number.isFinite(parsed) ? parsed : undefined,
            });
          }}
          className={`${compact ? 'p-1 text-[9px]' : 'p-1.5 text-xs'} w-full rounded border border-neutral-800 bg-neutral-950 text-neutral-300 outline-none focus:border-portal`}
        />
      </div>

      <div>
        <div className="mb-1 flex items-end justify-between gap-2">
          <label
            className={`${compact ? 'text-[8px]' : 'text-[10px]'} text-neutral-500 uppercase tracking-wider`}
            htmlFor={noteInputId}
          >
            Author context note
          </label>
          <span className={`${compact ? 'text-[7px]' : 'text-[8px]'} font-mono text-neutral-600`}>
            {(value.authorContextNote || '').length}/1000
          </span>
        </div>
        <textarea
          id={noteInputId}
          value={value.authorContextNote || ''}
          onChange={(event) => onChange({ authorContextNote: event.target.value })}
          maxLength={1000}
          rows={compact ? 2 : 3}
          placeholder="Author-written guidance for generation context..."
          className={`${compact ? 'p-1 text-[9px]' : 'p-2 text-xs'} w-full resize-none rounded border border-neutral-800 bg-neutral-950 text-neutral-300 outline-none focus:border-portal`}
        />
      </div>
    </section>
  );
}
