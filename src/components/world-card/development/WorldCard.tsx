import { useState, type CSSProperties, type ReactNode } from 'react';
import { GitBranch } from 'lucide-react';
import { ElementalTitle } from '@seihouse/ui';
import { LibraryCard, LibraryCardMedia } from '@seihouse/library-ui';
import { MotionPicture, useDominantColor } from '@seihouse/sen/motion-picture';
import type { WorldCardCompactProps, WorldCardInfoCoverProps, WorldCardProps } from '../shared/worldCardContracts';
import { WorldCardActivityMark } from './WorldCardActivityMark';
import { WorldCardCover } from './WorldCardCover';
import { WorldCardRibbon } from './WorldCardRibbon';
import { WorldCardStoryPanel } from './WorldCardStoryPanel';
import { WORLD_STATUS_LABELS } from './worldCardStatus';
import { WORLD_ACTIVITY_DISPLAY } from './worldActivityDisplay';
import { useCoverHold } from './useCoverHold';
import { authorText, creatorLanguageOf, useLanguagePeek, useWorldTitle } from './worldCardText';
import './world-card.css';

export { WORLD_STATUS_LABELS } from './worldCardStatus';

type WorldCardFaceProps =
  | ({ face?: 'full' } & WorldCardProps)
  | ({ face: 'compact' } & WorldCardCompactProps)
  | WorldCardInfoCoverProps;

/**
 * The Library world card. Its faces share one cover frame, glow, and motion behavior.
 * Full (the tall 2:3 cover) and Compact (square) keep the art nearly clean: the world's activity
 * mark in the top corner, the SEN sash when the host awards it, and on Full the MP control that
 * plays or pauses the world's motion picture. A tap anywhere else enters the world; a press and
 * hold opens the story's information. Beneath, one caption: the title, then genre | creator |
 * status (the creator alive in their lettering) with a small branch mark when the world allows
 * branching, so a grid of many lines up. No chapter count: a reader may begin a world at any chapter.
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
  const [motionPlaying, setMotionPlaying] = useState(false);
  const [informationOpen, setInformationOpen] = useState(false);
  const hold = useCoverHold(() => setInformationOpen(true));
  const title = useWorldTitle(world);
  const language = useLanguagePeek(title);
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
  // A reader may begin a world at any chapter, so the line carries no chapter count. The creator sits
  // in the middle of the line, alive in their lettering, on every card.
  const creatorTitle = world.creatorTitle;
  const activity = tileWorld && 'activityStatus' in tileWorld ? tileWorld.activityStatus : undefined;
  const activityLabel = activity && activity !== 'quiet' ? WORLD_ACTIVITY_DISPLAY[activity].label : undefined;
  const creatorPart = creatorName
    ? <span className="world-card-caption-creator" {...authorText(creatorLanguageOf(world))}>
        {creatorTitle
          ? <ElementalTitle as="span" element={creatorTitle.element} intensity={creatorTitle.intensity}
              color={creatorTitle.color}>{creatorName}</ElementalTitle>
          : creatorName}
      </span>
    : undefined;
  // One text per part, so the genre and status each show in the reader's language.
  const parts: { key: string; node: ReactNode }[] = [];
  if (genre) parts.push({ key: 'genre', node: genre });
  if (creatorPart) parts.push({ key: 'creator', node: creatorPart });
  if (statusLabel) parts.push({ key: 'status', node: statusLabel });
  const details = parts.map((part, index) => <span key={part.key}>{index > 0 && ' | '}{part.node}</span>);
  const openLabel = `Open ${title.text}${language.spokenLanguage ? `, in ${language.spokenLanguage}` : ''}, ${world.chapterCount} chapters${creatorName ? `, creator ${creatorName}` : ''}${format ? `, format ${format}` : ''}${statusLabel ? `, ${statusLabel}` : ''}${activityLabel ? `, ${activityLabel}` : ''}`;
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
      {/* The MP control plays or pauses the world's motion picture; it never opens the world. */}
      {motionAvailable && motionWorld
        ? <MotionPicture className="world-card-base-motion" stillUrl={imageUrl!} videoUrl={videoUrl!}
            alt={`${world.title} cover`} glow={false} onPlayingChange={setMotionPlaying}
            stillFallback={<WorldCardCover src="" title={world.title} decorative />} />
        : <WorldCardCover src={imageUrl} title={world.title} decorative={!info} loading={info ? 'eager' : 'lazy'} compact={compact}
            fallbackCover={compact && props.fallbackCover} hideFallback={info && props.hideFallback} />}
      {tileWorld && <>
        <WorldCardActivityMark status={activity} />
        <button type="button" className="world-card-base-open" onClick={onOpen} aria-label={`${openLabel}. Press and hold for story information`}
          aria-pressed={compact ? Boolean(props.selected) : undefined} {...hold} />
        {/* A format other than Novel shows its mark; the story's information opens with a press and hold,
            and from this control for the keyboard. */}
        <WorldCardStoryPanel key={world.id} world={tileWorld} open={informationOpen} onOpenChange={setInformationOpen}
          triggerClassName={`world-card-base-format${format && format.toLowerCase() !== 'novel' ? '' : ' world-card-base-format-quiet'}`} />
      </>}
      {!info && props.senSash && <WorldCardRibbon />}
    </LibraryCardMedia>
  </LibraryCard>;
  if (info) return card;

  // The caption repeats the art's open action for pointers; keyboards and screen readers use the art's own control.
  return <div className="world-card-tile" data-cover-shape={compact ? 'square' : 'tall'} data-world-card-tile={compact ? 'compact' : 'full'}>
    {card}
    <div className="world-card-caption" onClick={props.onOpen} {...language.hostProps}>
      {language.peek}
      <h3 className="world-card-caption-title font-display" {...authorText(title.lang)}>{title.text}</h3>
      <p className="world-card-caption-details"><span className="world-card-caption-details-text">{details}</span>
        {tileWorld?.branchingEnabled === true && <span className="world-card-caption-branching" title="Branching">
          <GitBranch aria-hidden="true" /><span className="sr-only">, Branching</span>
        </span>}
      </p>
    </div>
  </div>;
}
