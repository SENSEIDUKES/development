import { useState, type CSSProperties } from 'react';
import { LibraryCard, LibraryCardMedia, LibraryCardTitle, LibraryStoryIcon } from '@seihouse/library-ui';
import { MotionPicture, useDominantColor } from '@seihouse/sen/motion-picture';
import type { WorldCardProps } from '../shared/worldCardContracts';
import { WorldCardCover } from './WorldCardCover';
import './world-card.css';

/** The Library's full world card. Other sizes can follow after this one is settled. */
export function WorldCard({ world, onOpen }: WorldCardProps) {
  const [motionPlaying, setMotionPlaying] = useState(false);
  const glowColor = useDominantColor(world.imageUrl.trim() || undefined);
  const motionAvailable = Boolean(world.imageUrl.trim() && world.videoUrl?.trim());
  const openLabel = `Open ${world.title}, ${world.chapterCount} chapters${world.creatorName ? `, creator ${world.creatorName}` : ''}${world.format ? `, format ${world.format}` : ''}`;
  return <LibraryCard
    padding="none"
    contentClassName="gap-0"
    id={`home-world-${world.id}`}
    className="world-card-base h-full"
    style={{ '--world-card-glow': glowColor } as CSSProperties}
    data-world-card="full"
    data-motion-playing={motionAvailable && motionPlaying ? 'true' : undefined}
  >
    <LibraryCardMedia className="world-card-base-media aspect-[2/3]">
      {motionAvailable
        ? <MotionPicture className="world-card-base-motion" stillUrl={world.imageUrl} videoUrl={world.videoUrl}
            alt={`${world.title} cover`} glow={false} onPlayingChange={setMotionPlaying}
            stillFallback={<WorldCardCover src="" title={world.title} decorative />} />
        : <WorldCardCover src={world.imageUrl} title={world.title} decorative />}
      <div className="world-card-base-shade" aria-hidden="true" />
      <button type="button" className="world-card-base-open" onClick={onOpen} aria-label={openLabel} />
      <span className="world-card-base-counter world-card-base-chapter-count" aria-label={`${world.chapterCount} chapters`}>
        {world.chapterCount} Ch
      </span>
      <div className="world-card-base-overlay">
        <LibraryCardTitle as="h3" className="world-card-base-title font-display">{world.title}</LibraryCardTitle>
        {(world.creatorName || world.format) && <div className="world-card-base-meta">
          {world.creatorName && <span>{world.creatorName}</span>}
          {world.creatorName && world.format && <span aria-hidden="true">·</span>}
          {world.format && <span className="world-card-base-format">
            {world.format.trim().toLowerCase() === 'novel' && <LibraryStoryIcon size={13} aria-hidden />}
            {world.format.toUpperCase()}
          </span>}
        </div>}
      </div>
    </LibraryCardMedia>
  </LibraryCard>;
}
