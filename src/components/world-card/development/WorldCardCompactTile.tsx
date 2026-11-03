import { useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';
import { WorldCardCover } from './WorldCardCover';
import './world-card.css';

/** What a Compact tile reads from a world; a Home world supplies it. */
export type WorldCardCompactWorld = Pick<HomeWorld, 'id' | 'title' | 'imageUrl' | 'genre'>;

/**
 * Compact: the dense browsing tile for pages that show many worlds at once (Discover, search,
 * genres). The 2:3 cover, the title on up to two lines and one quiet line beneath, with nothing
 * on the art. That line is the genre unless the host supplies its own (reading progress on a
 * library shelf, "Draft · Ch. 6" for a creator). The whole tile is one tap into the world; the
 * world's motion picture waits for its Info page.
 */
export function WorldCardCompactTile({ world, detail, onOpen }: {
  world: WorldCardCompactWorld;
  /** The one line under the title; defaults to the genre. `null` leaves it out. */
  detail?: string | null;
  onOpen: () => void;
}) {
  const line = detail === undefined ? world.genre?.trim() || undefined : detail ?? undefined;
  return <button type="button" className="world-card-compact-tile" data-world-card="compact-tile" onClick={onOpen}
    aria-label={`Open ${world.title}${line ? `, ${line}` : ''}`}>
    <span className="world-card-compact-tile-cover">
      <WorldCardCover src={world.imageUrl} title={world.title} decorative />
    </span>
    <span className="world-card-compact-tile-title font-display" aria-hidden="true">{world.title}</span>
    {line && <span className="world-card-compact-tile-detail" aria-hidden="true">{line}</span>}
  </button>;
}

/**
 * The Compact grid: as many columns as fit (four across a phone's full width, fewer beside a side
 * rail, more on wider screens). It only ever scrolls down with the page, never sideways.
 */
export function WorldCardCompactGrid({ label, children }: { label: string; children: ReactNode }) {
  return <ul className="world-card-compact-grid" aria-label={label}>{children}</ul>;
}

/**
 * A curated Compact box: a fixed set of worlds (two rows of four) and a Switch button that
 * deals the next set, so browsing becomes a quick choice rather than an endless scroll.
 */
export function WorldCardCompactPicks({ title, worlds, onOpenWorld, size = 8 }: {
  title: string;
  worlds: readonly WorldCardCompactWorld[];
  onOpenWorld: (id: string) => void;
  size?: number;
}) {
  const [start, setStart] = useState(0);
  if (!worlds.length) return null;
  const count = Math.min(size, worlds.length);
  const shown = Array.from({ length: count }, (_, index) => worlds[(start + index) % worlds.length]);
  const canSwitch = worlds.length > size;
  return <section className="world-card-compact-picks" aria-label={title}>
    <h2 className="world-card-compact-picks-title font-display">{title}</h2>
    <WorldCardCompactGrid label={title}>
      {shown.map(world => <li key={world.id}><WorldCardCompactTile world={world} onOpen={() => onOpenWorld(world.id)} /></li>)}
    </WorldCardCompactGrid>
    {canSwitch && <button type="button" className="world-card-compact-picks-switch"
      onClick={() => setStart(value => (value + size) % worlds.length)}>
      <RefreshCw aria-hidden="true" />Switch
    </button>}
  </section>;
}
