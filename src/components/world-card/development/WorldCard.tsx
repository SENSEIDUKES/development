import { useState, type CSSProperties } from 'react';
import { BookOpen, FileText } from 'lucide-react';
import { ElementalTitle, SEIBadge } from '@seihouse/ui';
import { LibraryCard, LibraryCardMedia, LibraryCardTitle } from '@seihouse/library-ui';
import { MotionPicture, useDominantColor } from '@seihouse/sen/motion-picture';
import type { WorldCardCompactProps, WorldCardInfoCoverProps, WorldCardProps } from '../shared/worldCardContracts';
import { WorldCardCover } from './WorldCardCover';
import { WorldCardFormatSymbol } from './WorldCardFormatSymbol';
import { WorldCardStoryPanel } from './WorldCardStoryPanel';
import { WORLD_STATUS_LABELS } from './worldCardStatus';
import './world-card.css';

export { WORLD_STATUS_LABELS } from './worldCardStatus';

type WorldCardFaceProps =
  | ({ face?: 'full' } & WorldCardProps)
  | ({ face: 'compact' } & WorldCardCompactProps)
  | WorldCardInfoCoverProps;

/** The Library world card. Its faces share one cover frame, glow, and motion behavior. */
export function WorldCard(props: WorldCardFaceProps) {
  const compact = props.face === 'compact';
  const info = props.face === 'info';
  const { world } = props;
  const fullWorld = props.face === 'full' || props.face === undefined ? props.world : undefined;
  const motionWorld = compact ? undefined : props.world;
  const compactWorld = props.face === 'compact' ? props.world : undefined;
  const creatorName = world.creatorName;
  const creatorTitle = world.creatorTitle;
  const format = props.face === 'compact' ? undefined : props.world.format?.trim();
  const interactionProps = props.face === 'compact'
    ? { interactive: true as const, onClick: props.onSelect, 'aria-pressed': props.selected ?? false }
    : { interactive: false as const };
  const [motionPlaying, setMotionPlaying] = useState(false);
  const imageUrl = compact ? props.cover ?? world.imageUrl : world.imageUrl;
  const glowColor = useDominantColor(imageUrl?.trim() || undefined);
  const motionAvailable = Boolean(motionWorld && imageUrl?.trim() && motionWorld.videoUrl?.trim());
  const displayStatus = props.face === 'full' || props.face === undefined ? props.displayStatus : undefined;
  const statusLabel = compactWorld ? WORLD_STATUS_LABELS[compactWorld.status]
    : displayStatus?.view === 'public'
      ? displayStatus.value === 'ongoing' ? 'On Going' : 'Completed'
      : displayStatus?.view === 'library' ? WORLD_STATUS_LABELS[displayStatus.value] : undefined;
  const openLabel = compact
    ? `${world.title}, Ch. ${world.chapterCount} · ${statusLabel}${creatorName ? `, creator ${creatorName}` : ''}`
    : `Open ${world.title}, ${world.chapterCount} chapters${creatorName ? `, creator ${creatorName}` : ''}${fullWorld?.format ? `, format ${fullWorld.format}` : ''}${statusLabel ? `, ${statusLabel}` : ''}`;
  return <LibraryCard
    {...interactionProps}
    padding="none"
    contentClassName="gap-0"
    id={`${compact ? 'creator-world' : info ? 'info-world' : 'home-world'}-${world.id}`}
    className={`world-card-base h-full${compact ? ' world-card-compact' : ''}`}
    style={{ '--world-card-glow': glowColor } as CSSProperties}
    data-world-card={compact ? 'compact' : info ? 'info-cover' : 'full'}
    aria-label={compact ? openLabel : undefined}
    data-motion-playing={motionAvailable && motionPlaying ? 'true' : undefined}
  >
    <LibraryCardMedia className={`world-card-base-media${compact ? ' world-card-compact-media' : ' aspect-[2/3]'}`}>
      {motionAvailable && motionWorld
        ? <MotionPicture className="world-card-base-motion" stillUrl={imageUrl!} videoUrl={motionWorld.videoUrl!}
            alt={`${world.title} cover`} glow={false} onPlayingChange={setMotionPlaying}
            stillFallback={<WorldCardCover src="" title={world.title} decorative />} />
        : <WorldCardCover src={imageUrl} title={world.title} decorative={!info} loading={info ? 'eager' : 'lazy'} compact={compact}
            fallbackCover={compact && props.fallbackCover} />}
      {compact && <span className="world-card-compact-gradient" aria-hidden="true" />}
      {info && format && <span className="world-card-base-format world-card-base-format-static" role="img" aria-label={`Format: ${format}`}>
        <WorldCardFormatSymbol format={format} />
      </span>}
      {!compact && !info && <>
        <button type="button" className="world-card-base-open" onClick={props.onOpen} aria-label={openLabel} />
        <WorldCardStoryPanel key={world.id} world={fullWorld!} />
      </>}
      {!info && <div className="world-card-base-overlay">
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
          {creatorName && <span className="world-card-base-creator">
            {creatorTitle
              ? <ElementalTitle as="span" element={creatorTitle.element}
                  intensity={creatorTitle.intensity} color={creatorTitle.color}>
                  {creatorName}
                </ElementalTitle>
              : creatorName}
          </span>}
        </div>
      </div>}
    </LibraryCardMedia>
  </LibraryCard>;
}
