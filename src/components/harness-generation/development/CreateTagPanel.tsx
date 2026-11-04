import type { ReactNode } from 'react';
import { LoaderCircle, Sparkles } from 'lucide-react';
import type { ChapterTaggingAccount } from '../shared/chapterTagging';
import { CREATE_TAG_GROUPS, CREATE_TAG_KINDS, createTagTone, nextLit, type CreateTagLit, type CreateTagRow } from './createTags';
import './reader-colors.css';

/**
 * Create mode's panel above the chapter: every tag on the page, Media and
 * Story info apart, each kind a color you can tap to see it alone (tap it
 * again for every tag), All and Off, and Tag this chapter (again). On a phone
 * the kinds are compact chips and the one lit alone says what it holds; on a
 * wider page each kind says what it holds beside its color. The panel scrolls
 * with the chapter, so the prose is never covered.
 */
export function CreateTagPanel({ rows, lit, onLight, saving, editable, sealedNote, account, tagging, children }: {
  rows: readonly CreateTagRow[];
  lit: CreateTagLit;
  onLight: (lit: CreateTagLit) => void;
  /** Where the page's saves stand, while it can be changed. */
  saving?: 'saved' | 'saving' | 'failed';
  /** Whether the chapter can be changed here: highlight words to change them or place media. */
  editable: boolean;
  /** Why it cannot, when it cannot. */
  sealedNote?: string;
  /** The tagger's record of the chapter. */
  account: ChapterTaggingAccount;
  /** Tag this chapter (again): absent where this Reader cannot tag. */
  tagging?: { busy: boolean; disabled?: boolean; problem?: string; onTag: () => void };
  /** What the page has to say under the tags: notices, effects waiting for a new spot. */
  children?: ReactNode;
}) {
  const alone = rows.find(row => row.kind === lit);
  const segment = (on: boolean) => `min-h-11 min-w-14 rounded-full px-4 text-xs font-medium transition-colors ${on
    ? 'bg-(--reader-light)/15 text-(--reader-light)' : 'text-(--reader-text-dim) hover:text-(--reader-text)'}`;
  return <section className="mb-6 space-y-3 rounded-2xl border border-(--reader-light)/10 bg-(--reader-light)/[0.03] p-2.5 font-sans text-sm sm:space-y-4 sm:p-4"
    aria-label="Create mode" data-testid="create-mode-panel" data-lit={lit}>
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 ps-1">
        <p className="font-semibold text-(--reader-text)">Create mode</p>
        {editable
          ? <p role="status" className="text-xs text-(--reader-text-dim)" data-testid="create-mode-saving">
              {saving === 'saving' ? 'Saving…' : saving === 'failed' ? 'Not saved' : 'Saved'}
            </p>
          : <p className="text-xs text-(--reader-text-dim)" data-testid="create-mode-sealed">Sealed · tags only</p>}
      </div>
      <div className="flex shrink-0 rounded-full border border-(--reader-light)/10 p-0.5" role="group" aria-label="Tags on the page">
        <button type="button" aria-pressed={lit === 'all'} className={segment(lit === 'all')} onClick={() => onLight('all')}>All</button>
        <button type="button" aria-pressed={lit === 'off'} className={segment(lit === 'off')} onClick={() => onLight('off')}>Off</button>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 sm:gap-6" data-testid="create-tags">
      {CREATE_TAG_GROUPS.map(group => <div key={group.id} className="min-w-0" role="group" aria-labelledby={`create-tags-${group.id}`} data-tag-group={group.id}>
        <p id={`create-tags-${group.id}`} className="mb-1.5 ps-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-(--reader-text-muted)">{group.label}</p>
        {/* A phone shows a fixed palette, one row of tiles per group; a wider page, one row per kind with what it holds. */}
        <ul className={`grid ${group.kinds.length === 3 ? 'grid-cols-3' : 'grid-cols-4'} gap-1.5 sm:flex sm:flex-col sm:gap-1`}>
          {group.kinds.map(kind => {
            const row = rows.find(entry => entry.kind === kind)!;
            const on = lit === 'all' || lit === kind;
            return <li key={kind} className="min-w-0 sm:w-full">
              <button type="button" aria-pressed={lit === kind} onClick={() => onLight(nextLit(lit, kind))}
                data-tag-kind={kind} data-found={row.found || undefined} aria-label={`${CREATE_TAG_KINDS[kind].label}${row.count ? ` ${row.count}` : ''}`}
                className={`flex min-h-13 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-1.5 text-center transition-colors sm:min-h-11 sm:flex-row sm:items-start sm:gap-2.5 sm:px-3 sm:py-2 sm:text-left ${lit === kind
                  ? 'border-(--reader-light)/35 bg-(--reader-light)/10 text-(--reader-light)'
                  : on && row.found ? 'border-(--reader-light)/12 text-(--reader-text)' : 'border-(--reader-light)/6 text-(--reader-text-faint)'}`}>
                <span className="flex items-center gap-1.5 sm:mt-1">
                  <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-white/15 ${on && row.found ? '' : 'opacity-30'}`}
                    style={{ background: createTagTone(kind) }} />
                  {row.count > 0 && <span className="text-[11px] tabular-nums text-(--reader-text-dim) sm:hidden">{row.count.toLocaleString()}</span>}
                </span>
                <span className="block w-full min-w-0">
                  <span className="block truncate text-[11px] font-medium tracking-tight sm:text-[13px] sm:tracking-normal">
                    {CREATE_TAG_KINDS[kind].label}
                    {row.count > 0 && <span className="ms-1.5 hidden tabular-nums text-(--reader-text-dim) sm:inline">{row.count.toLocaleString()}</span>}
                  </span>
                  <span className="hidden text-xs leading-snug text-(--reader-text-dim) sm:block">{row.said}</span>
                </span>
              </button>
            </li>;
          })}
        </ul>
      </div>)}
    </div>
    {/* On a phone, the kind lit alone says what it holds. */}
    {alone && <p className="ps-1 text-xs leading-relaxed text-(--reader-text-soft) sm:hidden" data-testid="create-tag-said">
      <span className="font-medium text-(--reader-light)">{CREATE_TAG_KINDS[alone.kind].label}</span> · {alone.said}
    </p>}

    {editable
      ? <p className="ps-1 text-xs leading-relaxed text-(--reader-text-dim)">Select words to edit them or add media. Changes save as you make them.</p>
      : sealedNote && <p className="ps-1 text-xs leading-relaxed text-(--reader-text-dim)">{sealedNote}</p>}
    {children}

    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-(--reader-light)/8 pt-3">
      {tagging && <button type="button" onClick={tagging.onTag} disabled={tagging.busy || tagging.disabled} aria-busy={tagging.busy || undefined}
        data-testid="create-mode-tag"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-(--reader-accent-bright)/40 bg-(--reader-accent)/12 px-4 text-xs font-semibold text-(--reader-accent-mist) transition-colors hover:bg-(--reader-accent)/22 disabled:opacity-50">
        {tagging.busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
        {tagging.busy ? 'Reading the chapter…' : account.status === 'untagged' ? 'Tag this chapter' : 'Tag this chapter again'}
      </button>}
      <details className="min-w-0 text-xs text-(--reader-text-dim)" data-testid="create-mode-record">
        <summary className="flex min-h-11 cursor-pointer items-center text-(--reader-text-muted)">Tagger record</summary>
        <div className="space-y-1 pb-1">
          <p>{account.headline}</p>
          {account.notes && <p>{account.notes}</p>}
          {account.problem && <p className="text-(--reader-warning-pale)">{account.problem}</p>}
          {account.problems.length > 0 && <ul className="list-disc space-y-1 ps-4">{account.problems.map((entry, index) => <li key={index}>{entry}</li>)}</ul>}
        </div>
      </details>
      {tagging?.problem && <p role="alert" className="w-full text-xs text-(--reader-warning-pale)">{tagging.problem}</p>}
    </div>
  </section>;
}
