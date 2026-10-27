import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  BookOpen,
  ChevronDown,
  Film,
  Gamepad2,
  LayoutGrid,
  PanelsTopLeft,
  Search,
  Shapes,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { LibraryPanel, LibraryDiscoveryIcon } from '@seihouse/library-ui';
import { SEIEmptyState } from '@seihouse/ui';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';
import { WorldCard } from '../../world-card/development/WorldCard';
import { WorldCardFeature } from '../../world-card/development/WorldCardFeature';
import { WorldCardMenu } from '../../world-card/development/WorldCardMenu';
import type { DiscoverCodexEntry, DiscoverCreator, DiscoverProps } from '../shared/discoverContracts';
import './discover.css';

type Feed = 'all' | 'mine';
type BrowseView = 'browse' | 'genres' | 'rankings';
const MEDIUMS = [
  { id: 'novel', label: 'Novel', icon: BookOpen },
  { id: 'manga', label: 'Manga', icon: PanelsTopLeft },
  { id: 'game', label: 'Game', icon: Gamepad2 },
  { id: 'video', label: 'Video', icon: Film },
] as const;
const SECTIONS = [
  { id: 'stories', label: 'Stories', icon: BookOpen },
  { id: 'creators', label: 'Creators', icon: Users },
  { id: 'codex', label: 'Codex', icon: Swords },
  { id: 'lore', label: 'Lore', icon: Sparkles },
] as const;

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

const publicStatus = (world: HomeWorld) =>
  world.publicationStatus ? { view: 'public' as const, value: world.publicationStatus } : undefined;
const matchesText = (query: string, ...values: (string | undefined)[]) =>
  !query || values.some((value) => value?.toLocaleLowerCase().includes(query));

/** One Discover shell. Destinations and catalogue truth stay with the host. */
export function Discover(props: DiscoverProps) {
  const { section, sectionHref, onSectionChange, medium, onMediumChange, notice, loreArticle } = props;
  const surface = useRef<HTMLDivElement>(null);
  const previousSection = useRef(section);
  const previousArticle = useRef(loreArticle);
  const previousMedium = useRef(medium);
  useEffect(() => {
    // Scroll the surface, not the sticky navigation's current on-screen position.
    if (
      previousSection.current !== section ||
      previousMedium.current !== medium ||
      (previousArticle.current && !loreArticle)
    ) {
      surface.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
    }
    previousSection.current = section;
    previousArticle.current = loreArticle;
    previousMedium.current = medium;
  }, [section, loreArticle, medium]);
  return (
    <div ref={surface} data-discover className="discover discover-hub pb-12 text-signal">
      <header className="discover-header">
        <h1 className="discover-title font-display font-bold">Discover</h1>
        {notice && <div className="discover-notice">{notice}</div>}
      </header>
      <div role="group" aria-label="Medium" className="discover-medium-switcher">
        {MEDIUMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={medium === id}
            onClick={() => {
              if (medium !== id) onMediumChange(id);
            }}
          >
            <Icon aria-hidden="true" size={18} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <nav aria-label="Discover sections" className="discover-navigation">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={sectionHref(id)}
            aria-current={section === id ? 'page' : undefined}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              onSectionChange(id);
            }}
          >
            <Icon aria-hidden="true" size={18} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <DiscoverContent key={section === 'lore' ? section : `${section}:${medium}`} {...props} />
    </div>
  );
}

/** Filters reset on a destination change; the host's route owns the destination. */
function DiscoverContent({
  section,
  medium,
  worlds: allWorlds,
  creators: allCreators = [],
  codexEntries = [],
  releases,
  trackedWorldIds,
  followedCreatorIds,
  trackedCodexIds,
  featuredWorldIds = [],
  fateSurvivalWorldIds = [],
  rankingBoards = [],
  onOpenWorld,
  renderLore,
  loreArticle,
  now,
}: DiscoverProps) {
  const ids = useId();
  const [feed, setFeed] = useState<Feed>('all');
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [view, setView] = useState<BrowseView>('browse');
  const [codexKind, setCodexKind] = useState<DiscoverCodexEntry['kind']>('characters');
  const contentTop = useRef<HTMLDivElement>(null);
  const selectView = (next: BrowseView, kind?: DiscoverCodexEntry['kind']) => {
    setView(next);
    if (kind) setCodexKind(kind);
    contentTop.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  };
  const search = query.trim().toLocaleLowerCase();
  const mediumLabel = MEDIUMS.find((option) => option.id === medium)!.label;
  const worlds = allWorlds.filter((world) => world.format?.trim().toLowerCase() === medium);
  const worldById = new Map(worlds.map((world) => [world.id, world]));
  const creators = allCreators.filter((creator) => creator.worldIds.some((id) => worldById.has(id)));
  const tracked = new Set(trackedWorldIds ?? []);
  const followed = new Set(followedCreatorIds ?? []);
  const trackedEntries = new Set(trackedCodexIds ?? []);
  const worldMatches = (world: HomeWorld, genreFilter = genre) =>
    (!genreFilter || world.genre === genreFilter) &&
    matchesText(search, world.title, world.creatorName, world.genre, ...(world.tags ?? []));
  const storyMatches = (world: HomeWorld) => worldMatches(world) && (feed === 'all' || tracked.has(world.id));
  const creatorWorlds = (creator: DiscoverCreator) =>
    creator.worldIds.flatMap((id) => (worldById.get(id) ? [worldById.get(id)!] : []));
  const creatorMatches = (creator: DiscoverCreator, updates = true, genreFilter = genre) => {
    const titles = creatorWorlds(creator);
    return (
      (!genreFilter || titles.some((world) => world.genre === genreFilter)) &&
      matchesText(
        search,
        creator.name,
        creator.description,
        ...titles.flatMap((world) => [world.title, world.genre, ...(world.tags ?? [])]),
      ) &&
      (!updates || feed === 'all' || followed.has(creator.id))
    );
  };
  const entryMatches = (entry: DiscoverCodexEntry, updates = true) => {
    const world = worldById.get(entry.worldId);
    return Boolean(
      world &&
      (!genre || world.genre === genre) &&
      matchesText(search, entry.name, entry.description, world.title, world.genre, world.creatorName) &&
      (!updates || feed === 'all' || trackedEntries.has(entry.id)),
    );
  };
  const pick = (list: readonly string[]) =>
    list.flatMap((id) => {
      const world = worldById.get(id);
      return world && storyMatches(world) ? [world] : [];
    });
  const catalogue = worlds.filter(storyMatches);
  const people = creators.filter((creator) => creatorMatches(creator));
  const entries = codexEntries.filter((entry) => entry.kind === codexKind && entryMatches(entry));
  const featured = pick(featuredWorldIds);
  const fate = pick(fateSurvivalWorldIds);
  const feedReleases = releases
    .flatMap((release) => {
      const world = worldById.get(release.worldId);
      return world && storyMatches(world) ? [{ release, world }] : [];
    })
    .sort((a, b) => new Date(b.release.releasedAt).getTime() - new Date(a.release.releasedAt).getTime());
  const genres = Array.from(new Set(worlds.map((world) => world.genre))).sort();
  // Genre browsing uses the current search/follows, independent of the selected genre.
  const genreChoices = genres
    .map((value) => {
      const genreWorlds = worlds.filter((world) => world.genre === value);
      const count =
        section === 'creators'
          ? creators.filter((creator) => creatorMatches(creator, true, value)).length
          : genreWorlds.filter((world) => worldMatches(world, '') && (feed === 'all' || tracked.has(world.id))).length;
      return { value, count, cover: genreWorlds.find((world) => world.imageUrl)?.imageUrl };
    })
    .filter((choice) => choice.count > 0);
  const sectionName = SECTIONS.find((item) => item.id === section)!.label;
  const trackingAvailable =
    section === 'stories'
      ? trackedWorldIds !== undefined
      : section === 'creators'
        ? followedCreatorIds !== undefined
        : trackedCodexIds !== undefined;
  const emptyTitle =
    feed === 'mine' && !trackingAvailable
      ? `${sectionName} updates are not available yet`
      : `No ${section === 'codex' ? codexKind : section} match`;
  const emptyDescription =
    feed === 'mine' && !trackingAvailable
      ? 'Updates will appear here when following is available.'
      : feed === 'mine' && !search && !genre
        ? `Updates from the ${section === 'codex' ? codexKind : section} you follow will gather here.`
        : 'Try another search, genre, or switch to All.';
  const boardKind = section === 'codex' ? codexKind : section;
  const board = rankingBoards.find((value) => value.kind === boardKind);
  const showFeed = !(section === 'lore' && loreArticle) && view !== 'rankings';
  const feedControl = (
    <div role="group" aria-label={`${sectionName} feed`} className="discover-segmented">
      {(
        [
          ['all', 'All'],
          ['mine', 'My updates'],
        ] as const
      ).map(([value, label]) => (
        <button key={value} type="button" aria-pressed={feed === value} onClick={() => setFeed(value)}>
          {label}
        </button>
      ))}
    </div>
  );
  const creatorCard = (creator: DiscoverCreator, rank?: number) => (
    <CreatorEntry creator={creator} worlds={creatorWorlds(creator)} rank={rank} onOpenWorld={onOpenWorld} />
  );
  const codexCard = (entry: DiscoverCodexEntry, rank?: number) => (
    <CodexEntry entry={entry} world={worldById.get(entry.worldId)!} rank={rank} onOpenWorld={onOpenWorld} />
  );
  // Filtering never rewrites the host's rank. Rankings are independent of the personal feed.
  const ranked =
    boardKind === 'stories'
      ? (board?.worldIds ?? []).flatMap((id, index) => {
          const world = worldById.get(id);
          return world && worldMatches(world)
            ? [{ id, node: <WorldCardMenu world={world} rank={index + 1} onOpen={() => onOpenWorld(world.id)} /> }]
            : [];
        })
      : boardKind === 'creators'
        ? (board?.creatorIds ?? []).flatMap((id, index) => {
            const creator = creators.find((value) => value.id === id);
            return creator && creatorMatches(creator, false) ? [{ id, node: creatorCard(creator, index + 1) }] : [];
          })
        : (board?.entryIds ?? []).flatMap((id, index) => {
            const entry = codexEntries.find((value) => value.id === id && value.kind === codexKind);
            return entry && entryMatches(entry, false) ? [{ id, node: codexCard(entry, index + 1) }] : [];
          });

  return (
    <div ref={contentTop} className="discover-content" data-discover-section={section}>
      {section === 'lore' ? (
        <>
          <p className="discover-medium-note">Lore is shared across all mediums.</p>
          {showFeed && <div className="discover-feed-row">{feedControl}</div>}
          {renderLore(feed === 'mine')}
        </>
      ) : (
        <>
          <div className="discover-filter-bar">
            <label className="discover-search">
              <Search aria-hidden="true" size={18} />
              <span className="sr-only">Search {sectionName.toLowerCase()}</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  section === 'stories'
                    ? 'Search stories, tags'
                    : section === 'creators'
                      ? 'Search creators'
                      : 'Search Codex'
                }
              />
            </label>
            <label className="discover-genre-select">
              <span className="sr-only">Genre</span>
              <select value={genre} onChange={(event) => setGenre(event.target.value)}>
                <option value="">All genres</option>
                {genres.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="discover-browser">
            <div role="group" aria-label={`${sectionName} views`} className="discover-view-rail">
              {section === 'codex' ? (
                (['characters', 'items'] as const).map((kind) => {
                  const Icon = kind === 'characters' ? Users : Swords;
                  return (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={view === 'browse' && codexKind === kind}
                      aria-controls={`${ids}-results`}
                      onClick={() => selectView('browse', kind)}
                    >
                      <Icon aria-hidden="true" size={21} />
                      <span>{kind === 'characters' ? 'Characters' : 'Items'}</span>
                    </button>
                  );
                })
              ) : (
                <>
                  <button
                    type="button"
                    aria-pressed={view === 'browse'}
                    aria-controls={`${ids}-results`}
                    onClick={() => selectView('browse')}
                  >
                    <LayoutGrid aria-hidden="true" size={21} />
                    <span>Browse</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={view === 'genres'}
                    aria-controls={`${ids}-results`}
                    onClick={() => selectView('genres')}
                  >
                    <Shapes aria-hidden="true" size={21} />
                    <span>Genres</span>
                  </button>
                </>
              )}
              <button
                type="button"
                aria-pressed={view === 'rankings'}
                aria-controls={`${ids}-results`}
                onClick={() => selectView('rankings')}
              >
                <Trophy aria-hidden="true" size={21} />
                <span>Rankings</span>
              </button>
            </div>
            <div id={`${ids}-results`} className="discover-main">
              {showFeed && <div className="discover-feed-row">{feedControl}</div>}
              {worlds.length === 0 && medium !== 'novel' ? (
                <Shelf
                  id={`${ids}-upcoming`}
                  title={
                    view === 'rankings'
                      ? 'Heavenly Rankings'
                      : view === 'genres'
                        ? 'Explore genres'
                        : section === 'codex'
                          ? codexKind === 'characters'
                            ? 'Characters'
                            : 'Items'
                          : sectionName
                  }
                >
                  <Empty
                    title={`${mediumLabel} catalogue coming soon`}
                    description={`There are no ${mediumLabel.toLowerCase()} stories, creators or Codex entries to browse yet. Choose Novel to explore the current catalogue.`}
                  />
                </Shelf>
              ) : view === 'genres' ? (
                <Shelf
                  id={`${ids}-genres`}
                  title="Explore genres"
                  subtitle={`Browse ${sectionName.toLowerCase()} by genre.`}
                >
                  <ul className="discover-genre-grid" aria-label={`${sectionName} genres`}>
                    <li>
                      <button
                        type="button"
                        aria-pressed={!genre}
                        onClick={() => {
                          setGenre('');
                          selectView('browse');
                        }}
                      >
                        <span className="discover-genre-art">
                          <LayoutGrid aria-hidden="true" size={24} />
                        </span>
                        <span className="discover-genre-name">All genres</span>
                      </button>
                    </li>
                    {genreChoices.map(({ value, count, cover }) => (
                      <li key={value}>
                        <button
                          type="button"
                          aria-pressed={genre === value}
                          onClick={() => {
                            setGenre(value);
                            selectView('browse');
                          }}
                        >
                          <span className="discover-genre-art">
                            {cover ? (
                              <img src={cover} alt="" loading="lazy" />
                            ) : (
                              <BookOpen aria-hidden="true" size={24} />
                            )}
                          </span>
                          <span className="discover-genre-name">
                            {value}
                            <span>
                              {count}{' '}
                              {section === 'stories'
                                ? count === 1
                                  ? 'story'
                                  : 'stories'
                                : count === 1
                                  ? 'creator'
                                  : 'creators'}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {genreChoices.length === 0 && <Empty title={emptyTitle} description={emptyDescription} />}
                </Shelf>
              ) : view === 'rankings' ? (
                <>
                  {section === 'codex' && (
                    <div role="group" aria-label="Ranked Codex category" className="discover-segmented">
                      {(['characters', 'items'] as const).map((kind) => (
                        <button
                          type="button"
                          key={kind}
                          aria-pressed={codexKind === kind}
                          onClick={() => setCodexKind(kind)}
                        >
                          {kind === 'characters' ? 'Characters' : 'Items'}
                        </button>
                      ))}
                    </div>
                  )}
                  <Shelf
                    id={`${ids}-rankings`}
                    title="Heavenly Rankings"
                    subtitle={board?.description ?? `${sectionName} rankings are coming soon.`}
                  >
                    <p className="discover-ranking-kind">{board?.label ?? sectionName} · Overall ranking</p>
                    {ranked.length ? (
                      <ol
                        className={section === 'stories' ? 'discover-ranking-list' : 'discover-directory-grid'}
                        aria-label={`${board?.label} ranking`}
                      >
                        {ranked.map(({ id, node }) => (
                          <li key={id}>{node}</li>
                        ))}
                      </ol>
                    ) : (
                      <Empty
                        title={
                          genre || search ? 'No rankings match' : `${board?.label ?? sectionName} rankings open soon`
                        }
                        description="Rankings follow what readers do and spend, not star ratings."
                      />
                    )}
                  </Shelf>
                </>
              ) : section === 'stories' ? (
                <>
                  <Shelf
                    id={`${ids}-stories`}
                    title={feed === 'all' ? 'All stories' : 'My stories'}
                    subtitle={`${catalogue.length} ${catalogue.length === 1 ? 'story' : 'stories'}${genre ? ` · ${genre}` : ''}`}
                  >
                    {catalogue.length ? (
                      <ul className="discover-grid" aria-label="Stories">
                        {catalogue.map((world) => (
                          <li key={world.id}>
                            <WorldCard
                              world={world}
                              displayStatus={publicStatus(world)}
                              onOpen={() => onOpenWorld(world.id)}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Empty title={emptyTitle} description={emptyDescription} />
                    )}
                  </Shelf>
                  <Shelf
                    id={`${ids}-releases`}
                    title="New Chapters"
                    subtitle="Newest first. Nothing decides the order but time."
                  >
                    {feedReleases.length ? (
                      <ol className="discover-list" aria-label={feed === 'mine' ? 'My updates' : 'New chapters'}>
                        {feedReleases.map(({ release, world }) => (
                          <li key={release.id}>
                            <WorldCardMenu
                              world={world}
                              onOpen={() => onOpenWorld(world.id)}
                              tracked={tracked.has(world.id)}
                              chapter={{ number: release.chapterNumber, title: release.chapterTitle }}
                              age={{
                                label: releaseAge(release.releasedAt, now ?? new Date()),
                                dateTime: release.releasedAt,
                              }}
                            />
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <Empty
                        title={
                          feed === 'mine' && !trackingAvailable
                            ? 'My updates arrives with the Tracker'
                            : search || genre
                              ? feed === 'mine'
                                ? 'No tracked chapters match'
                                : 'No new chapters match'
                              : 'No new chapters yet'
                        }
                        description="New chapters appear here as the stories in this view update."
                      />
                    )}
                  </Shelf>
                  {featured.length > 0 && (
                    <section aria-label="Featured" className="discover-shelf">
                      <ul className="discover-rail discover-rail--featured" aria-label="Featured worlds">
                        {featured.map((world) => (
                          <li key={world.id}>
                            <WorldCardFeature
                              world={world}
                              displayStatus={publicStatus(world)}
                              onOpen={() => onOpenWorld(world.id)}
                            />
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {fate.length > 0 && (
                    <section aria-labelledby={`${ids}-fate`} className="discover-fate">
                      <div className="discover-fate-copy">
                        <p className="discover-eyebrow discover-eyebrow--fate">Fate Survival</p>
                        <h2 id={`${ids}-fate`} className="discover-fate-title font-display">
                          Your choices write the next chapter.
                        </h2>
                        <p className="discover-fate-lede">
                          Narrative experiences told chapter by chapter. Every decision carries its consequences
                          forward, so the story you read is the one you shaped.
                        </p>
                      </div>
                      <ul className="discover-rail discover-rail--cards" aria-label="Fate Survival worlds">
                        {fate.map((world) => (
                          <li key={world.id}>
                            <WorldCard
                              world={world}
                              displayStatus={publicStatus(world)}
                              onOpen={() => onOpenWorld(world.id)}
                            />
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              ) : section === 'creators' ? (
                <Shelf
                  id={`${ids}-creators`}
                  title={feed === 'all' ? 'All creators' : 'My creators'}
                  subtitle={`${people.length} ${people.length === 1 ? 'creator' : 'creators'}${genre ? ` · ${genre}` : ''}`}
                >
                  {people.length ? (
                    <ul className="discover-directory-grid" aria-label="Creators">
                      {people.map((creator) => (
                        <li key={creator.id}>{creatorCard(creator)}</li>
                      ))}
                    </ul>
                  ) : (
                    <Empty title={emptyTitle} description={emptyDescription} />
                  )}
                </Shelf>
              ) : (
                <>
                  <Shelf
                    id={`${ids}-codex`}
                    title={codexKind === 'characters' ? 'Characters' : 'Items'}
                    subtitle={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}${genre ? ` · ${genre}` : ''}`}
                  >
                    {entries.length ? (
                      <ul className="discover-directory-grid" aria-label={`Codex ${codexKind}`}>
                        {entries.map((entry) => (
                          <li key={entry.id}>{codexCard(entry)}</li>
                        ))}
                      </ul>
                    ) : (
                      <Empty title={emptyTitle} description={emptyDescription} />
                    )}
                  </Shelf>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CreatorEntry({
  creator,
  worlds,
  rank,
  onOpenWorld,
}: {
  creator: DiscoverCreator;
  worlds: HomeWorld[];
  rank?: number;
  onOpenWorld: (id: string) => void;
}) {
  return (
    <LibraryPanel padding="sm">
      <details className="discover-directory-entry">
        <summary>
          <span className="discover-creator-monogram" aria-hidden="true">
            {creator.name.slice(0, 1)}
          </span>
          <span className="discover-entry-heading">
            {rank && <span className="discover-eyebrow">#{rank}</span>}
            <span className="discover-entry-title font-display">{creator.name}</span>
            <span className="discover-entry-meta">
              {worlds.length} {worlds.length === 1 ? 'story' : 'stories'} ·{' '}
              {Array.from(new Set(worlds.map((world) => world.genre))).join(' / ')}
            </span>
          </span>
          <ChevronDown aria-hidden="true" size={18} />
        </summary>
        <div className="discover-entry-details">
          <p>{creator.description}</p>
          <ul aria-label={`${creator.name} stories`}>
            {worlds.map((world) => (
              <li key={world.id}>
                <WorldCardMenu world={world} onOpen={() => onOpenWorld(world.id)} />
              </li>
            ))}
          </ul>
        </div>
      </details>
    </LibraryPanel>
  );
}

function CodexEntry({
  entry,
  world,
  rank,
  onOpenWorld,
}: {
  entry: DiscoverCodexEntry;
  world: HomeWorld;
  rank?: number;
  onOpenWorld: (id: string) => void;
}) {
  return (
    <LibraryPanel padding="sm">
      <details className="discover-directory-entry">
        <summary>
          {entry.imageUrl ? (
            <img className="discover-entry-portrait" src={entry.imageUrl} alt="" loading="lazy" />
          ) : (
            <span className="discover-creator-monogram" aria-hidden="true">
              <Swords size={24} />
            </span>
          )}
          <span className="discover-entry-heading">
            {rank && <span className="discover-eyebrow">#{rank}</span>}
            <span className="discover-entry-title font-display">{entry.name}</span>
            <span className="discover-entry-meta">{world.title}</span>
            <span className="discover-entry-genre">{world.genre}</span>
          </span>
          <ChevronDown aria-hidden="true" size={18} />
        </summary>
        <div className="discover-entry-details">
          <p>{entry.description}</p>
          <WorldCardMenu world={world} onOpen={() => onOpenWorld(world.id)} />
        </div>
      </details>
    </LibraryPanel>
  );
}

function Shelf({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="discover-shelf">
      <div className="discover-shelf-head">
        <div className="min-w-0">
          <h2 id={id} className="discover-shelf-title font-display">
            {title}
          </h2>
          {subtitle && <p className="discover-shelf-subtitle">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Empty({ title, description }: { title: string; description: string }) {
  return (
    <LibraryPanel padding="sm">
      <SEIEmptyState icon={LibraryDiscoveryIcon} titleAs="h3" title={title} description={description} />
    </LibraryPanel>
  );
}
