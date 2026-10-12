import { useEffect, useRef, useState } from 'react';
import { ENGINE_PARTS, partBrief, type EnginePart } from './parts';

/** Clipboard when allowed; otherwise copy from a temporary selected text field. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    const copied = document.execCommand?.('copy') ?? false;
    field.remove();
    return copied;
  }
}

/**
 * Workshop-only Parts board: every named part of the engine with a Copy
 * button, so a specific piece can be handed to an agent in one paste.
 */
export function PartsBoard({ parts = ENGINE_PARTS }: { parts?: readonly EnginePart[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async (part: EnginePart) => {
    setCopied(await copyText(partBrief(part)) ? part.name : null);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 2000);
  };
  return <details className="mb-6 rounded-lg border border-slate-700/70 bg-slate-900/40 text-sm text-slate-300" data-testid="engine-parts">
    <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
      Parts · {parts.length}
    </summary>
    <ul className="space-y-1 px-3 pb-3">
      {parts.map(part => <li key={part.name} className="flex items-start justify-between gap-3 border-t border-slate-800 pt-2">
        <div className="min-w-0">
          <p className="text-slate-100">{part.name}</p>
          <p className="text-xs text-slate-400">{part.owns}</p>
        </div>
        <button type="button" className="min-h-9 shrink-0 rounded-lg border border-slate-600 px-3 text-xs text-slate-200 hover:bg-slate-800"
          aria-label={`Copy ${part.name} brief`} onClick={() => { void copy(part); }}>
          {copied === part.name ? 'Copied' : 'Copy'}
        </button>
      </li>)}
    </ul>
  </details>;
}
