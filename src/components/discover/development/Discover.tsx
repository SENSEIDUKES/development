import { useId, useMemo, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { LibraryPanel, LibraryDiscoveryIcon } from '@seihouse/library-ui';
import { SEIEmptyState } from '@seihouse/ui';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';
import { WorldCard } from '../../world-card/development/WorldCard';
import { WorldCardFeature } from '../../world-card/development/WorldCardFeature';
import { WorldCardMenu } from '../../world-card/development/WorldCardMenu';
import type { DiscoverProps, DiscoverRelease } from '../shared/discoverContracts';
import './discover.css';

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

const publicStatus = (world: HomeWorld) => world.publicationStatus ? { view: 'public' as const, value: world.publicationStatus } : undefined;

/**
 * Discover, laid out as a store front: a large title, the host's featured
 * worlds, then full-width shelves, each with one clear heading: New Chapters,
 * Fate Survival, Heavenly Rankings, Events, and Browse by Genre. Every world
 * opens through the host. Nothing here ranks or recommends on its own: New
 * Chapters is newest first and Rankings are the host's order.
 */
export function Discover({
  worlds, featuredWorldIds = [], releases, trackedWorldIds, fateSurvivalWorldIds = [], rankingBoards = [], events = [],
  onOpenWorld, notice, now,
}: DiscoverProps) {
  const ids = useId();
  const [query, setQuery] = useState('');
  const [feed, setFeed] = useState<Feed>('latest');
  const [boardId, setBoardId] = useState<string>();
  const [genre, setGenre] = useState<string>();
  const clock = now ?? new Date();
  const search = query.trim().toLowerCase();

  const worldById = useMemo(() => new Map(worlds.map(world => [world.id, world])), [worlds]);
  const tracked = useMemo(() => new Set(trackedWorldIds ?? []), [trackedWorldIds]);
  const pick = (list: readonly string[]) => list.flatMap(id => {
    const world = worldById.get(id);
    return world && worldMatches(world, search) ? [world] : [];
  });
  const feedReleases = useMemo(() => releases
    .flatMap(release => {
      const world = worldById.get(release.worldId);
      return world ? [{ release, world }] : [];
    })
    .filter(({ world }) => (feed === 'latest' || tracked.has(world.id)) && worldMatches(world, search))
    .sort((a, b) => new Date(b.release.releasedAt).getTime() - new Date(a.release.releasedAt).getTime()),
  [releases, worldById, feed, tracked, search]);

  const featured = pick(featuredWorldIds);
  const fateWorlds = pick(fateSurvivalWorldIds);
  const board = rankingBoards.find(entry => entry.id === boardId) ?? rankingBoards[0];
  const ranked = board?.worldIds ? pick(board.worldIds) : [];
  const genres = Array.from(new Set(worlds.map(world => world.genre)));
  const browseWorlds = worlds.filter(world => (!genre || world.genre === genre) && worldMatches(world, search));
  const genreCover = (name: string) => worlds.find(world => world.genre === name && world.imageUrl)?.imageUrl;

  return <div data-discover className="discover pb-12 text-signal">
    <header className="discover-header">
      <div className="discover-heading">
        <p className="discover-eyebrow">Expanded Novels</p>
        <h1 className="discover-title font-display font-bold">Discover</h1>
      </div>
      <label className="discover-search">
        <Search aria-hidden="true" size={17} />
        <span className="sr-only">Search worlds</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)}
          placeholder="Worlds, creators, tags" />
      </label>
      {notice && <div className="discover-notice">{notice}</div>}
    </header>

    {featured.length > 0 && <section aria-label="Featured" className="discover-shelf">
      <ul className="discover-rail discover-rail--featured" aria-label="Featured worlds">
        {featured.map(world => <li key={world.id}>
          <WorldCardFeature world={world} displayStatus={publicStatus(world)} onOpen={() => onOpenWorld(world.id)} />
        </li>)}
      </ul>
    </section>}

    <Shelf id={`${ids}-releases`} title="New Chapters" subtitle="Newest first. Nothing decides the order but time."
      accessory={<div role="tablist" aria-label="Feed" className="discover-segmented">
        {([['latest', 'All'], ['mine', 'My updates']] as const).map(([value, label]) =>
          <button key={value} type="button" role="tab" aria-selected={feed === value}
            onClick={() => setFeed(value)}>{label}</button>)}
      </div>}>
      {feedReleases.length === 0
        ? <FeedEmpty feed={feed} tracker={Boolean(trackedWorldIds)} searching={Boolean(search)} />
        : <ol className="discover-list" aria-label={feed === 'mine' ? 'My updates' : 'New chapters'}>
            {feedReleases.map(({ release, world }) =>
              <ReleaseRow key={release.id} release={release} world={world} age={releaseAge(release.releasedAt, clock)}
                tracked={tracked.has(world.id)} onOpen={() => onOpenWorld(world.id)} />)}
          </ol>}
    </Shelf>

    {fateWorlds.length > 0 && <section aria-labelledby={`${ids}-fate`} className="discover-fate">
      <div className="discover-fate-copy">
        <p className="discover-eyebrow discover-eyebrow--fate">Fate Survival</p>
        <h2 id={`${ids}-fate`} className="discover-fate-title font-display">Your choices write the next chapter.</h2>
        <p className="discover-fate-lede">
          Narrative experiences told chapter by chapter. Every decision carries its consequences forward,
          so the story you read is the one you shaped.
        </p>
      </div>
      <ul className="discover-rail discover-rail--cards" aria-label="Fate Survival worlds">
        {fateWorlds.map(world => <li key={world.id}>
          <WorldCard world={world} displayStatus={publicStatus(world)} onOpen={() => onOpenWorld(world.id)} />
        </li>)}
      </ul>
    </section>}

    {rankingBoards.length > 0 && <Shelf id={`${ids}-rankings`} title="Heavenly Rankings"
      subtitle={board?.description}
      accessory={<div role="tablist" aria-label="Ranking board" className="discover-segmented discover-segmented--scroll">
        {rankingBoards.map(entry => <button key={entry.id} type="button" role="tab" aria-selected={entry.id === board?.id}
          onClick={() => setBoardId(entry.id)}>{entry.label}</button>)}
      </div>}>
      {ranked.length === 0
        ? <Empty title={`${board?.label ?? 'This board'} opens soon`} description="Rankings follow what readers do and spend, not star ratings." />
        : <ol className="discover-list" aria-label={`${board?.label} ranking`}>
            {ranked.map((world, index) => <li key={world.id}>
              <WorldCardMenu world={world} rank={index + 1} onOpen={() => onOpenWorld(world.id)} />
            </li>)}
          </ol>}
    </Shelf>}

    {events.length > 0 && <Shelf id={`${ids}-events`} title="Events" subtitle="Themed weeks for creators and readers.">
      <ul className="discover-rail discover-rail--events" aria-label="Events">
        {events.map(event => <li key={event.id} className="discover-event">
          {event.imageUrl && <img src={event.imageUrl} alt="" className="discover-event-art" loading="lazy" referrerPolicy="no-referrer" />}
          <span className="discover-event-body">
            {event.when && <span className="discover-eyebrow">{event.when}</span>}
            <span className="discover-event-title font-display">{event.title}</span>
            <span className="discover-event-description">{event.description}</span>
          </span>
        </li>)}
      </ul>
    </Shelf>}

    <Shelf id={`${ids}-browse`} title="Browse by Genre">
      <ul className="discover-genres" aria-label="Genres">
        {[undefined, ...genres].map(name => {
          const cover = name ? genreCover(name) : undefined;
          return <li key={name ?? 'all'}>
            <button type="button" className="discover-genre" aria-pressed={genre === name}
              onClick={() => setGenre(name)}>
              {cover && <img src={cover} alt="" loading="lazy" referrerPolicy="no-referrer" />}
              <span>{name ?? 'All Worlds'}</span>
            </button>
          </li>;
        })}
      </ul>
      {browseWorlds.length === 0
        ? <Empty title="No worlds match" description="Try another genre or search." />
        : <ul className="discover-grid" aria-label={genre ? `${genre} worlds` : 'All worlds'}>
            {browseWorlds.map(world => <li key={world.id}>
              <WorldCard world={world} displayStatus={publicStatus(world)} onOpen={() => onOpenWorld(world.id)} />
            </li>)}
          </ul>}
    </Shelf>
  </div>;
}

/** One shelf: a heading row (title, optional control) over full-width content. */
function Shelf({ id, title, subtitle, accessory, children }: {
  id: string; title: string; subtitle?: string; accessory?: ReactNode; children: ReactNode;
}) {
  return <section aria-labelledby={id} className="discover-shelf">
    <div className="discover-shelf-head">
      <div className="min-w-0">
        <h2 id={id} className="discover-shelf-title font-display">{title}</h2>
        {subtitle && <p className="discover-shelf-subtitle">{subtitle}</p>}
      </div>
      {accessory}
    </div>
    {children}
  </section>;
}

/** Why the feed is empty, in the reader's words: no Tracker yet, a search, or no new chapters. */
function FeedEmpty({ feed, tracker, searching }: { feed: Feed; tracker: boolean; searching: boolean }) {
  if (feed === 'mine' && !tracker) return <Empty title="My updates arrives with the Tracker"
    description="When the Tracker opens, new chapters of the series you track gather here, newest first." />;
  if (searching) return <Empty title={feed === 'mine' ? 'No tracked chapters match' : 'No new chapters match'}
    description="Try another search." />;
  return feed === 'mine'
    ? <Empty title="No new chapters in your tracked series" description="Track a series and its new chapters gather here, newest first." />
    : <Empty title="No new chapters yet" description="Check back when new chapters go out." />;
}

function Empty({ title, description }: { title: string; description: string }) {
  return <LibraryPanel padding="sm">
    <SEIEmptyState icon={LibraryDiscoveryIcon} titleAs="h3" title={title} description={description} />
  </LibraryPanel>;
}

function ReleaseRow({ release, world, age, tracked, onOpen }: {
  release: DiscoverRelease; world: HomeWorld; age: string; tracked: boolean; onOpen: () => void;
}) {
  return <li>
    <WorldCardMenu world={world} onOpen={onOpen} tracked={tracked}
      chapter={{ number: release.chapterNumber, title: release.chapterTitle }}
      age={{ label: age, dateTime: release.releasedAt }} />
  </li>;
}
