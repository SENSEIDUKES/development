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
 * Full (the tall 2:3 cover) and Compact (square) keep the art clean (the format mark on both, motion on
 * Full, the SEN sash when the host awards it) and share one caption beneath: title, creator, then
 * genre | chapters | status and the Branching badge, so a grid of many lines up.
 */
export function WorldCard(props: WorldCardFaceProps) {
  const compact = props.face === 'compact';
  const info = props.face === 'info';
  const { world } = props;
  const fullWorld = props.face === 'full' || props.face === undefined ? props.world : undefined;
  // On Info the world's motion picture loops behind the whole page, so its cover stays a still with no motion control.
  const motionWorld = compact || info ? undefined : props.world;
  const compactWorld = props.face === 'compact' ? props.world : undefined;
  // Full and Compact share one caption: what each face's world supplies, nothing inferred.
  const tileWorld = fullWorld ?? compactWorld;
  const onOpen = props.face === 'info' ? undefined : props.onOpen;
  const creatorName = world.creatorName?.trim();
  const creatorTitle = world.creatorTitle;
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
  const genre = tileWorld?.genre?.trim();
  const format = tileWorld?.format?.trim();
  const details = [genre, `Ch. ${world.chapterCount}`, statusLabel].filter(Boolean).join(' | ');
  const openLabel = `Open ${world.title}, ${world.chapterCount} chapters${creatorName ? `, creator ${creatorName}` : ''}${format ? `, format ${format}` : ''}${statusLabel ? `, ${statusLabel}` : ''}`;
  const card = <LibraryCard
    interactive={false}
    padding="none"
    contentClassName="gap-0"
    id={`${compact ? 'creator-world' : info ? 'info-world' : 'home-world'}-${world.id}`}
    className={`world-card-base${info ? ' h-full' : ''}${compact ? ' world-card-compact' : ''}`}
    style={{ '--world-card-glow': glowColor } as CSSProperties}
    data-world-card={compact ? 'compact' : info ? 'info-cover' : 'full'}
    data-selected={compact && props.selected ? 'true' : undefined}
    data-motion-playing={motionAvailable && motionPlaying ? 'true' : undefined}
  >
    <LibraryCardMedia className={`world-card-base-media${compact ? ' world-card-compact-media' : ''}`}>
      {motionAvailable && motionWorld
        ? <MotionPicture className="world-card-base-motion" stillUrl={imageUrl!} videoUrl={videoUrl!}
            alt={`${world.title} cover`} glow={false} onPlayingChange={setMotionPlaying}
            stillFallback={<WorldCardCover src="" title={world.title} decorative />} />
        : <WorldCardCover src={imageUrl} title={world.title} decorative={!info} loading={info ? 'eager' : 'lazy'} compact={compact}
            fallbackCover={compact && props.fallbackCover} />}
      {tileWorld && <>
        <button type="button" className="world-card-base-open" onClick={onOpen} aria-label={openLabel}
          aria-pressed={compact ? Boolean(props.selected) : undefined} />
        {/* The format mark opens the story's information, on Full and Compact alike. */}
        <WorldCardStoryPanel key={world.id} world={tileWorld} />
      </>}
      {!info && props.senSash && <WorldCardRibbon />}
    </LibraryCardMedia>
  </LibraryCard>;
  if (info) return card;

  // The caption repeats the art's open action for pointers; keyboards and screen readers use the art's own control.
  // The creator's name lives here, beneath the title, so the art stays clean.
  return <div className="world-card-tile" data-cover-shape={compact ? 'square' : 'tall'} data-world-card-tile={compact ? 'compact' : 'full'}>
    {card}
    <div className="world-card-caption" onClick={props.onOpen}>
      <h3 className="world-card-caption-title font-display">{world.title}</h3>
      {creatorName && <p className="world-card-caption-creator">
        {creatorTitle
          ? <ElementalTitle as="span" element={creatorTitle.element}
              intensity={creatorTitle.intensity} color={creatorTitle.color}>{creatorName}</ElementalTitle>
          : creatorName}
      </p>}
      <p className="world-card-caption-details">{details}</p>
      <ul className="world-card-caption-features" aria-label="Features">
        {tileWorld?.branchingEnabled === true && <li className="world-card-feature">
          <GitBranch aria-hidden="true" />Branching
        </li>}
      </ul>
    </div>
  </div>;
}
