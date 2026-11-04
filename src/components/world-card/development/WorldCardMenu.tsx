import type { ReactNode } from 'react';
import { ElementalTitle } from '@seihouse/ui';
import type { WorldCardMenuProps } from '../shared/worldCardContracts';
import { WorldCardActivityMark } from './WorldCardActivityMark';
import { WorldCardCover } from './WorldCardCover';
import { WORLD_ACTIVITY_DISPLAY } from './worldActivityDisplay';
import { authorText, useLanguagePeek, useWorldTitle } from './worldCardText';
import './world-card.css';

/**
 * The shared world row for chapter menus and ranking lists. Navigation belongs to the host. Its
 * line reads as every card's does: genre | creator (alive in their lettering) | status, with the
 * world's activity mark on the cover.
 */
export function WorldCardMenu({ world, onOpen, chapter, age, tracked = false, rank }: WorldCardMenuProps) {
  const title = useWorldTitle(world);
  const language = useLanguagePeek(title, 'top');
  const chapterLabel = chapter ? `Chapter ${chapter.number}${chapter.title ? ` · ${chapter.title}` : ''}` : undefined;
  const status = world.publicationStatus === 'completed' ? 'Completed' : world.publicationStatus === 'ongoing' ? 'On Going' : undefined;
  const activity = world.activityStatus && world.activityStatus !== 'quiet' ? WORLD_ACTIVITY_DISPLAY[world.activityStatus].label : undefined;
  const creatorName = world.creatorName?.trim();
  const label = [rank ? `${rank}. ${title.text}` : title.text, language.spokenLanguage && `in ${language.spokenLanguage}`, chapterLabel,
    creatorName && `creator ${creatorName}`, status, activity, age?.label].filter(Boolean).join(', ');
  const parts = [
    world.genre?.trim() && { key: 'genre', node: world.genre.trim() },
    creatorName && { key: 'creator', node: <span className="world-card-menu-creator" {...authorText(world.creatorLanguage)}>
      {world.creatorTitle
        ? <ElementalTitle as="span" element={world.creatorTitle.element} intensity={world.creatorTitle.intensity}
            color={world.creatorTitle.color}>{creatorName}</ElementalTitle>
        : creatorName}
    </span> },
    status && { key: 'status', node: status },
  ].filter(Boolean) as { key: string; node: ReactNode }[];
  return <button type="button" className="world-card-menu" data-world-card="menu" onClick={onOpen} aria-label={label} {...language.hostProps}>
    {language.peek}
    {rank != null && <span className="world-card-menu-rank" aria-hidden="true">{rank}</span>}
    <span className="world-card-menu-cover"><WorldCardCover src={world.imageUrl} title={world.title} decorative />
      <WorldCardActivityMark status={world.activityStatus} className="world-card-menu-activity" /></span>
    <span className="world-card-menu-body">
      <span className="world-card-menu-title" {...authorText(title.lang)}>{title.text}</span>
      {/* "Chapter" is an interface word; the chapter's own title is the author's, in the world's original language. */}
      {chapter && <span className="world-card-menu-chapter">
        <span>Chapter {chapter.number}</span>{chapter.title && <> · <span {...authorText(world.originalLanguage)}>{chapter.title}</span></>}
      </span>}
      <span className="world-card-menu-meta">
        <span>{parts.map((part, index) => <span key={part.key}>{index > 0 && ' | '}{part.node}</span>)}</span>
        {tracked && <span className="world-card-menu-tracked">Tracking</span>}
      </span>
    </span>
    {age && <time className="world-card-menu-age" dateTime={age.dateTime}>{age.label}</time>}
  </button>;
}
