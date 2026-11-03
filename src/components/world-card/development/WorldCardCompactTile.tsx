import { useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { ElementalTitle } from '@seihouse/ui';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';
import { WorldCardCover } from './WorldCardCover';
import { WorldCardRibbon } from './WorldCardRibbon';
import { WORLD_ACTIVITY_DISPLAY } from './worldActivityDisplay';
import { authorText, useLanguagePeek, useWorldTitle } from './worldCardText';
import './world-card.css';

/** What a Compact tile reads from a world; a Home world supplies it. */
export type WorldCardCompactWorld = Pick<HomeWorld, 'id' | 'title' | 'imageUrl' | 'genre' | 'creatorName' | 'creatorTitle'
  | 'creatorLanguage' | 'originalLanguage' | 'titleTranslations' | 'activityStatus'>;

/**
 * Compact: the dense browsing tile for pages that show many worlds at once (Discover, search,
 * genres). The 2:3 cover with nothing on it, then the title on up to two lines, the creator in
 * their own lettering, and one quiet line. That line is the genre unless the host supplies its
 * own (reading progress on a library shelf, "Draft · Ch. 6" for a creator). A tap on the art or
 * words enters the world; its details and motion picture wait for its Info page. The creator's
 * lettering shows its element still here; it moves on the bigger cards, where it has room. The
 * title follows the card language rules (worldCardText): the reader's language when the world
 * has a real translation, otherwise the original with a small language tag.
 */
export function WorldCardCompactTile({ world, detail, onOpen, senSash = false }: {
  world: WorldCardCompactWorld;
  /** The SEN sash across the cover's corner, only when the host awards it (as on the other faces). */
  senSash?: boolean;
  /** The one line under the creator; defaults to the genre. `null` leaves it out. */
  detail?: string | null;
  onOpen: () => void;
}) {
  const line = detail === undefined ? world.genre?.trim() || undefined : detail ?? undefined;
  const creatorName = world.creatorName?.trim();
  const creatorTitle = world.creatorTitle;
  const title = useWorldTitle(world);
  const language = useLanguagePeek(title);
  // A world busy with its people (reading, branching, continuing it) shows a still dot in the
  // cover's top-left corner. A quiet one shows nothing: quiet is an opening to take the world on,
  // never a mark against it.
  const activity = world.activityStatus && world.activityStatus !== 'quiet' ? WORLD_ACTIVITY_DISPLAY[world.activityStatus] : undefined;
  return <div className="world-card-compact-tile" data-world-card="compact-tile">
    <span className="world-card-compact-tile-cover">
      <WorldCardCover src={world.imageUrl} title={world.title} decorative />
      {senSash && <WorldCardRibbon />}
      {activity && <span className={`world-card-compact-tile-activity ${activity.color}`} title={activity.label} data-activity={world.activityStatus} />}
      <button type="button" className="world-card-compact-tile-open" onClick={onOpen}
        aria-label={`Open ${title.text}${language.spokenLanguage ? `, in ${language.spokenLanguage}` : ''}${creatorName ? `, creator ${creatorName}` : ''}${line ? `, ${line}` : ''}${activity ? `, ${activity.label}` : ''}`} />
    </span>
    {/* The words repeat the art's open action for pointers; keyboards use the art's own control. */}
    <span className="world-card-compact-tile-caption" onClick={onOpen} {...language.hostProps}>
      {language.peek}
      <span className="world-card-compact-tile-title font-display" {...authorText(title.lang)}>{title.text}</span>
      {creatorName && <span className="world-card-compact-tile-creator" {...authorText(world.creatorLanguage)}>
        {creatorTitle
          // Still on a small card (it moves only under a pointer); the bigger cards animate it.
          ? <ElementalTitle as="span" element={creatorTitle.element} motion="hover"
              intensity={creatorTitle.intensity} color={creatorTitle.color}>{creatorName}</ElementalTitle>
          : creatorName}
      </span>}
      {line && <span className="world-card-compact-tile-detail">{line}</span>}
    </span>
  </div>;
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
export function WorldCardCompactPicks({ title, worlds, onOpenWorld, size = 8, senSashWorldIds }: {
  title: string;
  worlds: readonly WorldCardCompactWorld[];
  onOpenWorld: (id: string) => void;
  size?: number;
  /** Worlds the host has awarded the SEN sash. */
  senSashWorldIds?: readonly string[];
}) {
  const [start, setStart] = useState(0);
  if (!worlds.length || size < 1) return null;
  const count = Math.min(size, worlds.length);
  const shown = Array.from({ length: count }, (_, index) => worlds[(start + index) % worlds.length]);
  const canSwitch = worlds.length > size;
  return <section className="world-card-compact-picks" aria-label={title}>
    <h2 className="world-card-compact-picks-title font-display">{title}</h2>
    <WorldCardCompactGrid label={title}>
      {shown.map(world => <li key={world.id}><WorldCardCompactTile world={world} senSash={senSashWorldIds?.includes(world.id)} onOpen={() => onOpenWorld(world.id)} /></li>)}
    </WorldCardCompactGrid>
    {canSwitch && <button type="button" className="world-card-compact-picks-switch"
      onClick={() => setStart(value => (value + size) % worlds.length)}>
      <RefreshCw aria-hidden="true" />Switch
    </button>}
  </section>;
}
