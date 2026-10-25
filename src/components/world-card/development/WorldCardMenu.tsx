import type { WorldCardMenuProps } from '../shared/worldCardContracts';
import { WorldCardCover } from './WorldCardCover';
import './world-card.css';

/** The shared world row for chapter menus and ranking lists. Navigation belongs to the host. */
export function WorldCardMenu({ world, onOpen, chapter, age, tracked = false, rank }: WorldCardMenuProps) {
  const chapterLabel = chapter ? `Chapter ${chapter.number}${chapter.title ? ` · ${chapter.title}` : ''}` : undefined;
  const label = [rank ? `${rank}. ${world.title}` : world.title, chapterLabel, age?.label].filter(Boolean).join(', ');
  return <button type="button" className="world-card-menu" data-world-card="menu" onClick={onOpen} aria-label={label}>
    {rank != null && <span className="world-card-menu-rank" aria-hidden="true">{rank}</span>}
    <span className="world-card-menu-cover"><WorldCardCover src={world.imageUrl} title={world.title} decorative /></span>
    <span className="world-card-menu-body">
      <span className="world-card-menu-title">{world.title}</span>
      {chapterLabel && <span className="world-card-menu-chapter">{chapterLabel}</span>}
      <span className="world-card-menu-meta">
        <span>{[world.creatorName, world.genre].filter(Boolean).join(' · ')}</span>
        {tracked && <span className="world-card-menu-tracked">Tracking</span>}
      </span>
    </span>
    {age && <time className="world-card-menu-age" dateTime={age.dateTime}>{age.label}</time>}
  </button>;
}
