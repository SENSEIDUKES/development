import { useEffect, useId, useMemo, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { ArrowRight, ChevronRight, ExternalLink, Landmark, Package, Pencil, Play } from 'lucide-react';
import {
  LibraryButton, LibraryPanel,
  LibraryManifestingIcon as SENManifestingIcon, LibraryNavigationIcon as SENNavigationIcon,
} from '@seihouse/library-ui';
import { SEIEmptyState, SEIErrorState, SEISkeleton } from '@seihouse/ui';
import { useLibraryAssets } from '../../../library/assets';
import { formatEnergy } from '../../energy/development/EnergyAmount';
import type { CreatorSpaceProps, CreatorToolkitItem, CreatorToolkitKind, CreatorWorld, CreatorWorldStatus } from '../shared/creatorSpaceContracts';
import { WorldCard, WORLD_STATUS_LABELS } from '../../world-card/development/WorldCard';
import './creator-space.css';
import { EnergySunIcon } from '../../energy/development/EnergySunIcon';

const TOOLKIT_PREVIEW_NOTICE = 'The plugin browser is still being built. For now, open a world to choose its styles, soundscapes, cues and atmospheres.';

export const creatorWorldMeta = (world: CreatorWorld) =>
  `Ch. ${world.chapterCount} · ${WORLD_STATUS_LABELS[world.status]}`;
export const creatorWorldCountLabel = (count: number) => `${count} ${count === 1 ? 'world' : 'worlds'}`;

/** Stable pick of the Library's own celestial art for a world with no cover yet. */
function fallbackCover(id: string, images: readonly string[]) {
  if (!images.length) return undefined;
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return images[hash % images.length];
}

/**
 * The Library's Create page: a compact creator workspace over the host's worlds.
 * Story truth, Energy and every destination belong to the host; this page only
 * presents them and reports which world the creator wants to work on.
 */
export function CreatorSpace({
  worlds, energy, toolkit, onCreate, onOpenEnergy, onContinueWorld, onOpenWorld, onEditWorld, onBrowseToolkit, browseToolkitHref, canImportPlugins, onRetryWorlds, sparks,
}: CreatorSpaceProps) {
  const items = useMemo(() => worlds.status === 'ready'
    ? [...worlds.items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    : [], [worlds]);
  const inProgress = worlds.status === 'ready' ? items.filter(world => world.status !== 'complete').length : null;
  const energyValue = energy.status === 'ready' && energy.snapshot ? formatEnergy(energy.snapshot.available) : '—';
  const energyNote = energy.status === 'loading' ? 'Loading' : energy.status === 'error' ? 'Unavailable'
    : energy.status === 'unavailable' ? 'Not connected' : undefined;

  return <div data-creator-space className="creator-space space-y-6 pb-4 text-signal sm:space-y-9">
    <section aria-labelledby="creator-space-title" className="space-y-4 md:max-w-3xl">
      <div className="creator-space-heading">
        <h1 id="creator-space-title" className="creator-space-title font-display font-bold leading-none tracking-tight text-signal">Creator Space</h1>
        <div className="creator-space-actions">
          <LibraryButton type="button" size="md" icon={SENManifestingIcon} onClick={onCreate}>Create</LibraryButton>
          {sparks}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CreatorStat label="Energy" value={energyValue} note={energyNote} onSelect={onOpenEnergy}
          icon={<EnergySunIcon size={26} className="text-portal" />} />
        <CreatorStat label="In progress" value={inProgress === null ? '—' : String(inProgress)}
          icon={<SENNavigationIcon name="scroll" size={26} className="text-portal" aria-hidden="true" />} />
      </div>
    </section>

    <section aria-labelledby="creator-worlds-title" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="creator-worlds-title" className="font-display text-[1.75rem] font-bold leading-tight text-signal sm:text-3xl">Your worlds</h2>
        {worlds.status === 'ready' && <p className="font-sans text-sm text-neutral-300">{creatorWorldCountLabel(items.length)}</p>}
      </div>
      {worlds.status === 'loading' && <WorldsLoading />}
      {worlds.status === 'error' && <LibraryPanel padding="sm">
        <SEIErrorState titleAs="h3" size="sm" title="Your worlds could not be opened"
          description={worlds.error}
          action={onRetryWorlds && <LibraryButton type="button" variant="secondary" size="md" onClick={onRetryWorlds}>Try again</LibraryButton>} />
      </LibraryPanel>}
      {worlds.status === 'ready' && items.length === 0 && <LibraryPanel padding="sm">
        <SEIEmptyState titleAs="h3" size="sm" icon={SENManifestingIcon} title="No worlds yet"
          description="Use Create above to start your first world from a Story Seed. It will appear here as soon as its story begins." />
      </LibraryPanel>}
      {worlds.status === 'ready' && items.length > 0 && <WorldsRow worlds={items}
        onContinueWorld={onContinueWorld} onOpenWorld={onOpenWorld} onEditWorld={onEditWorld} />}
    </section>

    <CreatorToolkit items={toolkit} onBrowse={onBrowseToolkit} browseHref={browseToolkitHref} canImport={canImportPlugins} />
  </div>;
}

function CreatorStat({ icon, label, value, note, onSelect }: {
  icon: ReactNode; label: string; value: string; note?: string; onSelect?: () => void;
}) {
  const body = <>
    <span className="shrink-0">{icon}</span>
    <span className="min-w-0 flex-1 text-left">
      <span className="block font-sans text-xs text-neutral-300">{label}</span>
      <span className="block font-display text-[1.75rem] font-semibold leading-none text-signal tabular-nums">{value}</span>
      {note && <span className="mt-1 block font-sans text-[11px] text-neutral-400">{note}</span>}
    </span>
    {onSelect && <ChevronRight size={18} className="shrink-0 text-neutral-300" aria-hidden="true" />}
  </>;
  return onSelect
    ? <button type="button" className="creator-space-stat" onClick={onSelect}>{body}</button>
    : <div className="creator-space-stat">{body}</div>;
}

function CreatorToolkit({ items, onBrowse, browseHref, canImport }: {
  items: readonly CreatorToolkitItem[];
  onBrowse?: (kind?: CreatorToolkitKind) => void;
  browseHref?: string;
  canImport?: boolean;
}) {
  const [notice, setNotice] = useState(false);
  const browse = () => { if (onBrowse) onBrowse(); else setNotice(true); };
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onBrowse || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onBrowse();
  };
  const art = items.find(item => item.imageUrl)?.imageUrl;
  const browseContent = <>
    {art && <img src={art} alt="" className="creator-space-tool-art" loading="lazy" referrerPolicy="no-referrer" />}
    <span className="relative z-[1] flex flex-col items-start gap-2 text-left">
      <span className="creator-space-tool-icon"><Package size={18} aria-hidden="true" /></span>
      <span className="flex items-center gap-3 font-display text-xl font-semibold text-signal">Browse plugins <ArrowRight size={18} aria-hidden="true" /></span>
      <span className="max-w-64 font-sans text-sm leading-relaxed text-neutral-300">Style packs, soundscapes, cues and atmospheres for your worlds.</span>
    </span>
  </>;
  return <section aria-labelledby="creator-toolkit-title" className="space-y-3">
    <div className="flex items-center gap-2">
      <h2 id="creator-toolkit-title" className="font-display text-xl font-bold text-signal sm:text-2xl">Creator Toolkit</h2>
      {!onBrowse && !browseHref && <span className="creator-space-tag">Preview</span>}
    </div>
    <div className="creator-space-toolkit">
      {browseHref
        ? <a href={browseHref} className="creator-space-tool" onClick={follow}>{browseContent}</a>
        : <button type="button" className="creator-space-tool" onClick={browse}>{browseContent}</button>}
      <div className="creator-space-studios">
        <span className="creator-space-tool-icon"><Landmark size={18} aria-hidden="true" /></span>
        <h3 className="font-display text-xl font-semibold text-signal">Studios</h3>
        <p className="font-sans text-sm leading-relaxed text-neutral-300">Create your own plugins in Studio, then bring your exported packages back to your worlds.</p>
        <div className="flex flex-wrap items-center gap-2">
          <a className="creator-space-link" href="https://studio.novelexpanded.com" target="_blank" rel="noopener noreferrer">
            Open Studio <ExternalLink size={16} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
          </a>
          {canImport && browseHref && <a href={browseHref} className="creator-space-link" onClick={follow}>Import plugins <ArrowRight size={16} aria-hidden="true" /></a>}
        </div>
      </div>
    </div>
    <p role="status" className="font-sans text-xs leading-relaxed text-neutral-300 empty:hidden">{notice ? TOOLKIT_PREVIEW_NOTICE : ''}</p>
  </section>;
}

function WorldsLoading() {
  return <div className="creator-space-rail" role="status" aria-label="Loading your worlds">
    {[0, 1, 2].map(index => <SEISkeleton key={index} radius="lg" className="creator-space-world-skeleton" />)}
  </div>;
}

function WorldsRow({ worlds, onContinueWorld, onOpenWorld, onEditWorld }: {
  worlds: readonly CreatorWorld[];
  onContinueWorld: (worldId: string) => void;
  onOpenWorld: (world: CreatorWorld) => void;
  onEditWorld: (worldId: string) => void;
}) {
  const { homeImages = [] } = useLibraryAssets();
  const [selectedId, setSelectedId] = useState<string>();
  const selected = worlds.find(world => world.id === selectedId) ?? worlds[0];
  const complete = selected.status === 'complete';
  const titleId = useId();
  const noteId = useId();
  const rowRef = useRef<HTMLUListElement>(null);
  const pages = useRowPages(rowRef, worlds.length);

  return <>
    <ul ref={rowRef} className="creator-space-rail creator-space-worlds" aria-label="Your worlds">
      {worlds.map(world => {
        const cover = world.imageUrl ?? fallbackCover(world.id, homeImages);
        const isSelected = world.id === selected.id;
        return <li key={world.id}>
          <WorldCard face="compact" world={world} cover={cover} fallbackCover={!world.imageUrl}
            selected={isSelected} onOpen={() => { setSelectedId(world.id); onOpenWorld(cover ? { ...world, imageUrl: cover } : world); }} />
        </li>;
      })}
    </ul>
    {pages.count > 1 && <div className="creator-space-dots" aria-hidden="true">
      {Array.from({ length: pages.count }, (_, index) => <span key={index} data-active={index === pages.active || undefined} />)}
    </div>}
    <div className="creator-space-selected">
      <h3 id={titleId} className="font-display text-xl font-bold leading-snug text-signal sm:text-2xl">{selected.title}</h3>
      <p className="mt-1 font-sans text-xs text-neutral-300">{creatorWorldMeta(selected)}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <LibraryButton type="button" variant="primary" size="md" fullWidth icon={Play} disabled={complete}
          aria-describedby={complete ? `${titleId} ${noteId}` : titleId} onClick={() => onContinueWorld(selected.id)}>
          Continue
        </LibraryButton>
        <LibraryButton type="button" variant="secondary" size="md" fullWidth icon={Pencil}
          aria-describedby={titleId} onClick={() => onEditWorld(selected.id)}>
          Edit
        </LibraryButton>
      </div>
      {complete && <p id={noteId} className="mt-2 font-sans text-xs text-neutral-300">This story has reached its ending.</p>}
    </div>
  </>;
}

/** Scroll pages of the worlds row, for the decorative position dots. */
function useRowPages(ref: RefObject<HTMLElement | null>, itemCount: number) {
  const [pages, setPages] = useState({ count: 1, active: 0 });
  useEffect(() => {
    const row = ref.current;
    if (!row) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const { scrollWidth, clientWidth, scrollLeft } = row;
      if (!clientWidth) return;
      const count = Math.min(8, Math.max(1, Math.ceil((scrollWidth - 2) / clientWidth)));
      const travel = scrollWidth - clientWidth;
      const active = count > 1 && travel > 0 ? Math.round((scrollLeft / travel) * (count - 1)) : 0;
      setPages(current => current.count === count && current.active === active ? current : { count, active });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    row.addEventListener('scroll', schedule, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
    observer?.observe(row);
    return () => {
      row.removeEventListener('scroll', schedule);
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, itemCount]);
  return pages;
}
