import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { BookOpen, ChevronDown, Search, Sparkles, Swords, Users } from 'lucide-react';
import { LibraryPanel, LibraryDiscoveryIcon } from '@seihouse/library-ui';
import { SEIEmptyState } from '@seihouse/ui';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';
import { WorldCard } from '../../world-card/development/WorldCard';
import { WorldCardFeature } from '../../world-card/development/WorldCardFeature';
import { WorldCardMenu } from '../../world-card/development/WorldCardMenu';
import type { DiscoverCodexEntry, DiscoverCreator, DiscoverProps } from '../shared/discoverContracts';
import './discover.css';

type Feed = 'all' | 'mine';
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
  const { section, sectionHref, onSectionChange, events = [], notice } = props;
  const navigation = useRef<HTMLElement>(null);
  const previousSection = useRef(section);
  useEffect(() => {
    if (previousSection.current !== section) {
      navigation.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
      previousSection.current = section;
    }
  }, [section]);
  return (
    <div data-discover className="discover discover-hub pb-12 text-signal">
      <header className="discover-header">
        <div className="discover-heading">
          <p className="discover-eyebrow">Expanded Novels</p>
          <h1 className="discover-title font-display font-bold">Discover</h1>
        </div>
        {notice && <div className="discover-notice">{notice}</div>}
      </header>
      <nav ref={navigation} aria-label="Discover sections" className="discover-navigation">
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
      {events.length > 0 && (
        <section aria-label="Events" className="discover-events-strip">
          <div className="discover-events-label">
            <Sparkles aria-hidden="true" size={16} />
            <h2>Events</h2>
          </div>
          <ul className="discover-rail discover-rail--events" aria-label="Events">
            {events.map((event) => (
              <li key={event.id} className="discover-event">
                {event.imageUrl && (
                  <img
                    src={event.imageUrl}
                    alt=""
                    className="discover-event-art"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="discover-event-body">
                  <span className="discover-eyebrow">{event.when}</span>
                  <h3 className="discover-event-title font-display">{event.title}</h3>
                  <p className="discover-event-description">{event.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <DiscoverContent key={section} {...props} />
    </div>
  );
}

/** Filters reset on a destination change; the host's route owns the destination. */
function DiscoverContent({
  section,
  worlds,
  creators = [],
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
  const [codexKind, setCodexKind] = useState<DiscoverCodexEntry['kind']>('characters');
  const search = query.trim().toLocaleLowerCase();
  const worldById = new Map(worlds.map((world) => [world.id, world]));
  const tracked = new Set(trackedWorldIds ?? []);
  const followed = new Set(followedCreatorIds ?? []);
  const trackedEntries = new Set(trackedCodexIds ?? []);
  const worldMatches = (world: HomeWorld) =>
    (!genre || world.genre === genre) &&
    matchesText(search, world.title, world.creatorName, world.genre, ...(world.tags ?? []));
  const storyMatches = (world: HomeWorld) => worldMatches(world) && (feed === 'all' || tracked.has(world.id));
  const creatorWorlds = (creator: DiscoverCreator) =>
    creator.worldIds.flatMap((id) => (worldById.get(id) ? [worldById.get(id)!] : []));
  const creatorMatches = (creator: DiscoverCreator, updates = true) => {
    const titles = creatorWorlds(creator);
    return (
      (!genre || titles.some((world) => world.genre === genre)) &&
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
  const showFeed = !(section === 'lore' && loreArticle);
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
  // Filtering never rewrites the host's rank. Rankings remain global under My updates.
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
    <div className="discover-content" data-discover-section={section}>
      {showFeed && (
        <div className="discover-section-heading">
          <div>
            <p className="discover-eyebrow">Explore the Library</p>
            <h2 className="font-display">{sectionName}</h2>
          </div>
          {feedControl}
        </div>
      )}
      {section === 'lore' ? (
        renderLore(feed === 'mine')
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
                    ? 'Stories, creators, tags'
                    : section === 'creators'
                      ? 'Creators and their stories'
                      : 'Characters, items and their stories'
                }
              />
            </label>
            <label className="discover-genre-select">
              Genre
              <select value={genre} onChange={(event) => setGenre(event.target.value)}>
                <option value="">All genres</option>
                {genres.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          {section === 'stories' ? (
            <>
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
              {fate.length > 0 && (
                <section aria-labelledby={`${ids}-fate`} className="discover-fate">
                  <div className="discover-fate-copy">
                    <p className="discover-eyebrow discover-eyebrow--fate">Fate Survival</p>
                    <h2 id={`${ids}-fate`} className="discover-fate-title font-display">
                      Your choices write the next chapter.
                    </h2>
                    <p className="discover-fate-lede">
                      Narrative experiences told chapter by chapter. Every decision carries its consequences forward, so
                      the story you read is the one you shaped.
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
              subtitle="Meet the people behind the worlds. Open a creator to explore their stories."
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
              <div role="group" aria-label="Codex category" className="discover-codex-categories">
                {(['characters', 'items'] as const).map((kind) => (
                  <button type="button" key={kind} aria-pressed={codexKind === kind} onClick={() => setCodexKind(kind)}>
                    {kind === 'characters' ? (
                      <Users aria-hidden="true" size={18} />
                    ) : (
                      <Swords aria-hidden="true" size={18} />
                    )}
                    <span>{kind === 'characters' ? 'Characters' : 'Items'}</span>
                    <span className="discover-category-count">
                      {codexEntries.filter((entry) => entry.kind === kind && entryMatches(entry)).length}
                    </span>
                  </button>
                ))}
              </div>
              <Shelf
                id={`${ids}-codex`}
                title={codexKind === 'characters' ? 'Characters' : 'Items'}
                subtitle="Every entry belongs to a story. Open one to see its place in that world."
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
          <Shelf
            id={`${ids}-rankings`}
            title="Heavenly Rankings"
            subtitle={board?.description ?? `${sectionName} rankings are coming soon.`}
            accessory={
              <span className="discover-ranking-kind">
                {board?.label ??
                  (section === 'codex' ? (codexKind === 'characters' ? 'Characters' : 'Items') : sectionName)}
              </span>
            }
          >
            {ranked.length ? (
              <ol
                className={section === 'stories' ? 'discover-list' : 'discover-directory-grid'}
                aria-label={`${board?.label} ranking`}
              >
                {ranked.map(({ id, node }) => (
                  <li key={id}>{node}</li>
                ))}
              </ol>
            ) : (
              <Empty
                title={genre || search ? 'No rankings match' : `${board?.label ?? sectionName} rankings open soon`}
                description="Rankings follow what readers do and spend, not star ratings."
              />
            )}
          </Shelf>
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
  accessory,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  accessory?: ReactNode;
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
        {accessory}
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
