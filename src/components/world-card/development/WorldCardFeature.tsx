import { useEffect, useRef, type CSSProperties } from 'react';
import { GitBranch } from 'lucide-react';
import { ElementalTitle } from '@seihouse/ui';
import { useDominantColor } from '@seihouse/sen/motion-picture';
import type { WorldCardFeatureProps } from '../shared/worldCardContracts';
import { WorldCardCover } from './WorldCardCover';
import { WorldCardRibbon } from './WorldCardRibbon';
import { WORLD_STATUS_LABELS } from './worldCardStatus';
import './world-card.css';

/**
 * Feature card: a wide banner for one world the host spotlights, sized like Home's Featured
 * hero so it can take that place. The world's own cover
 * stands on the right; behind the title, creator, progress and synopsis on the left, the band
 * is that cover blurred in its own color, with the world's motion picture looping over it when
 * it has one.
 */
/** True when the reader asked for less motion; the clip then stays still. */
function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function WorldCardFeature({ world, onOpen, displayStatus, label = 'Featured', senSash = false }: WorldCardFeatureProps) {
  const imageUrl = world.imageUrl?.trim() || undefined;
  // The world's own motion picture, when it has one, loops silently behind the band.
  const videoUrl = world.videoUrl?.trim() && !prefersReducedMotion() ? world.videoUrl.trim() : undefined;
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Muted and inline, set on the element itself, so browsers allow it to start on its own.
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    void video.play()?.catch(() => { /* Autoplay refused: the still backdrop stays. */ });
  }, [videoUrl]);
  const glowColor = useDominantColor(imageUrl);
  const statusLabel = displayStatus?.view === 'public'
    ? displayStatus.value === 'ongoing' ? 'On Going' : 'Completed'
    : displayStatus?.view === 'library' ? WORLD_STATUS_LABELS[displayStatus.value] : undefined;
  const genre = world.genre?.trim();
  const synopsis = world.synopsis?.trim();
  const details = [genre, `Ch. ${world.chapterCount}`, statusLabel].filter(Boolean).join(' · ');
  const openLabel = `Open ${world.title}, ${world.chapterCount} chapters${world.creatorName ? `, creator ${world.creatorName}` : ''}${statusLabel ? `, ${statusLabel}` : ''}`;

  return <article className="world-card-banner" data-world-card="feature" id={`feature-world-${world.id}`}
    style={{ '--world-card-glow': glowColor, ...(imageUrl ? { '--world-card-banner-art': `url("${imageUrl.replace(/"/g, '%22')}")` } : {}) } as CSSProperties}>
    <span className="world-card-banner-backdrop" aria-hidden="true" />
    {videoUrl && <video ref={videoRef} className="world-card-banner-video" src={videoUrl} poster={imageUrl}
      muted loop playsInline autoPlay preload="metadata" aria-hidden="true" tabIndex={-1} />}
    <span className="world-card-banner-wash" aria-hidden="true" />
    <div className="world-card-banner-body">
      <p className="world-card-banner-eyebrow">{label}</p>
      <h3 className="world-card-banner-title font-display">{world.title}</h3>
      {world.creatorName && <p className="world-card-banner-byline">
        <span className="world-card-banner-by">by</span>
        {world.creatorTitle
          ? <ElementalTitle as="span" element={world.creatorTitle.element}
              intensity={world.creatorTitle.intensity} color={world.creatorTitle.color}>{world.creatorName}</ElementalTitle>
          : <span className="world-card-banner-creator">{world.creatorName}</span>}
      </p>}
      <p className="world-card-banner-details">{details}</p>
      {synopsis && <p className="world-card-banner-synopsis">{synopsis}</p>}
      {world.branchingEnabled === true && <ul className="world-card-caption-features" aria-label="Features">
        <li className="world-card-feature"><GitBranch aria-hidden="true" />Branching</li>
      </ul>}
    </div>
    <div className="world-card-banner-cover">
      <div className="world-card-banner-cover-frame">
        <WorldCardCover src={imageUrl} title={world.title} decorative />
        {senSash && <WorldCardRibbon />}
      </div>
    </div>
    <button type="button" className="world-card-banner-open" onClick={onOpen} aria-label={openLabel} />
  </article>;
}
