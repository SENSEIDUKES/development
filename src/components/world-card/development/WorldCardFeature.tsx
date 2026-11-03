import { useEffect, useRef, type CSSProperties } from 'react';
import { GitBranch } from 'lucide-react';
import { ElementalTitle } from '@seihouse/ui';
import { useDominantColor } from '@seihouse/sen/motion-picture';
import type { WorldCardFeatureProps } from '../shared/worldCardContracts';
import { prefersReducedMotion, WorldCardBackdropVideo, type WorldCardBackdropVideoHandle } from './WorldCardBackdropVideo';
import { WorldCardRibbon } from './WorldCardRibbon';
import { WORLD_STATUS_LABELS } from './worldCardStatus';
import { authorText, useLanguagePeek, useWorldTitle } from './worldCardText';
import './world-card.css';

/**
 * Feature card: the living hero for one world the host spotlights. The world fills the card
 * edge to edge (its wide hero still, or its cover when it has none) and its hero loop plays
 * silently behind the words, so the world is already alive when the reader arrives. The words
 * sit centered along the bottom and the art fades into the page beneath them. The whole card is
 * one door into the world: a tap anywhere opens it. Only the slide on screen plays its loop.
 */
export function WorldCardFeature({ world, onOpen, displayStatus, label = 'Featured', senSash = false, active = true, actionLabel = 'Enter World' }: WorldCardFeatureProps) {
  const imageUrl = world.imageUrl?.trim() || undefined;
  const heroImageUrl = world.heroImageUrl?.trim() || undefined;
  const stillUrl = heroImageUrl ?? imageUrl;
  const videoUrl = world.heroVideoUrl?.trim() || world.videoUrl?.trim() || undefined;
  const glowColor = useDominantColor(stillUrl);
  const video = useRef<WorldCardBackdropVideoHandle>(null);
  const title = useWorldTitle(world);
  const language = useLanguagePeek(title, 'top');
  // A slide coming on screen starts its loop on its own, so it honours reduced motion (the still stays);
  // a slide leaving the screen always pauses.
  useEffect(() => {
    if (!active) video.current?.pause();
    else if (!prefersReducedMotion()) video.current?.play();
  }, [active]);

  const statusLabel = displayStatus?.view === 'public'
    ? displayStatus.value === 'ongoing' ? 'On Going' : 'Completed'
    : displayStatus?.view === 'library' ? WORLD_STATUS_LABELS[displayStatus.value] : undefined;
  const genre = world.genre?.trim();
  const synopsis = world.synopsis?.trim();
  // One text per part, so the genre and status each show in the reader's language.
  const details = [genre, `Ch. ${world.chapterCount}`, statusLabel].filter(Boolean)
    .map((part, index) => <span key={part}>{index > 0 && ' | '}{part}</span>);
  const openLabel = `Open ${title.text}${language.spokenLanguage ? `, in ${language.spokenLanguage}` : ''}, ${world.chapterCount} chapters${world.creatorName ? `, creator ${world.creatorName}` : ''}${statusLabel ? `, ${statusLabel}` : ''}`;

  return <article className="world-card-banner" data-world-card="feature" id={`feature-world-${world.id}`}
    data-hero={heroImageUrl || world.heroVideoUrl?.trim() ? 'wide' : 'cover'}
    style={{ '--world-card-glow': glowColor } as CSSProperties} {...language.hostProps}>
    {language.peek}
    {stillUrl
      ? <img className="world-card-banner-still" src={stillUrl} alt="" aria-hidden="true" draggable={false} />
      : <span className="world-card-banner-still" data-empty="true" aria-hidden="true" />}
    {/* The world's hero loop plays silently over its still while this slide is on screen. */}
    <WorldCardBackdropVideo ref={video} src={videoUrl} className="world-card-banner-video" autoStart={active} />
    <span className="world-card-banner-wash" aria-hidden="true" />
    {senSash && <span className="world-card-banner-sash" aria-hidden="true"><WorldCardRibbon /></span>}
    <div className="world-card-banner-body">
      {label && <p className="world-card-banner-eyebrow">{label}</p>}
      <h3 className="world-card-banner-title font-display" {...authorText(title.lang)}>{title.text}</h3>
      {world.creatorName && <p className="world-card-banner-byline">
        <span className="world-card-banner-by">by</span>
        <span {...authorText(world.creatorLanguage)}>{world.creatorTitle
          ? <ElementalTitle as="span" element={world.creatorTitle.element}
              intensity={world.creatorTitle.intensity} color={world.creatorTitle.color}>{world.creatorName}</ElementalTitle>
          : <span className="world-card-banner-creator">{world.creatorName}</span>}</span>
      </p>}
      <p className="world-card-banner-details">{details}</p>
      {synopsis && <p className="world-card-banner-synopsis">{synopsis}</p>}
      {world.branchingEnabled === true && <ul className="world-card-caption-features" aria-label="Features">
        <li className="world-card-feature"><GitBranch aria-hidden="true" />Branching</li>
      </ul>}
      {actionLabel && <span className="world-card-banner-action" aria-hidden="true">{actionLabel}</span>}
    </div>
    <button type="button" className="world-card-banner-open" onClick={onOpen} aria-label={openLabel} />
  </article>;
}
