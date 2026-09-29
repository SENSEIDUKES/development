import { useState, type CSSProperties } from 'react';
import { BookOpen, FileText } from 'lucide-react';
import { ElementalTitle, SEIBadge } from '@seihouse/ui';
import { LibraryCard, LibraryCardMedia, LibraryCardTitle, LibraryStoryIcon } from '@seihouse/library-ui';
import { MotionPicture, useDominantColor } from '@seihouse/sen/motion-picture';
import type { WorldCardProps } from '../shared/worldCardContracts';
import { WORLD_STATUS_LABELS } from './WorldCardCompact';
import { WorldCardCover } from './WorldCardCover';
import './world-card.css';

/** The Library's full world card. Other sizes can follow after this one is settled. */
export function WorldCard({ world, onOpen, displayStatus }: WorldCardProps) {
  const [motionPlaying, setMotionPlaying] = useState(false);
  const glowColor = useDominantColor(world.imageUrl.trim() || undefined);
  const motionAvailable = Boolean(world.imageUrl.trim() && world.videoUrl?.trim());
  const statusLabel = displayStatus?.view === 'public'
    ? displayStatus.value === 'ongoing' ? 'On Going' : 'Completed'
    : displayStatus?.view === 'library' ? WORLD_STATUS_LABELS[displayStatus.value] : undefined;
  const openLabel = `Open ${world.title}, ${world.chapterCount} chapters${world.creatorName ? `, creator ${world.creatorName}` : ''}${world.format ? `, format ${world.format}` : ''}${statusLabel ? `, ${statusLabel}` : ''}`;
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
      {world.format && <span className="world-card-base-format">
        {world.format.trim().toLowerCase() === 'novel'
          ? <><LibraryStoryIcon size={17} aria-hidden /><span className="sr-only">Novel</span></>
          : world.format.toUpperCase()}
      </span>}
      <div className="world-card-base-overlay">
        <LibraryCardTitle as="h3" className="world-card-base-title font-display">{world.title}</LibraryCardTitle>
        <div className="world-card-base-meta">
          <SEIBadge size="sm" variant="neutral" className="world-card-base-details">
            <span className="world-card-base-chapters">
              <BookOpen size={12} aria-hidden="true" />Ch. {world.chapterCount}
            </span>
            {statusLabel && <span className="world-card-base-status">
              <FileText size={12} aria-hidden="true" />{statusLabel}
            </span>}
          </SEIBadge>
          {world.creatorName && <span className="world-card-base-creator">
            {world.creatorTitle
              ? <ElementalTitle as="span" element={world.creatorTitle.element}
                  intensity={world.creatorTitle.intensity} color={world.creatorTitle.color}>
                  {world.creatorName}
                </ElementalTitle>
              : world.creatorName}
          </span>}
        </div>
      </div>
    </LibraryCardMedia>
  </LibraryCard>;
}
