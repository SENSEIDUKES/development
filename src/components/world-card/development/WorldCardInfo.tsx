import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, ChevronDown, ChevronRight, ChevronUp, Flower2, Info } from 'lucide-react';
import { ElementalTitle, SEIBadge } from '@seihouse/ui';
import { LibraryButton, LibraryCard, LibraryIcon, LibraryPanel, type LibraryIconName } from '@seihouse/library-ui';
import { getTagMetadata, normalizeStoryTagIdentity, STORY_TAG_COLOR_ACCENTS, type StoryTagMetadata } from '@seihouse/sen/story-seed';
import type { WorldCardInfoProps } from '../shared/worldCardContracts';
import { WorldCard } from './WorldCard';
import { WorldCardCover } from './WorldCardCover';
import { WorldCardFormatSymbol } from './WorldCardFormatSymbol';
import { WorldCardStoryPanel } from './WorldCardStoryPanel';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';
import './world-card.css';

/**
 * Info page: the world's full overview — cover, byline, states, tags,
 * synopsis, the Chapters card (its only reading action, or Start Story while a
 * story the host can start has no chapters), Open Codex, and the Information
 * row that opens the world's story information dialog.
 * Every value and destination comes from the host; unknown values are omitted.
 * This is the public view a reader sees. It shows no owner or library states
 * (visibility, draft, acquisition); the owner's view is a separate Story View.
 */
export function WorldCardInfo({ story, onRead, onStart, onOpenCodex, readingPosition, coverAction }: WorldCardInfoProps) {
  const detail = 'author' in story ? story : undefined;
  const coverUrl = story.imageUrl?.trim() || undefined;
  const creatorName = story.creatorName?.trim() || detail?.author?.trim();
  const publicationLabel = detail?.publicationStatus === 'ongoing' ? 'On Going'
    : detail?.publicationStatus === 'completed' ? 'Completed' : undefined;
  const genre = detail?.genre?.trim();
  const tags = storyTags(detail?.tags);

  return <LibraryPanel as="article" padding="none" className="world-card-info" data-world-card="info"
    aria-labelledby={`world-info-title-${story.id}`}>
    {coverUrl && <span className="world-card-info-reflection" aria-hidden="true"
      style={{ backgroundImage: `url(${JSON.stringify(coverUrl)})` } as CSSProperties} />}
    <span className="world-card-info-scrim" aria-hidden="true" />
    <div className="world-card-info-body">
      <div className="world-card-info-hero">
        <div className="world-card-info-cover">
          <WorldCard face="info" world={story} />
          {coverAction && <div className="world-card-info-cover-action">{coverAction}</div>}
        </div>
        <div className="world-card-info-identity">
          <header>
            <h1 id={`world-info-title-${story.id}`} className="world-card-info-title font-display">{story.title}</h1>
            {creatorName && <p className="world-card-info-byline">
              <span className="world-card-info-byline-by">by</span>{' '}
              <span className="world-card-info-creator">
                {story.creatorTitle
                  ? <ElementalTitle as="span" element={story.creatorTitle.element}
                      intensity={story.creatorTitle.intensity} color={story.creatorTitle.color}>{creatorName}</ElementalTitle>
                  : creatorName}
              </span>
            </p>}
          </header>
          <div className="world-card-info-pills" role="group" aria-label="Story status">
            {publicationLabel && <SEIBadge size="lg" variant={publicationLabel === 'On Going' ? 'success' : 'neutral'}
              className="world-card-info-pill world-card-info-pill-status" data-status={detail?.publicationStatus}
              aria-label={`Story status: ${publicationLabel}`}>
              <span className="world-card-info-status-dot" aria-hidden="true" />{publicationLabel}
            </SEIBadge>}
            {detail?.recentlyRead && <SEIBadge size="lg" variant="info" className="world-card-info-pill">Recently read</SEIBadge>}
            {genre && <span className="world-card-info-genre">
              <Flower2 size={22} aria-hidden="true" /><span className="sr-only">Genre: </span>{genre}
            </span>}
          </div>
        </div>
        {tags.length > 0 && <ul className="world-card-info-pills world-card-info-tags" aria-label="Story tags">
          {tags.map(tag => <li key={tag.key}><StoryTagChip {...tag} /></li>)}
        </ul>}
      </div>

      <div className="world-card-info-divider" aria-hidden="true"><span /></div>

      <WorldSynopsis key={story.id} storyId={story.id} synopsis={detail?.synopsis?.trim()} />

      <ChaptersCard story={story} currentArc={detail?.currentArc?.trim()} coverUrl={coverUrl}
        onRead={onRead} onStart={onStart} readingPosition={readingPosition} />

      {(onOpenCodex || detail) && <div className="world-card-info-tools">
        {onOpenCodex && <StoryToolCard icon="navigation-book" title="Open Codex"
          description="Explore the lore, sects, and world" onOpen={onOpenCodex} />}
        {detail && <InformationToolRow world={detail} />}
      </div>}
    </div>
  </LibraryPanel>;
}

/** The world's tags, once each, resolved against the Story Seed tag catalog for their category color. */
function storyTags(tags: readonly string[] | undefined) {
  const seen = new Set<string>();
  return (tags ?? []).flatMap(raw => {
    const label = raw.trim();
    const key = normalizeStoryTagIdentity(label);
    if (!label || seen.has(key)) return [];
    seen.add(key);
    return [{ key, label, metadata: getTagMetadata(label) }];
  });
}

/** One tag as a chip in its catalog category color; a tag outside the catalog stays neutral. */
function StoryTagChip({ label, metadata }: { label: string; metadata?: StoryTagMetadata }) {
  const accent = metadata && STORY_TAG_COLOR_ACCENTS[metadata.color];
  return <SEIBadge size="lg" variant="outline" className="world-card-info-pill world-card-info-tag"
    data-tag-color={metadata?.color} title={metadata?.category}
    style={accent && metadata.color !== 'black' ? { '--world-info-tag-accent': accent } as CSSProperties : undefined}>
    {metadata && <span className="world-card-info-tag-dot" aria-hidden="true" />}
    {metadata?.label ?? label}
  </SEIBadge>;
}

/** Clamped synopsis with an accessible More control that appears only when the text overflows. */
function WorldSynopsis({ storyId, synopsis }: { storyId: string; synopsis?: string }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const id = `world-info-synopsis-${storyId}`;

  useLayoutEffect(() => {
    const text = textRef.current;
    if (!text || expanded) return;
    const measure = () => setOverflows(text.scrollHeight > text.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(text);
    return () => observer.disconnect();
  }, [synopsis, expanded]);

  if (!synopsis) return <p className="world-card-info-synopsis world-card-info-synopsis-empty">Synopsis is not available yet.</p>;
  return <section className="world-card-info-synopsis-section" aria-label="Synopsis">
    <p ref={textRef} id={id} className={`world-card-info-synopsis${expanded ? '' : ' world-card-info-synopsis-clamped'}`}>{synopsis}</p>
    {(overflows || expanded) && <LibraryButton variant="ghost" size="sm" className="world-card-info-more"
      aria-expanded={expanded} aria-controls={id}
      iconRight={expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
      onClick={() => setExpanded(current => !current)}>
      {expanded ? 'Less' : 'More'}
    </LibraryButton>}
  </section>;
}

/**
 * The page's only reading action: one tap target wired to the host's reading
 * action, or to its start action while the story has no chapters yet.
 */
function ChaptersCard({ story, currentArc, coverUrl, onRead, onStart, readingPosition }: {
  story: WorldCardInfoProps['story']; currentArc?: string; coverUrl?: string;
  onRead?: () => void; onStart?: () => void; readingPosition?: WorldCardInfoProps['readingPosition'];
}) {
  const count = Number.isSafeInteger(story.chapterCount) && story.chapterCount > 0 ? story.chapterCount : 0;
  const resumeChapter = readingPosition && Number.isSafeInteger(readingPosition.chapterNumber) && readingPosition.chapterNumber > 0
    ? readingPosition.chapterNumber : undefined;
  const action = count > 0 ? onRead : onStart;
  const readable = Boolean(action);
  const actionLabel = count === 0 ? 'Start Story' : resumeChapter ? `Continue · Ch. ${resumeChapter}` : 'Start Reading';
  const countLabel = count === 0 ? 'No chapters yet' : `${count.toLocaleString()} ${count === 1 ? 'Chapter' : 'Chapters'}`;
  // LibraryCard wraps `media` in its own media slot; the slot is styled by .world-card-info-chapters.
  const media = coverUrl ? <WorldCardCover src={coverUrl} title={story.title} decorative compact /> : undefined;
  const content = <div className="world-card-info-chapters-content">
    <p className="world-card-info-chapters-count font-display">{countLabel}</p>
    {currentArc && <p className="world-card-info-chapters-arc">Current arc · {currentArc}</p>}
    {readable
      ? <span className="world-card-info-chapters-cue" aria-hidden="true">
          <span className="whitespace-nowrap">{actionLabel}<ArrowRight size={18} /></span>
        </span>
      : count > 0 && <span className="world-card-info-chapters-unavailable">Reading isn’t available here yet</span>}
  </div>;
  const shared = { padding: 'none' as const, className: 'world-card-info-chapters', contentClassName: 'gap-0', media, 'data-world-info-chapters': readable ? 'action' : 'static' };

  return <div className="world-card-info-chapters-stack">
    {readable
      ? <LibraryCard {...shared} interactive onClick={() => action!()}
          aria-label={`${actionLabel}: ${story.title}, ${countLabel}${currentArc ? `, current arc ${currentArc}` : ''}`}>
          {content}
        </LibraryCard>
      : <LibraryCard {...shared}>{content}</LibraryCard>}
  </div>;
}

/** Quieter secondary destinations; rendered only when the host supplies a working one. */
function StoryToolCard({ icon, title, description, onOpen }: {
  icon: LibraryIconName; title: string; description: string; onOpen: () => void;
}) {
  return <LibraryCard interactive onClick={() => onOpen()} padding="none" className="world-card-info-tool" contentClassName="gap-0"
    aria-label={`${title}: ${description}`}>
    <div className="world-card-info-tool-content">
      <span className="world-card-info-tool-art" aria-hidden="true"><LibraryIcon name={icon} size={40} /></span>
      <span className="world-card-info-tool-text">
        <span className="world-card-info-tool-title font-display">{title}</span>
        <span className="world-card-info-tool-description">{description}</span>
      </span>
      <ChevronRight size={22} aria-hidden="true" className="world-card-info-tool-chevron" />
    </div>
  </LibraryCard>;
}

/**
 * Information: the world's format mark and name, opening the same story information
 * dialog as the Full card's format mark. Provenance records will live here later.
 */
function InformationToolRow({ world }: { world: HomeWorld }) {
  const format = world.format?.trim();
  return <WorldCardStoryPanel world={world} triggerClassName="world-card-info-tool world-card-info-information"
    trigger={<span className="world-card-info-tool-content">
      <span className="world-card-info-tool-art" aria-hidden="true">
        {format ? <WorldCardFormatSymbol format={format} /> : <Info size={24} aria-hidden="true" />}
      </span>
      <span className="world-card-info-tool-text">
        <span className="world-card-info-tool-title font-display">Information</span>
        {format && <span className="world-card-info-tool-description">{format}</span>}
      </span>
      <ChevronRight size={22} aria-hidden="true" className="world-card-info-tool-chevron" />
    </span>} />;
}
