import { useId, useMemo, useState } from 'react';
import { CalendarDays, Search, Swords, Trophy } from 'lucide-react';
import { LibraryPanel, LibraryDiscoveryIcon } from '@seihouse/library-ui';
import { SEIEmptyState, SEIFilterChip } from '@seihouse/ui';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';
import { WorldCard } from '../../world-card/development/WorldCard';
import type { DiscoverProps, DiscoverRelease } from '../shared/discoverContracts';
import './discover.css';

/** How many releases the feed shows before Show more. */
const FEED_PAGE = 8;
type Feed = 'latest' | 'mine';

/** "Just now", "12m ago", "5h ago", "3d ago", then the date. */
export function releaseAge(releasedAt: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(releasedAt).getTime()) / 60_000);
  if (!Number.isFinite(minutes)) return '';
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))}d ago`;
  return new Date(releasedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Whether a world answers the reader's search: its title, creator, genre or tags. */
function worldMatches(world: HomeWorld, query: string) {
  if (!query) return true;
  return [world.title, world.creatorName, world.genre, ...(world.tags ?? [])]
    .some(text => text?.toLowerCase().includes(query));
}

/**
 * Discover: Latest Releases (and My updates), the Fate Survival spotlight,
 * genre browsing, and Heavenly Rankings and Events. Every world opens through
 * the host. Nothing here ranks or recommends: the feed is newest first.
 */
export function Discover({
  worlds, releases, trackedWorldIds, fateSurvivalWorldIds = [], rankingBoards = [], events = [], onOpenWorld, notice, now,
}: DiscoverProps) {
  const ids = useId();
  const [query, setQuery] = useState('');
  const [feed, setFeed] = useState<Feed>('latest');
  const [feedLimit, setFeedLimit] = useState(FEED_PAGE);
  const [genre, setGenre] = useState('All');
  const clock = now ?? new Date();
  const search = query.trim().toLowerCase();

  const worldById = useMemo(() => new Map(worlds.map(world => [world.id, world])), [worlds]);
  const tracked = useMemo(() => new Set(trackedWorldIds ?? []), [trackedWorldIds]);
  const feedReleases = useMemo(() => releases
    .flatMap(release => {
      const world = worldById.get(release.worldId);
      return world ? [{ release, world }] : [];
    })
    .filter(({ world }) => (feed === 'latest' || tracked.has(world.id)) && worldMatches(world, search))
    .sort((a, b) => new Date(b.release.releasedAt).getTime() - new Date(a.release.releasedAt).getTime()),
  [releases, worldById, feed, tracked, search]);

  const fateWorlds = fateSurvivalWorldIds.flatMap(id => {
    const world = worldById.get(id);
    return world && worldMatches(world, search) ? [world] : [];
  });
  const genres = ['All', ...Array.from(new Set(worlds.map(world => world.genre)))];
  const browseWorlds = worlds.filter(world => (genre === 'All' || world.genre === genre) && worldMatches(world, search));

  const feedPanelId = `${ids}-feed`;
  const chooseFeed = (next: Feed) => { setFeed(next); setFeedLimit(FEED_PAGE); };

  return <div data-discover className="discover space-y-8 pb-10 text-signal sm:space-y-12">
    <header className="discover-header">
      <p className="discover-eyebrow">Expanded Novels</p>
      <h1 className="discover-title font-display font-bold leading-none tracking-tight">Discover</h1>
      <p className="discover-lede font-serif">
        New chapters the moment they're out, and worlds that open straight into the expanded reader.
      </p>
      <label className="discover-search">
        <Search aria-hidden="true" size={18} />
        <span className="sr-only">Search worlds</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)}
          placeholder="Search worlds, creators, tags" />
      </label>
    </header>

    {notice}

    <div className="discover-layout">
      <section aria-labelledby={`${ids}-releases`} className="discover-feed">
        <div className="discover-section-head">
          <h2 id={`${ids}-releases`} className="discover-section-title font-display">Latest Releases</h2>
          <div role="tablist" aria-label="Feed" className="discover-tabs">
            {([['latest', 'All releases'], ['mine', 'My updates']] as const).map(([value, label]) =>
              <button key={value} type="button" role="tab" id={`${ids}-tab-${value}`} aria-controls={feedPanelId}
                aria-selected={feed === value} className="discover-tab" onClick={() => chooseFeed(value)}>{label}</button>)}
          </div>
        </div>
        <p className="discover-section-note">Newest first. No algorithm decides what you see.</p>
        <div role="tabpanel" id={feedPanelId} aria-labelledby={`${ids}-tab-${feed}`}>
          {feedReleases.length === 0
            ? <LibraryPanel padding="sm">
                <SEIEmptyState icon={LibraryDiscoveryIcon} titleAs="h3"
                  title={feed === 'mine' ? (trackedWorldIds ? 'No new chapters in your tracked series' : 'My updates arrives with the Tracker') : 'No releases match'}
                  description={feed === 'mine'
                    ? 'Track a series and its new chapters gather here, newest first.'
                    : 'Try another search, or check back when new chapters go out.'} />
              </LibraryPanel>
            : <>
                <ol className="discover-releases" aria-label={feed === 'mine' ? 'My updates' : 'Latest releases'}>
                  {feedReleases.slice(0, feedLimit).map(({ release, world }) =>
                    <ReleaseRow key={release.id} release={release} world={world} age={releaseAge(release.releasedAt, clock)}
                      tracked={tracked.has(world.id)} onOpen={() => onOpenWorld(world.id)} />)}
                </ol>
                {feedReleases.length > feedLimit && <button type="button" className="discover-more"
                  onClick={() => setFeedLimit(limit => limit + FEED_PAGE)}>Show more releases</button>}
              </>}
        </div>
      </section>

      <aside className="discover-aside" aria-label="Rankings and events">
        <section aria-labelledby={`${ids}-rankings`} className="discover-tile-group">
          <h2 id={`${ids}-rankings`} className="discover-section-title discover-section-title--small font-display">
            <Trophy aria-hidden="true" size={18} /> Heavenly Rankings
          </h2>
          {rankingBoards.length === 0
            ? <p className="discover-section-note">The boards open soon.</p>
            : <ul className="discover-boards">
                {rankingBoards.map(board => <li key={board.id} className="discover-board">
                  <span className="discover-board-label">{board.label}</span>
                  <span className="discover-board-description">{board.description}</span>
                  <span className="discover-soon">Soon</span>
                </li>)}
              </ul>}
        </section>
        <section aria-labelledby={`${ids}-events`} className="discover-tile-group">
          <h2 id={`${ids}-events`} className="discover-section-title discover-section-title--small font-display">
            <CalendarDays aria-hidden="true" size={18} /> Events
          </h2>
          {events.length === 0
            ? <p className="discover-section-note">No events yet.</p>
            : <ul className="discover-events">
                {events.map(event => <li key={event.id} className="discover-event">
                  {event.imageUrl && <img src={event.imageUrl} alt="" className="discover-event-art" loading="lazy" referrerPolicy="no-referrer" />}
                  <span className="discover-event-body">
                    {event.when && <span className="discover-event-when">{event.when}</span>}
                    <span className="discover-event-title">{event.title}</span>
                    <span className="discover-event-description">{event.description}</span>
                  </span>
                </li>)}
              </ul>}
        </section>
      </aside>

      {fateWorlds.length > 0 && <section aria-labelledby={`${ids}-fate`} className="discover-fate">
        <div className="discover-fate-head">
          <span className="discover-fate-mark" aria-hidden="true"><Swords size={20} /></span>
          <div>
            <h2 id={`${ids}-fate`} className="discover-section-title font-display">Fate Survival</h2>
            <p className="discover-section-note">Stories where every choice is a trial, and the wrong one ends the run.</p>
          </div>
        </div>
        <ul className="discover-rail" aria-label="Fate Survival worlds">
          {fateWorlds.map(world => <li key={world.id}>
            <WorldCard world={world} onOpen={() => onOpenWorld(world.id)}
              displayStatus={world.publicationStatus ? { view: 'public', value: world.publicationStatus } : undefined} />
          </li>)}
        </ul>
      </section>}

      <section aria-labelledby={`${ids}-browse`} className="discover-browse space-y-4">
        <div>
          <h2 id={`${ids}-browse`} className="discover-section-title font-display">Browse worlds</h2>
          <p className="discover-section-note">Find exactly the kind of story you want.</p>
        </div>
        <div className="discover-genres" role="group" aria-label="Genre">
          {genres.map(value => <SEIFilterChip key={value} label={value} selected={genre === value}
            onSelectedChange={() => setGenre(value)} />)}
        </div>
        {browseWorlds.length === 0
          ? <LibraryPanel className="mx-auto max-w-lg">
              <SEIEmptyState icon={LibraryDiscoveryIcon} titleAs="h3" title="No worlds match"
                description="Try another genre or search." />
            </LibraryPanel>
          : <ul className="discover-grid" aria-label="Worlds">
              {browseWorlds.map(world => <li key={world.id}>
                <WorldCard world={world} onOpen={() => onOpenWorld(world.id)}
                  displayStatus={world.publicationStatus ? { view: 'public', value: world.publicationStatus } : undefined} />
              </li>)}
            </ul>}
      </section>
    </div>
  </div>;
}

function ReleaseRow({ release, world, age, tracked, onOpen }: {
  release: DiscoverRelease; world: HomeWorld; age: string; tracked: boolean; onOpen: () => void;
}) {
  const chapter = `Chapter ${release.chapterNumber}${release.chapterTitle ? ` · ${release.chapterTitle}` : ''}`;
  return <li>
    <button type="button" className="discover-release" onClick={onOpen}
      aria-label={`${world.title}, ${chapter}, ${age}`}>
      <span className="discover-release-cover" aria-hidden="true">
        {world.imageUrl ? <img src={world.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}
      </span>
      <span className="discover-release-body">
        <span className="discover-release-title">{world.title}</span>
        <span className="discover-release-chapter">{chapter}</span>
        <span className="discover-release-meta">
          {[world.creatorName, world.genre].filter(Boolean).join(' · ')}
          {tracked && <span className="discover-tracked">Tracking</span>}
        </span>
      </span>
      <time className="discover-release-age" dateTime={release.releasedAt}>{age}</time>
    </button>
  </li>;
}
