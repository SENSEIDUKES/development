import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ArrowRight, AudioLines, ChevronRight, FileText, Landmark, Paintbrush, Play } from 'lucide-react';
import {
  LibraryButton, LibraryCard, LibraryCardMedia, LibraryCardTitle, LibraryPanel, ManifestButton,
  LibraryManifestingIcon as SENManifestingIcon, LibraryNavigationIcon as SENNavigationIcon,
} from '@seihouse/library-ui';
import { SEIEmptyState, SEIErrorState, SEISkeleton } from '@seihouse/ui';
import { useLibraryAssets } from '../../../library/assets';
import { formatEnergy } from '../../energy/development/EnergyAmount';
import type { CreatorSpaceProps, CreatorToolkitItem, CreatorWorld, CreatorWorldStatus } from '../shared/creatorSpaceContracts';
import './creator-space.css';

const STATUS_LABELS: Record<CreatorWorldStatus, string> = {
  draft: 'Draft', shared: 'Shared', public: 'Public', complete: 'Complete',
};
const TOOLKIT_ICONS = { style: Paintbrush, soundscape: AudioLines } as const;
const TOOLKIT_PREVIEW_NOTICE = 'The plugin browser is still being built. For now, each world’s styles and soundscapes are chosen in its Studio.';

export const creatorWorldMeta = (world: CreatorWorld) =>
  `Ch. ${world.chapterCount} · ${STATUS_LABELS[world.status]}`;
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
  worlds, energy, toolkit, onCreate, onOpenEnergy, onContinueWorld, onOpenStudio, onBrowseToolkit, onRetryWorlds,
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
      <h1 id="creator-space-title" className="creator-space-title font-display font-bold leading-none tracking-tight text-signal">Creator Space</h1>
      <div className="grid grid-cols-2 gap-3">
        <CreatorStat label="Energy" value={energyValue} note={energyNote} onSelect={onOpenEnergy}
          icon={<SENNavigationIcon name="energy" size={26} className="text-portal" aria-hidden="true" />} />
        <CreatorStat label="In progress" value={inProgress === null ? '—' : String(inProgress)}
          icon={<SENNavigationIcon name="scroll" size={26} className="text-portal" aria-hidden="true" />} />
      </div>
    </section>

    <CreatorToolkit items={toolkit} onBrowse={onBrowseToolkit} />

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
          description="Create, at the end of this page, starts your first world from a Story Seed. It will appear here as soon as its story begins." />
      </LibraryPanel>}
      {worlds.status === 'ready' && items.length > 0 && <WorldsRow worlds={items}
        onContinueWorld={onContinueWorld} onOpenStudio={onOpenStudio} />}
    </section>

    {/* The page closes on starting something new, after the worlds already in progress. */}
    <div className="creator-space-carve">
      <ManifestButton icon={SENManifestingIcon} size="lg" fullWidth className="sm:w-auto" onClick={() => onCreate()}>
        Create
      </ManifestButton>
    </div>
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

function CreatorToolkit({ items, onBrowse }: { items: readonly CreatorToolkitItem[]; onBrowse?: () => void }) {
  const [notice, setNotice] = useState(false);
  const browse = onBrowse ?? (() => setNotice(true));
  if (!items.length && !onBrowse) return null;
  return <section aria-labelledby="creator-toolkit-title" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <div className="flex items-center gap-2">
        <h2 id="creator-toolkit-title" className="font-display text-xl font-bold text-signal sm:text-2xl">Creator Toolkit</h2>
        {!onBrowse && <span className="creator-space-tag">Preview</span>}
      </div>
      <button type="button" className="creator-space-link" onClick={browse}>
        Browse plugins <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
    {items.length > 0 && <ul className="creator-space-rail creator-space-toolkit" aria-label="Creator Toolkit">
      {items.map(item => {
        const Icon = TOOLKIT_ICONS[item.kind];
        return <li key={item.id}>
          <button type="button" className="creator-space-tool" onClick={browse}>
            {item.imageUrl && <img src={item.imageUrl} alt="" className="creator-space-tool-art" loading="lazy" referrerPolicy="no-referrer" />}
            <span className="relative z-[1] flex h-full flex-col items-start gap-1 text-left">
              <span className="creator-space-tool-icon mb-1"><Icon size={16} aria-hidden="true" /></span>
              <span className="mt-auto block font-display text-lg font-semibold leading-tight text-signal">{item.title}</span>
              <span className="block max-w-[11.5rem] font-sans text-xs leading-snug text-neutral-300">{item.description}</span>
            </span>
          </button>
        </li>;
      })}
    </ul>}
    <p role="status" className="font-sans text-xs leading-relaxed text-neutral-300 empty:hidden">{notice ? TOOLKIT_PREVIEW_NOTICE : ''}</p>
  </section>;
}

function WorldsLoading() {
  return <div className="creator-space-rail" role="status" aria-label="Loading your worlds">
    {[0, 1, 2].map(index => <SEISkeleton key={index} radius="lg" className="creator-space-world-skeleton" />)}
  </div>;
}

function WorldsRow({ worlds, onContinueWorld, onOpenStudio }: {
  worlds: readonly CreatorWorld[];
  onContinueWorld: (worldId: string) => void;
  onOpenStudio: (worldId: string) => void;
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
          <LibraryCard interactive padding="none" id={`creator-world-${world.id}`}
            className="creator-space-world" aria-pressed={isSelected}
            aria-label={`${world.title}, ${creatorWorldMeta(world)}`}
            onClick={() => setSelectedId(world.id)}>
            <LibraryCardMedia className="creator-space-world-media">
              <WorldCover src={cover} fallback={!world.imageUrl} />
              <span className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" aria-hidden="true" />
              <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3">
                <LibraryCardTitle as="h3" className="font-display text-lg font-bold leading-tight text-signal line-clamp-2 sm:text-xl">{world.title}</LibraryCardTitle>
                <span className="flex items-center gap-1.5 font-sans text-xs text-neutral-200">
                  Ch. {world.chapterCount}<span aria-hidden="true">•</span>
                  <FileText size={12} aria-hidden="true" />{STATUS_LABELS[world.status]}
                </span>
              </span>
            </LibraryCardMedia>
          </LibraryCard>
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
        <LibraryButton type="button" variant="primary" size="lg" fullWidth icon={Play} disabled={complete}
          aria-describedby={complete ? `${titleId} ${noteId}` : titleId} onClick={() => onContinueWorld(selected.id)}>
          Continue
        </LibraryButton>
        <LibraryButton type="button" variant="secondary" size="lg" fullWidth icon={Landmark}
          aria-describedby={titleId} onClick={() => onOpenStudio(selected.id)}>
          Studio
        </LibraryButton>
      </div>
      {complete && <p id={noteId} className="mt-2 font-sans text-xs text-neutral-300">This story has reached its ending.</p>}
    </div>
  </>;
}

/** A world's art; a missing or unreachable image leaves the card's own celestial wash. */
function WorldCover({ src, fallback }: { src?: string; fallback: boolean }) {
  const [failed, setFailed] = useState<string>();
  if (!src || failed === src) return null;
  return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(src)}
    className={`h-full w-full object-cover ${fallback ? 'creator-space-world-fallback' : ''}`} />;
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
