import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Activity, ArrowRight, ChevronDown, ChevronRight, ChevronUp, Eye, Flower2, GitBranch, Lock } from 'lucide-react';
import { ElementalTitle, SEIBadge } from '@seihouse/ui';
import { LibraryButton, LibraryCard, LibraryIcon, LibraryPanel, type LibraryIconName } from '@seihouse/library-ui';
import type { WorldCardInfoProps } from '../shared/worldCardContracts';
import { WorldCard } from './WorldCard';
import { WorldCardCover } from './WorldCardCover';
import { WORLD_ACTIVITY_DISPLAY } from './worldActivityDisplay';
import './world-card.css';

/**
 * Info page: the world's full overview — cover, byline, states, tags, metrics,
 * synopsis, the Chapters card (its only reading action) and quieter story tools.
 * Every value and destination comes from the host; unknown values are omitted.
 */
export function WorldCardInfo({ story, onRead, onOpenCodex, onOpenTimeline, readingPosition }: WorldCardInfoProps) {
  const detail = 'author' in story ? story : undefined;
  const coverUrl = story.imageUrl?.trim() || undefined;
  const creatorName = story.creatorName?.trim() || detail?.author?.trim();
  const publicationLabel = detail?.publicationStatus === 'ongoing' ? 'On Going'
    : detail?.publicationStatus === 'completed' ? 'Completed' : undefined;
  const genre = detail?.genre?.trim();
  const tags = detail?.tags.map(tag => tag.trim()).filter(Boolean) ?? [];
  const cultivationRate = detail?.cultivationRate?.trim();

  return <LibraryPanel as="article" padding="none" className="world-card-info" data-world-card="info"
    aria-labelledby={`world-info-title-${story.id}`}>
    {coverUrl && <span className="world-card-info-reflection" aria-hidden="true"
      style={{ backgroundImage: `url(${JSON.stringify(coverUrl)})` } as CSSProperties} />}
    <span className="world-card-info-scrim" aria-hidden="true" />
    <div className="world-card-info-body">
      <div className="world-card-info-hero">
        <div className="world-card-info-cover">
          <WorldCard face="info" world={story} />
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
          <div className="world-card-info-pills" role="group" aria-label="Library state">
            {publicationLabel && <SEIBadge size="lg" variant={publicationLabel === 'On Going' ? 'success' : 'neutral'}
              className="world-card-info-pill world-card-info-pill-status" data-status={detail?.publicationStatus}
              aria-label={`Story status: ${publicationLabel}`}>
              <span className="world-card-info-status-dot" aria-hidden="true" />{publicationLabel}
            </SEIBadge>}
            <LibraryState story={story} />
            {genre && <span className="world-card-info-genre">
              <Flower2 size={22} aria-hidden="true" /><span className="sr-only">Genre: </span>{genre}
            </span>}
          </div>
          {(tags.length > 0 || cultivationRate) && <ul className="world-card-info-pills" aria-label="Story tags">
            {tags.map(tag => <li key={tag}><SEIBadge size="lg" variant="outline" className="world-card-info-pill">#{tag}</SEIBadge></li>)}
            {cultivationRate && <li><SEIBadge size="lg" variant="outline" className="world-card-info-pill">
              Cultivation Rate: {cultivationRate}
            </SEIBadge></li>}
          </ul>}
        </div>
      </div>

      <WorldMetrics story={story} />

      <div className="world-card-info-divider" aria-hidden="true"><span /></div>

      <WorldSynopsis key={story.id} storyId={story.id} synopsis={detail?.synopsis?.trim()} />

      <ChaptersCard story={story} currentArc={detail?.currentArc?.trim()} coverUrl={coverUrl}
        onRead={onRead} readingPosition={readingPosition} />

      {(onOpenCodex || onOpenTimeline) && <div className="world-card-info-tools">
        {onOpenCodex && <StoryToolCard icon="navigation-book" title="Open Codex"
          description="Explore the lore, sects, and world" onOpen={onOpenCodex} />}
        {onOpenTimeline && <StoryToolCard icon="story-arc" title="Fate Timeline"
          description="Uncover key events and turning points" onOpen={onOpenTimeline} />}
      </div>}
    </div>
  </LibraryPanel>;
}

/** Library state: Draft, Sealed, or Unacquired, plus Recently read — Library-only acquisition states. */
function LibraryState({ story }: Pick<WorldCardInfoProps, 'story'>) {
  const detail = 'author' in story ? story : undefined;
  if (detail?.draft || (!detail && story.status === 'draft')) {
    return <>
      <SEIBadge size="lg" variant="danger" className="world-card-info-pill">Draft</SEIBadge>
      {detail?.recentlyRead && <SEIBadge size="lg" variant="info" className="world-card-info-pill">Recently read</SEIBadge>}
    </>;
  }
  if (!detail) {
    return <SEIBadge size="lg" variant="neutral" className="world-card-info-pill">{story.status === 'complete' ? 'Complete' : story.status === 'public' ? 'Public' : 'Shared'}</SEIBadge>;
  }
  return <>
    {detail.acquired
      ? <SEIBadge size="lg" variant="outline" className="world-card-info-pill world-card-info-pill-sealed">
          <Lock size={15} aria-hidden="true" />Sealed
        </SEIBadge>
      : <SEIBadge size="lg" variant="outline" className="world-card-info-pill">Unacquired</SEIBadge>}
    {detail.recentlyRead && <SEIBadge size="lg" variant="info" className="world-card-info-pill">Recently read</SEIBadge>}
  </>;
}

/** Views, Branches, and Activity — each shown only when the host supplies it. */
function WorldMetrics({ story }: Pick<WorldCardInfoProps, 'story'>) {
  const detail = 'author' in story ? story : undefined;
  const views = detail && Number.isSafeInteger(detail.reads) && detail.reads >= 0 ? detail.reads : undefined;
  const branches = detail?.branchCount !== undefined && Number.isSafeInteger(detail.branchCount) && detail.branchCount >= 0
    ? detail.branchCount : undefined;
  const activity = detail?.activityStatus ? WORLD_ACTIVITY_DISPLAY[detail.activityStatus] : undefined;

  if (views === undefined && branches === undefined && !activity) {
    return <p className="world-card-info-metrics-empty">Views, branches and activity aren’t shared for this world yet.</p>;
  }
  return <dl className="world-card-info-metrics" aria-label="World information">
    {views !== undefined && <Metric icon={<Eye size={26} aria-hidden="true" />} label="Views" value={views.toLocaleString()} />}
    {branches !== undefined && <Metric icon={<GitBranch size={26} aria-hidden="true" />} label="Branches" value={branches.toLocaleString()} />}
    {activity && <div className="world-card-info-metric" data-activity={detail?.activityStatus}>
      <span className="world-card-info-metric-icon world-card-info-activity-icon"><Activity size={26} aria-hidden="true" /></span>
      <div className="min-w-0">
        <dt className="sr-only">Activity</dt>
        <dd className="world-card-info-activity">{activity.label}</dd>
      </div>
    </div>}
  </dl>;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="world-card-info-metric">
    <span className="world-card-info-metric-icon">{icon}</span>
    <div className="flex min-w-0 flex-col-reverse">
      <dt className="world-card-info-metric-label">{label}</dt>
      <dd className="world-card-info-metric-value">{value}</dd>
    </div>
  </div>;
}

/** Four-line synopsis with an accessible More control that appears only when the text overflows. */
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

/** The page's only reading action: one tap target wired to the host's reading action. */
function ChaptersCard({ story, currentArc, coverUrl, onRead, readingPosition }: {
  story: WorldCardInfoProps['story']; currentArc?: string; coverUrl?: string;
  onRead?: () => void; readingPosition?: WorldCardInfoProps['readingPosition'];
}) {
  const count = Number.isSafeInteger(story.chapterCount) && story.chapterCount > 0 ? story.chapterCount : 0;
  const resumeChapter = readingPosition && Number.isSafeInteger(readingPosition.chapterNumber) && readingPosition.chapterNumber > 0
    ? readingPosition.chapterNumber : undefined;
  const readable = Boolean(onRead) && count > 0;
  const actionLabel = resumeChapter ? `Continue Reading · Ch. ${resumeChapter}` : 'Start Reading';
  const countLabel = count === 0 ? 'No chapters yet' : `${count.toLocaleString()} ${count === 1 ? 'Chapter' : 'Chapters'}`;
  // LibraryCard wraps `media` in its own media slot; the slot is styled by .world-card-info-chapters.
  const media = coverUrl ? <WorldCardCover src={coverUrl} title={story.title} decorative compact /> : undefined;
  const content = <div className="world-card-info-chapters-content">
    <p className="world-card-info-chapters-count font-display">{countLabel}</p>
    {currentArc && <p className="world-card-info-chapters-arc">Current arc · {currentArc}</p>}
    {readable
      ? <span className="world-card-info-chapters-cue" aria-hidden="true">
          {resumeChapter
            ? <>Continue Reading <span className="whitespace-nowrap">· Ch. {resumeChapter}<ArrowRight size={18} /></span></>
            : <span className="whitespace-nowrap">Start Reading<ArrowRight size={18} /></span>}
        </span>
      : count > 0 && <span className="world-card-info-chapters-unavailable">Reading isn’t available here yet</span>}
  </div>;
  const shared = { padding: 'none' as const, className: 'world-card-info-chapters', contentClassName: 'gap-0', media, 'data-world-info-chapters': readable ? 'action' : 'static' };

  return <div className="world-card-info-chapters-stack">
    {readable
      ? <LibraryCard {...shared} interactive onClick={() => onRead!()}
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
      <span className="min-w-0 flex-1 py-3">
        <span className="world-card-info-tool-title font-display">{title}</span>
        <span className="world-card-info-tool-description">{description}</span>
      </span>
      <ChevronRight size={22} aria-hidden="true" className="world-card-info-tool-chevron" />
    </div>
  </LibraryCard>;
}
