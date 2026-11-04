import { useState, type ReactNode } from 'react';
import { Eye, EyeOff, LoaderCircle, MoreHorizontal, Sparkles } from 'lucide-react';
import { SEIPopover, SEIPopoverContent, SEIPopoverTitle, SEIPopoverTrigger } from '@seihouse/ui';
import { lineTone } from '@seihouse/sen/highlight-engine';
import type { ChapterTaggingAccount } from '../shared/chapterTagging';
import { CREATE_TAG_GROUPS, CREATE_TAG_KINDS, createTagLine, createTagStyle, createTagTone, nextLit, type CreateTagGroupId, type CreateTagLit, type CreateTagRow } from './createTags';
import { controlFeedback, pickerHeading, pickerRow, pickerSurface } from './readerPicker';
import './reader-colors.css';

/**
 * Create mode's panel above the chapter, a quiet legend (SENSEI, 2026-11-04:
 * "what would Apple do?"): every tag kind as a colored dot and its name, Media
 * and Story info apart, with no boxes around them. Tap a kind to see it alone
 * (the others fade; tap again for every tag), and it says what it holds. The
 * eye shows or hides every tag (hidden is the page as a reader sees it). The
 * panel says nothing while the page is saved; it speaks only while saving, on
 * a failed save, and on a sealed chapter. Tag this chapter (again), Tag media
 * again, the tagger's record and the one help line live in the ⋯ menu; a
 * media kind lit alone also offers Tag media again right under the legend. On a wider page
 * each kind says what it holds beside its color. The panel scrolls with the
 * chapter, so the prose is never covered.
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
  /**
   * Tag this chapter (again), and Tag media again, its sound alone: absent
   * where this Reader cannot tag. `onTagMedia` is absent where the media
   * cannot be read on its own (the chapter was never fully read, or has no sound equipped).
   */
  tagging?: {
    /** Which read is running. */
    busy?: 'all' | 'media';
    disabled?: boolean;
    problem?: string;
    onTag: () => void;
    onTagMedia?: () => void;
    /** The host's Energy price for a read (the same for both). */
    cost?: ReactNode;
  };
  /** What the page has to say under the tags: notices, effects waiting for a new spot. */
  children?: ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  const alone = rows.find(row => row.kind === lit);
  const mediaKinds = CREATE_TAG_GROUPS.find(group => group.id === 'media')!.kinds;
  // A media kind lit alone offers its group read again on its own, right where the author is looking.
  const mediaAction = tagging?.onTagMedia && alone && mediaKinds.includes(alone.kind) ? tagging : undefined;
  const busy = Boolean(tagging?.busy);
  const shown = lit !== 'off';
  const iconButton = `grid h-11 w-11 shrink-0 place-items-center rounded-full text-(--reader-text-dim) hover:bg-(--reader-light)/8 hover:text-(--reader-text) ${controlFeedback}`;
  const label = (group: CreateTagGroupId, id: string) => <p id={id} className="ps-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-(--reader-text-muted)">
    {CREATE_TAG_GROUPS.find(entry => entry.id === group)!.label}
  </p>;

  const legend = (group: CreateTagGroupId) => {
    const { kinds } = CREATE_TAG_GROUPS.find(entry => entry.id === group)!;
    // A phone shows each group as one row of dots; a wider page, one line per kind with what it holds.
    return <ul className={`grid ${kinds.length === 3 ? 'grid-cols-3' : 'grid-cols-4'} gap-1 sm:flex sm:flex-col sm:gap-0 sm:divide-y sm:divide-(--reader-light)/6`}>
      {kinds.map(kind => {
        const row = rows.find(entry => entry.kind === kind)!;
        const solo = lit === kind;
        // Others fade while one kind is lit alone, and all of them while the tags are hidden.
        const faded = !shown || (alone !== undefined && !solo);
        const name = CREATE_TAG_KINDS[kind].label;
        return <li key={kind} className="min-w-0 sm:w-full">
          <button type="button" aria-pressed={solo} onClick={() => onLight(nextLit(lit, kind))}
            data-tag-kind={kind} data-found={row.found || undefined} aria-label={row.count ? `${name}, ${row.count}` : name}
            className={`flex min-h-13 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-center motion-safe:transition-[background-color,opacity] motion-safe:duration-200 motion-safe:ease-out sm:min-h-11 sm:flex-row sm:items-start sm:gap-2.5 sm:rounded-xl sm:px-2 sm:py-2.5 sm:text-left ${controlFeedback} ${solo
              ? 'bg-(--reader-light)/10 text-(--reader-light)' : row.found ? 'text-(--reader-text) hover:bg-(--reader-light)/5' : 'text-(--reader-text-faint) hover:bg-(--reader-light)/5'} ${faded ? 'opacity-45' : ''}`}>
            <span className="flex h-4 items-center gap-1.5 sm:mt-0.5">
              {/* The swatch is drawn the way the page draws the kind: a dot for a highlight, a short line for an underline.
                  A kind with tags is solid; a kind with none, hollow and faint. */}
              {createTagStyle(kind) === 'underline'
                ? createTagLine(kind) === 'dotted'
                  // A dotted line is three dots, solid with tags and faint without.
                  ? <span aria-hidden="true" data-swatch="underline-dotted" className="flex w-3.5 shrink-0 justify-between" style={row.found ? undefined : { opacity: 0.5 }}>
                    {[0, 1, 2].map(dot => <span key={dot} className="h-[3px] w-[3px] rounded-full" style={{ background: lineTone(createTagTone(kind)) }} />)}
                  </span>
                  : <span aria-hidden="true" data-swatch="underline" className="h-[3px] w-3.5 shrink-0 rounded-full"
                    style={row.found ? { background: lineTone(createTagTone(kind)) } : { boxShadow: `inset 0 0 0 1px ${lineTone(createTagTone(kind))}`, opacity: 0.5 }} />
                : <span aria-hidden="true" data-swatch="fill" className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={row.found ? { background: createTagTone(kind) } : { boxShadow: `inset 0 0 0 1.5px ${createTagTone(kind)}`, opacity: 0.5 }} />}
              {row.count > 0 && <span className="text-[11px] tabular-nums text-(--reader-text-dim) sm:hidden">{row.count.toLocaleString()}</span>}
            </span>
            <span className="block w-full min-w-0">
              <span className="block truncate text-[11px] font-medium tracking-tight sm:text-[13px] sm:tracking-normal">
                {name}
                {row.count > 0 && <span className="ms-1.5 hidden tabular-nums text-(--reader-text-dim) sm:inline">{row.count.toLocaleString()}</span>}
              </span>
              <span className="hidden text-xs leading-snug text-(--reader-text-dim) sm:mt-0.5 sm:block">{row.said}</span>
            </span>
          </button>
        </li>;
      })}
    </ul>;
  };

  const status = !editable ? 'Sealed' : saving === 'saving' ? 'Saving…' : saving === 'failed' ? 'Not saved' : '';
  // One set of controls, at the panel's top corner: beside Media's label on a phone, over Story info on a wider page.
  const controls = <div className="absolute end-1 top-1 flex items-center sm:end-3">
    <span role="status" title={editable ? undefined : sealedNote} data-testid={editable ? 'create-mode-saving' : 'create-mode-sealed'} data-saving={editable ? saving : undefined}
      className={`me-1 text-xs ${saving === 'failed' ? 'text-(--reader-warning-pale)' : 'text-(--reader-text-dim)'}`}>{status}</span>
    <button type="button" aria-pressed={shown} aria-label="Show tags" title={shown ? 'Hide tags' : 'Show tags'} data-testid="create-mode-show-tags"
      onClick={() => onLight(shown ? 'off' : 'all')} className={iconButton}>
      {shown ? <Eye className="h-[18px] w-[18px]" aria-hidden /> : <EyeOff className="h-[18px] w-[18px]" aria-hidden />}
    </button>
    <SEIPopover modal={false} open={menu} onOpenChange={setMenu}>
      <SEIPopoverTrigger aria-label="Chapter options" title="Chapter options" data-testid="create-mode-menu" className={iconButton}>
        <MoreHorizontal className="h-5 w-5" aria-hidden />
      </SEIPopoverTrigger>
      <SEIPopoverContent side="bottom" align="end" sideOffset={6} collisionPadding={12} variant="dark" className={pickerSurface} data-testid="create-mode-options">
        <SEIPopoverTitle className={pickerHeading}>{editable ? 'Select words to edit them or add media.' : sealedNote ?? 'This chapter is sealed.'}</SEIPopoverTitle>
        {tagging && <button type="button" onClick={tagging.onTag} disabled={busy || tagging.disabled} aria-busy={tagging.busy === 'all' || undefined}
          data-testid="create-mode-tag" className={`${pickerRow} disabled:opacity-50`}>
          {tagging.busy === 'all' ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none text-(--reader-accent-soft)" aria-hidden /> : <Sparkles className="h-4 w-4 shrink-0 text-(--reader-accent-soft)" aria-hidden />}
          <span className="min-w-0 flex-1">{tagging.busy === 'all' ? 'Reading the chapter…' : account.status === 'untagged' ? 'Tag this chapter' : 'Tag this chapter again'}</span>
          {tagging.cost}
        </button>}
        {tagging?.onTagMedia && <button type="button" onClick={tagging.onTagMedia} disabled={busy || tagging.disabled} aria-busy={tagging.busy === 'media' || undefined}
          data-testid="create-mode-tag-media" className={`${pickerRow} disabled:opacity-50`}>
          {tagging.busy === 'media' ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none text-(--reader-accent-soft)" aria-hidden /> : <Sparkles className="h-4 w-4 shrink-0 text-(--reader-accent-soft)" aria-hidden />}
          <span className="min-w-0 flex-1">{tagging.busy === 'media' ? 'Reading its media…' : 'Tag media again'}</span>
          {tagging.cost}
        </button>}
        {tagging?.problem && <p role="alert" className="px-3 pb-2 text-xs text-(--reader-warning-pale)">{tagging.problem}</p>}
        <details className="group text-xs text-(--reader-text-dim)" data-testid="create-mode-record">
          <summary className={`${pickerRow} cursor-pointer list-none text-sm text-(--reader-text)`}>Tagger record</summary>
          <div className="space-y-1 px-3 pb-2.5">
            <p>{account.headline}</p>
            {account.notes && <p>{account.notes}</p>}
            {account.problem && <p className="text-(--reader-warning-pale)">{account.problem}</p>}
            {account.problems.length > 0 && <ul className="list-disc space-y-1 ps-4">{account.problems.map((entry, index) => <li key={index}>{entry}</li>)}</ul>}
          </div>
        </details>
      </SEIPopoverContent>
    </SEIPopover>
  </div>;

  return <section className="relative mb-6 rounded-[20px] bg-(--reader-light)/[0.03] px-2.5 pb-2.5 font-sans text-sm sm:px-4 sm:pb-4"
    aria-label="Create mode: the chapter's tags" data-testid="create-mode-panel" data-lit={lit}>
    <div className="grid sm:grid-cols-2 sm:gap-x-8" data-testid="create-tags">
      <div className="min-w-0" role="group" aria-labelledby="create-tags-media" data-tag-group="media">
        <div className="flex min-h-12 items-center pe-36 pt-1">{label('media', 'create-tags-media')}</div>
        {legend('media')}
      </div>
      <div className="mt-2 min-w-0 sm:mt-0" role="group" aria-labelledby="create-tags-info" data-tag-group="info">
        <div className="flex min-h-7 items-center sm:min-h-12 sm:pe-36 sm:pt-1">{label('info', 'create-tags-info')}</div>
        {legend('info')}
      </div>
    </div>
    {controls}
    {/* The kind lit alone says what it holds, on a phone; the line opens without moving anything above it. */}
    <div className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 motion-safe:ease-out sm:hidden ${alone ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <div className="min-h-0 overflow-hidden">
        {alone && <p className="px-1 pt-2 text-xs leading-relaxed text-(--reader-text-soft)" data-testid="create-tag-said">
          <span className="font-medium text-(--reader-light)">{CREATE_TAG_KINDS[alone.kind].label}</span> · {alone.said}
        </p>}
      </div>
    </div>
    {/* A media kind lit alone: its group read again on its own, the sound tags only. */}
    {mediaAction && <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
      <button type="button" onClick={mediaAction.onTagMedia} disabled={busy || mediaAction.disabled} aria-busy={mediaAction.busy === 'media' || undefined}
        data-testid="create-tag-media-inline"
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-(--reader-light)/12 px-4 text-xs font-medium text-(--reader-text) hover:bg-(--reader-light)/8 disabled:opacity-50 ${controlFeedback}`}>
        {mediaAction.busy === 'media' ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none text-(--reader-accent-soft)" aria-hidden /> : <Sparkles className="h-4 w-4 text-(--reader-accent-soft)" aria-hidden />}
        {mediaAction.busy === 'media' ? 'Reading its media…' : 'Tag media again'}
        {mediaAction.busy !== 'media' && mediaAction.cost}
      </button>
      <span className="text-xs text-(--reader-text-dim)">Sound only: everything else stays as it is.</span>
    </div>}
    {mediaAction?.problem && <p role="alert" className="mt-1 px-1 text-xs text-(--reader-warning-pale)">{mediaAction.problem}</p>}
    {children && <div className="mt-3 space-y-3">{children}</div>}
  </section>;
}
