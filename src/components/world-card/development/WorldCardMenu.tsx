import type { WorldCardMenuProps } from '../shared/worldCardContracts';
import { WorldCardCover } from './WorldCardCover';
import { authorText, useLanguagePeek, useWorldTitle } from './worldCardText';
import './world-card.css';

/** The shared world row for chapter menus and ranking lists. Navigation belongs to the host. */
export function WorldCardMenu({ world, onOpen, chapter, age, tracked = false, rank }: WorldCardMenuProps) {
  const title = useWorldTitle(world);
  const language = useLanguagePeek(title, 'top');
  const chapterLabel = chapter ? `Chapter ${chapter.number}${chapter.title ? ` · ${chapter.title}` : ''}` : undefined;
  const label = [rank ? `${rank}. ${title.text}` : title.text, language.spokenLanguage && `in ${language.spokenLanguage}`, chapterLabel, age?.label].filter(Boolean).join(', ');
  return <button type="button" className="world-card-menu" data-world-card="menu" onClick={onOpen} aria-label={label} {...language.hostProps}>
    {language.peek}
    {rank != null && <span className="world-card-menu-rank" aria-hidden="true">{rank}</span>}
    <span className="world-card-menu-cover"><WorldCardCover src={world.imageUrl} title={world.title} decorative /></span>
    <span className="world-card-menu-body">
      <span className="world-card-menu-title" {...authorText(title.lang)}>{title.text}</span>
      {/* "Chapter" is an interface word; the chapter's own title is the author's. */}
      {chapter && <span className="world-card-menu-chapter">
        <span>Chapter {chapter.number}</span>{chapter.title && <> · <span {...authorText(title.lang)}>{chapter.title}</span></>}
      </span>}
      <span className="world-card-menu-meta">
        <span>{world.creatorName && <span {...authorText(world.creatorLanguage)}>{world.creatorName}</span>}
          {world.creatorName && world.genre ? ' · ' : ''}{world.genre}</span>
        {tracked && <span className="world-card-menu-tracked">Tracking</span>}
      </span>
    </span>
    {age && <time className="world-card-menu-age" dateTime={age.dateTime}>{age.label}</time>}
  </button>;
}
