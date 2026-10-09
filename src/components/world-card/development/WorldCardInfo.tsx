import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { BookOpen, ChevronDown, ChevronRight, ChevronUp, DraftingCompass, Film, Flower2, Info, Orbit, Sparkles, Square } from 'lucide-react';
import { ElementalTitle, SEIBadge } from '@seihouse/ui';
import { LibraryButton, LibraryCard, LibraryIcon, LibraryPanel, ManifestButton, type LibraryIconName } from '@seihouse/library-ui';
import { getTagMetadata, normalizeStoryTagIdentity, STORY_TAG_COLOR_ACCENTS, type StoryTagMetadata } from '@seihouse/sen/story-seed';
import type { WorldCardInfoProps } from '../shared/worldCardContracts';
import { useDominantColor } from '@seihouse/sen/motion-picture';
import { WorldCard } from './WorldCard';
import { WorldCardBackdropVideo, type WorldCardBackdropVideoHandle } from './WorldCardBackdropVideo';
import { WorldCardFormatPanel } from './WorldCardFormatPanel';
import { WorldExpressions, type WorldExpansionPreview } from '../../light-novels-home/development/WorldExpressions';
import { WorldCardInformationPanel, worldInformationSummary } from './WorldCardInformationPanel';
import type { StoryDetailDisplay } from '../../light-novels-home/shared/storyDetailContracts';
import './world-card.css';

/**
 * Info page: the world's full overview, presented the way Audible presents a
 * title. A big cover stands centered over a backdrop made from the cover's own
 * art and color, with the world's motion picture looping behind it when it has
 * one. Under the cover sits the page's one reading action, which only ever
 * says Continue, or Begin Story while a story the host can start has no
 * chapters; then the title, the byline, one meta line (genre | chapters, and
 * on a phone the publication status) and the tags, all centered. The synopsis, Open Codex
 * and the Information row follow. From 768px the cover stands beside the rest.
 * Every value and destination comes from the host; unknown values are omitted.
 * This is the public view a reader sees. It shows no owner or library states
 * (visibility, draft, acquisition); the owner's view is a separate Story View.
 */
export function WorldCardInfo({ story, onRead, onStart, onOpenCodex, onOpenBlueprint, portal, readingPosition, coverAction, readingLanguage }: WorldCardInfoProps) {
  const detail = 'author' in story ? story : undefined;
  const coverUrl = story.imageUrl?.trim() || undefined;
  const videoUrl = 'videoUrl' in story ? story.videoUrl?.trim() || undefined : undefined;
  const backdropVideo = useRef<WorldCardBackdropVideoHandle>(null);
  const [clipPlaying, setClipPlaying] = useState(false);
  const glowColor = useDominantColor(coverUrl);
  const creatorName = story.creatorName?.trim() || detail?.author?.trim();
  const publicationLabel = detail?.publicationStatus === 'ongoing' ? 'On Going'
    : detail?.publicationStatus === 'completed' ? 'Completed' : undefined;
  const genre = detail?.genre?.trim();
  const currentArc = detail?.currentArc?.trim();
  const tags = storyTags(detail?.tags);
  const count = Number.isSafeInteger(story.chapterCount) && story.chapterCount > 0 ? story.chapterCount : 0;
  const countLabel = count === 0 ? 'No chapters yet' : `${count.toLocaleString()} ${count === 1 ? 'Chapter' : 'Chapters'}`;

  return <LibraryPanel as="article" padding="none" className="world-card-info" data-world-card="info"
    aria-labelledby={`world-info-title-${story.id}`}
    style={{ '--world-card-glow': glowColor } as CSSProperties}>
    <div className="world-card-info-backdrop" aria-hidden="true">
      {coverUrl && <span className="world-card-info-backdrop-art"
        style={{ backgroundImage: `url(${JSON.stringify(coverUrl)})` } as CSSProperties} />}
      {/* The world's own motion picture, when it has one, loops silently behind the cover. */}
      <WorldCardBackdropVideo ref={backdropVideo} src={videoUrl} className="world-card-info-video" onPlayingChange={setClipPlaying} />
      <span className="world-card-info-scrim" />
    </div>
    <div className="world-card-info-body">
      <div className="world-card-info-hero">
        <div className="world-card-info-cover">
          <WorldCard face="info" world={story} />
          {coverAction && <div className="world-card-info-cover-action">{coverAction}</div>}
          {/* The format mark, as on the Full card: it opens the story's information (views and more to come). */}
          {detail && <WorldCardFormatPanel key={story.id} world={detail} triggerClassName="world-card-base-format world-card-info-format" />}
          {/* MP: plays or stops the clip behind the page, so a reader whose phone would not start it (Low Power Mode) can. */}
          {videoUrl && <button type="button" className="world-card-base-format world-card-info-motion" aria-pressed={clipPlaying}
            aria-label={`${clipPlaying ? 'Stop' : 'Play'} motion for ${story.title}`}
            onClick={() => clipPlaying ? backdropVideo.current?.pause() : backdropVideo.current?.play()}>
            {clipPlaying ? <Square size={14} aria-hidden="true" /> : <Film size={17} aria-hidden="true" />}
          </button>}
        </div>
        <div className="world-card-info-identity">
          {/* On a phone the reading pill and the story's states share one row; beside the cover the states lead the column. */}
          <div className="world-card-info-actions">
            <div className="world-card-info-buttons">
              <ReadingAction title={story.title} count={count} countLabel={countLabel} currentArc={currentArc}
                onRead={onRead} onStart={onStart} readingPosition={readingPosition} />
              {/* The world's Blueprint, a small companion to the reading pill. */}
              {onOpenBlueprint && <LibraryButton variant="secondary" size="lg" icon={DraftingCompass}
                className="world-card-info-blueprint" aria-label={`Blueprint: ${story.title}`} title="Blueprint" onClick={() => onOpenBlueprint()}>
                <span className="world-card-info-blueprint-label">Blueprint</span>
              </LibraryButton>}
            </div>
            {(publicationLabel || detail?.recentlyRead) && <div className="world-card-info-pills world-card-info-states" role="group" aria-label="Story status">
              {publicationLabel && <SEIBadge size="lg" variant={publicationLabel === 'On Going' ? 'success' : 'neutral'}
                className="world-card-info-pill world-card-info-pill-status" data-status={detail?.publicationStatus}
                aria-label={`Story status: ${publicationLabel}`}>
                <span className="world-card-info-status-dot" aria-hidden="true" />{publicationLabel}
              </SEIBadge>}
              {detail?.recentlyRead && <SEIBadge size="lg" variant="info" className="world-card-info-pill">Recently read</SEIBadge>}
            </div>}
          </div>
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
          <p className="world-card-info-meta" data-world-info-meta="">
            {genre && <span className="world-card-info-genre">
              <Flower2 size={16} aria-hidden="true" /><span className="sr-only">Genre: </span><span className="world-card-info-genre-name">{genre}</span>
            </span>}
            <span className="world-card-info-chapter-count">{countLabel}</span>
            {/* On a phone the publication status joins this line; beside the cover it stays a badge above the title. */}
            {publicationLabel && <span className="world-card-info-meta-status" data-status={detail?.publicationStatus}>
              <span className="world-card-info-status-dot" aria-hidden="true" />{publicationLabel}
            </span>}
            {currentArc && <span className="world-card-info-arc">Current arc · {currentArc}</span>}
          </p>
          {tags.length > 0 && <ul className="world-card-info-pills world-card-info-tags" aria-label="Story tags">
            {tags.map(tag => <li key={tag.key}><StoryTagChip {...tag} /></li>)}
          </ul>}
        </div>
      </div>

      <div className="world-card-info-divider" aria-hidden="true"><span /></div>

      <WorldSynopsis key={story.id} storyId={story.id} synopsis={detail?.synopsis?.trim()} />

      <WorldInfoTools key={`${story.id}-tools`} world={detail} onOpenCodex={onOpenCodex} portal={portal} readingLanguage={readingLanguage} />
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
 * The page's only reading action: one pill under the cover, wired to the
 * host's reading action, or to its start action while the story has no
 * chapters yet. Without a working destination it says so instead.
 */
function ReadingAction({ title, count, countLabel, currentArc, onRead, onStart, readingPosition }: {
  title: string; count: number; countLabel: string; currentArc?: string;
  onRead?: () => void; onStart?: () => void; readingPosition?: WorldCardInfoProps['readingPosition'];
}) {
  const resumeChapter = readingPosition && Number.isSafeInteger(readingPosition.chapterNumber) && readingPosition.chapterNumber > 0
    ? readingPosition.chapterNumber : undefined;
  const action = count > 0 ? onRead : onStart;
  // The pill says only Begin Story or Continue; where it continues is for assistive technology.
  const actionLabel = count === 0 ? 'Begin Story' : 'Continue';
  const spokenAction = resumeChapter ? `Continue at Chapter ${resumeChapter}` : actionLabel;
  if (!action) return count > 0
    ? <p className="world-card-info-read-unavailable" data-world-info-chapters="static">Reading isn’t available here yet</p>
    : null;
  // The same night-glass button as Home's Carve New Destiny.
  return <ManifestButton size="lg" className="world-card-info-read" data-world-info-chapters="action"
    icon={count === 0 ? Sparkles : BookOpen}
    aria-label={`${spokenAction}: ${title}, ${countLabel}${currentArc ? `, current arc ${currentArc}` : ''}`}
    onClick={() => action()}>
    {actionLabel}
  </ManifestButton>;
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
 * The cards under the synopsis: Open Codex, Portal and Information. Portal
 * opens the world's connected media below the cards, on this page.
 */
function WorldInfoTools({ world, onOpenCodex, portal, readingLanguage }: {
  world?: StoryDetailDisplay;
  onOpenCodex?: () => void;
  portal?: WorldCardInfoProps['portal'];
  readingLanguage?: WorldCardInfoProps['readingLanguage'];
}) {
  const [portalOpen, setPortalOpen] = useState(false);
  const portalId = useId();
  const showPortal = Boolean(portal && world);
  if (!onOpenCodex && !world) return null;
  return <>
    <div className="world-card-info-tools">
      {onOpenCodex && <StoryToolCard icon="navigation-book" title="Open Codex"
        description="Explore the lore, sects, and world" onOpen={onOpenCodex} />}
      {showPortal && <button type="button" className="world-card-info-tool world-card-info-information world-card-info-portal"
        aria-expanded={portalOpen} aria-controls={portalId} onClick={() => setPortalOpen(open => !open)}>
        <span className="world-card-info-tool-content">
          <span className="world-card-info-tool-art" aria-hidden="true"><Orbit size={24} aria-hidden="true" /></span>
          <span className="world-card-info-tool-text">
            <span className="world-card-info-tool-title font-display">Portal</span>
            <span className="world-card-info-tool-description">{portalSummary(portal!.expansions)}</span>
          </span>
          <ChevronRight size={22} aria-hidden="true" className="world-card-info-tool-chevron" />
        </span>
      </button>}
      {world && <InformationToolRow world={world} readingLanguage={readingLanguage} />}
    </div>
    {showPortal && portalOpen && <div id={portalId} className="world-card-info-portal-media" data-testid="world-info-portal">
      {portal!.expansions.length
        ? <WorldExpressions world={world!} expansions={portal!.expansions} />
        : <p className="world-card-info-portal-empty">
            {world!.title} is a novel so far. Its manga, games and other media will open here once they exist.
          </p>}
    </div>}
  </>;
}

/** The Portal card's line: the world's media, the novel first ("Novel · Manga · Game"). */
const portalSummary = (expansions: readonly WorldExpansionPreview[]) => expansions.length
  ? ['Novel', ...expansions.map(expansion => expansion.medium === 'manga' ? 'Manga' : 'Game')].join(' · ')
  : 'This world’s other media';

/**
 * Information: the world's language (and a way to read it in the reader's
 * own), its rating and the creator's permissions.
 */
function InformationToolRow({ world, readingLanguage }: { world: StoryDetailDisplay; readingLanguage?: WorldCardInfoProps['readingLanguage'] }) {
  const summary = worldInformationSummary(world);
  return <WorldCardInformationPanel world={world} readingLanguage={readingLanguage} triggerClassName="world-card-info-tool world-card-info-information"
    trigger={<span className="world-card-info-tool-content">
      <span className="world-card-info-tool-art" aria-hidden="true"><Info size={24} aria-hidden="true" /></span>
      <span className="world-card-info-tool-text">
        <span className="world-card-info-tool-title font-display">Information</span>
        <span className="world-card-info-tool-description">{summary || 'Language, rating and permissions'}</span>
      </span>
      <ChevronRight size={22} aria-hidden="true" className="world-card-info-tool-chevron" />
    </span>} />;
}
