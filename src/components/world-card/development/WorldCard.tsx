import { useState, type CSSProperties } from 'react';
import { GitBranch } from 'lucide-react';
import { ElementalTitle } from '@seihouse/ui';
import { LibraryCard, LibraryCardMedia } from '@seihouse/library-ui';
import { MotionPicture, useDominantColor } from '@seihouse/sen/motion-picture';
import type { WorldCardCompactProps, WorldCardInfoCoverProps, WorldCardProps } from '../shared/worldCardContracts';
import { WorldCardCover } from './WorldCardCover';
import { WorldCardRibbon } from './WorldCardRibbon';
import { WorldCardStoryPanel } from './WorldCardStoryPanel';
import { WORLD_STATUS_LABELS } from './worldCardStatus';
import './world-card.css';

export { WORLD_STATUS_LABELS } from './worldCardStatus';

type WorldCardFaceProps =
  | ({ face?: 'full' } & WorldCardProps)
  | ({ face: 'compact' } & WorldCardCompactProps)
  | WorldCardInfoCoverProps;

/**
 * The Library world card. Its faces share one cover frame, glow, and motion behavior.
 * Full (the tall 2:3 cover) and Compact (square) keep the art clean (format, motion and creator
 * on Full; the SEN sash on both) and put the title and details in the caption beneath, so a grid
 * of many lines up.
 */
export function WorldCard(props: WorldCardFaceProps) {
  const compact = props.face === 'compact';
  const info = props.face === 'info';
  const { world } = props;
  const fullWorld = props.face === 'full' || props.face === undefined ? props.world : undefined;
  const motionWorld = compact ? undefined : props.world;
  const compactWorld = props.face === 'compact' ? props.world : undefined;
  const creatorName = world.creatorName;
  const creatorTitle = world.creatorTitle;
  const interactionProps = props.face === 'compact'
    ? { interactive: true as const, onClick: props.onOpen }
    : { interactive: false as const };
  const [motionPlaying, setMotionPlaying] = useState(false);
  const imageUrl = compact ? props.cover ?? world.imageUrl : world.imageUrl;
  const glowColor = useDominantColor(imageUrl?.trim() || undefined);
  const videoUrl = motionWorld && 'videoUrl' in motionWorld ? motionWorld.videoUrl : undefined;
  const motionAvailable = Boolean(videoUrl?.trim() && imageUrl?.trim());
  const displayStatus = props.face === 'full' || props.face === undefined ? props.displayStatus : undefined;
  const statusLabel = compactWorld ? WORLD_STATUS_LABELS[compactWorld.status]
    : displayStatus?.view === 'public'
      ? displayStatus.value === 'ongoing' ? 'On Going' : 'Completed'
      : displayStatus?.view === 'library' ? WORLD_STATUS_LABELS[displayStatus.value] : undefined;
  const genre = fullWorld?.genre?.trim();
  const details = [genre, `Ch. ${world.chapterCount}`, statusLabel].filter(Boolean).join(' · ');
  const openLabel = compact
    ? `Open ${world.title}, Ch. ${world.chapterCount} · ${statusLabel}`
    : `Open ${world.title}, ${world.chapterCount} chapters${creatorName ? `, creator ${creatorName}` : ''}${fullWorld?.format ? `, format ${fullWorld.format}` : ''}${statusLabel ? `, ${statusLabel}` : ''}`;
  const card = <LibraryCard
    {...interactionProps}
    padding="none"
    contentClassName="gap-0"
    id={`${compact ? 'creator-world' : info ? 'info-world' : 'home-world'}-${world.id}`}
    className={`world-card-base${info ? ' h-full' : ''}${compact ? ' world-card-compact' : ''}`}
    style={{ '--world-card-glow': glowColor } as CSSProperties}
    data-world-card={compact ? 'compact' : info ? 'info-cover' : 'full'}
    data-selected={compact && props.selected ? 'true' : undefined}
    aria-label={compact ? openLabel : undefined}
    data-motion-playing={motionAvailable && motionPlaying ? 'true' : undefined}
  >
    <LibraryCardMedia className={`world-card-base-media${compact ? ' world-card-compact-media' : ''}`}>
      {motionAvailable && motionWorld
        ? <MotionPicture className="world-card-base-motion" stillUrl={imageUrl!} videoUrl={videoUrl!}
            alt={`${world.title} cover`} glow={false} onPlayingChange={setMotionPlaying}
            stillFallback={<WorldCardCover src="" title={world.title} decorative />} />
        : <WorldCardCover src={imageUrl} title={world.title} decorative={!info} loading={info ? 'eager' : 'lazy'} compact={compact}
            fallbackCover={compact && props.fallbackCover} />}
      {!compact && !info && <>
        <button type="button" className="world-card-base-open" onClick={props.onOpen} aria-label={openLabel} />
        <WorldCardStoryPanel key={world.id} world={fullWorld!} />
      </>}
      <WorldCardRibbon />
      {!compact && !info && creatorName && <div className="world-card-base-overlay">
        <span className="world-card-base-creator">
          {creatorTitle
            ? <ElementalTitle as="span" element={creatorTitle.element}
                intensity={creatorTitle.intensity} color={creatorTitle.color}>
                {creatorName}
              </ElementalTitle>
            : creatorName}
        </span>
      </div>}
    </LibraryCardMedia>
  </LibraryCard>;
  if (info) return card;

  // The caption repeats the art's open action for pointers; keyboards and screen readers use the art's own control.
  return <div className="world-card-tile" data-cover-shape={compact ? 'square' : 'tall'} data-world-card-tile={compact ? 'compact' : 'full'}>
    {card}
    <div className="world-card-caption" onClick={props.onOpen}>
      <h3 className="world-card-caption-title font-display">{world.title}</h3>
      <p className="world-card-caption-details">{details}</p>
      {!compact && <ul className="world-card-caption-features" aria-label="Features">
        {fullWorld?.branchingEnabled === true && <li className="world-card-feature">
          <GitBranch aria-hidden="true" />Branching
        </li>}
      </ul>}
    </div>
  </div>;
}
