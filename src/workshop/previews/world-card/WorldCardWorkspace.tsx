import { useState, type ReactNode } from 'react';
import { useLibraryAssets } from '@seihouse/library/presentation';
import { WorldCard, WorldCardFeature, languageName } from '@seihouse/library/world-card';
import type { WorldCardDisplayStatus } from '@seihouse/library/world-card';
import type { CreatorWorld } from '@seihouse/library/creator-space';
import { WorldCardFullReference } from '../../../components/world-card/reference/WorldCardFull';
import { WorldCardCompactReference } from '../../../components/world-card/reference/WorldCardCompact';
import { StoryDetailScreen as ReferenceStoryDetail } from '../../../components/light-novels-home/reference/StoryDetailScreen';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { featuredExpansions } from '../light-novels-home/previewData';
import {
  previewCreatorWorlds, previewHomeGrid, previewStory,
  type WorldCardBlueprintPreview, type WorldCardCover, type WorldCardSashPreview, type WorldCardDestinations, type WorldCardPreviewState,
  type WorldCardReadingPreview, type WorldCardRecentlyRead, type WorldCardStatusPreview, type WorldCardTitleLength,
} from './previewData';
import { StoryDetailScreen, type WorldActivityStatus } from '@seihouse/library/home';
import { StoryBlueprintView, type StoryBlueprintAccess } from '@seihouse/library/stories';
import { createFilledStorySeedInput, createMockBlueprint } from '../story-seed/previewData';

const entry = workshopEntries.find(candidate => candidate.id === 'world-card')!;

const VIEWS = {
  all: { label: 'All views', description: 'The Info page, Feature card, Full card, Home grid and Compact card together.' },
  feature: { label: 'Feature card', description: 'The wide banner for a spotlighted world, at the stage’s full width.' },
  info: { label: 'Info page', description: 'The full world overview a reader lands on when they open a world.' },
  full: { label: 'World Card', description: 'The 2:3 discovery card at its Home grid width, with the title and details beneath.' },
  grid: { label: 'Home grid', description: 'Several World Cards side by side, as Home lays them out.' },
  compact: { label: 'Compact', description: 'Create’s square “Your worlds” tile. Tap a tile to open that world’s Info page.' },
} as const;
type View = keyof typeof VIEWS;

const VIEWPORTS = {
  current: { label: 'Current browser', width: 0, height: 0 },
  small: { label: 'Small phone', width: 320, height: 700 },
  mobile: { label: 'Phone', width: 390, height: 844 },
  tablet: { label: 'Tablet', width: 768, height: 1024 },
  desktop: { label: 'Desktop', width: 1280, height: 900 },
} as const;
type Viewport = keyof typeof VIEWPORTS;

const DEFAULT_STATE: WorldCardPreviewState = {
  recentlyRead: 'no', titleLength: 'standard', cover: 'art', sash: 'hidden',
  activity: 'active-this-week', cardStatus: 'public-ongoing', destinations: 'all', reading: 'chapter-7', blueprint: 'creator',
};

const BLUEPRINT_ACCESS: Record<Exclude<WorldCardBlueprintPreview, 'reader-off'>, StoryBlueprintAccess> = {
  creator: { view: 'creator' },
  'creator-shared': { view: 'creator' },
  'reader-copy': { view: 'reader', creatorName: 'SENSEI', copy: true },
  'reader-view': { view: 'reader', creatorName: 'SENSEI', copy: false },
};

const CARD_STATUS_PREVIEW: Record<WorldCardStatusPreview, WorldCardDisplayStatus> = {
  'public-ongoing': { view: 'public', value: 'ongoing' },
  'public-completed': { view: 'public', value: 'completed' },
  'library-draft': { view: 'library', value: 'draft' },
  'library-shared': { view: 'library', value: 'shared' },
  'library-public': { view: 'library', value: 'public' },
  'library-complete': { view: 'library', value: 'complete' },
};

/** Stable pick of the Library's own art for a world with no cover yet (matches Create). */
function fallbackCover(id: string, images: readonly string[]) {
  if (!images.length) return undefined;
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return images[hash % images.length];
}

function Stage({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return <section className="space-y-3" aria-label={title}>
    <header>
      <h2 className="font-sc text-xs font-bold uppercase tracking-widest text-portal">{title}</h2>
      {note && <p className="mt-1 font-sans text-xs text-neutral-400">{note}</p>}
    </header>
    {children}
  </section>;
}

function CompactRow({ worlds, reference, senSash, onOpen }: { worlds: readonly CreatorWorld[]; reference: boolean; senSash: boolean; onOpen: (world: CreatorWorld) => void }) {
  const { homeImages = [] } = useLibraryAssets();
  const [selectedId, setSelectedId] = useState(worlds[0]?.id);
  return <ul className="flex gap-3 overflow-x-auto pb-4" aria-label="Your worlds">
    {worlds.slice(0, 3).map(world => <li key={world.id} className="w-[min(46%,13.5rem)] flex-none sm:w-[13.5rem]">
      {reference
        ? <WorldCardCompactReference world={world} cover={world.imageUrl ?? fallbackCover(world.id, homeImages)} fallbackCover={!world.imageUrl}
            selected={world.id === selectedId} onSelect={() => setSelectedId(world.id)} />
        : <WorldCard face="compact" senSash={senSash} world={world} cover={world.imageUrl ?? fallbackCover(world.id, homeImages)} fallbackCover={!world.imageUrl}
            selected={world.id === selectedId} onOpen={() => { setSelectedId(world.id); const cover = world.imageUrl ?? fallbackCover(world.id, homeImages); onOpen(cover ? { ...world, imageUrl: cover } : world); }} />}
    </li>)}
  </ul>;
}

export function WorldCardStage({ view, state, reference, onAction }: {
  view: View; state: WorldCardPreviewState; reference: boolean; onAction: (message: string) => void;
}) {
  const story = previewStory(state);
  const worlds = previewCreatorWorlds(state);
  const [openedWorld, setOpenedWorld] = useState<CreatorWorld | typeof story | null>(null);
  const [blueprintOpen, setBlueprintOpen] = useState(false);
  // The Workshop's sample Seed and Blueprint stand in for the world's own.
  const [blueprintSnapshot] = useState(() => ({ seed: createFilledStorySeedInput(), blueprint: createMockBlueprint() }));
  const infoWorld = openedWorld?.id === story.id ? story : openedWorld ?? story;
  const show = (candidate: View) => view === 'all' || view === candidate;

  if (blueprintOpen && !reference && state.blueprint !== 'reader-off') return <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8" data-world-card-stage="development">
    <StoryBlueprintView title={infoWorld.title} snapshot={blueprintSnapshot} destinedEnding="Ye Chen restores the last lotus and ends the empire's oath."
      access={BLUEPRINT_ACCESS[state.blueprint]} isPrivate={state.blueprint !== 'creator-shared'}
      onBack={() => setBlueprintOpen(false)}
      onSave={async () => onAction(`Blueprint saved for ${infoWorld.title}`)}
      onCopy={async () => onAction(`Blueprint copied from ${infoWorld.title} to your Story Seeds`)} />
  </div>;

  return <div className="mx-auto max-w-5xl space-y-12 px-4 py-6 sm:px-8" data-world-card-stage={reference ? 'reference' : 'development'}>
    {(openedWorld || show('info')) && <Stage title="Info page">
      {reference
        ? <ReferenceStoryDetail story={story} onBack={() => onAction('Back to novels')} />
        : <StoryDetailScreen story={infoWorld}
            backLabel={openedWorld ? 'Back to cards' : 'Back to novels'}
            onBack={openedWorld ? () => setOpenedWorld(null) : () => onAction('Back to novels')}
            readingPosition={state.reading === 'chapter-7' ? { chapterNumber: 7 } : undefined}
            onRead={state.destinations === 'none' ? undefined : () => onAction(`${state.reading === 'chapter-7' ? 'Continue' : 'Start'} reading ${infoWorld.title}`)}
            onStart={state.destinations === 'none' ? undefined : () => onAction(`Start story ${infoWorld.title}`)}
            onOpenCodex={state.destinations === 'all' ? () => onAction(`Open Codex for ${infoWorld.title}`) : undefined}
            // A reader of a creator with sharing off gets no Blueprint button at all.
            onOpenBlueprint={state.destinations === 'all' && state.blueprint !== 'reader-off' ? () => setBlueprintOpen(true) : undefined}
            readingLanguage={{ onChange: language => onAction(`Read ${infoWorld.title} in ${languageName(language)}`) }}
            // The Portal: the sample novel's manga and game, or the novel alone with every destination off.
            portal={{ expansions: state.destinations === 'all' ? featuredExpansions : [] }}
            />}
    </Stage>}
    {!openedWorld && !reference && show('feature') && <Stage title="Feature card" note="Home's spotlight row. The cover stands on the right; the band is that cover, blurred, in its own color.">
      <WorldCardFeature world={story} senSash={state.sash === 'shown'} displayStatus={CARD_STATUS_PREVIEW[state.cardStatus]} onOpen={() => setOpenedWorld(story)} />
    </Stage>}
    {!openedWorld && show('full') && <Stage title="World Card" note="Home grid width.">
      <div className="w-[min(100%,13rem)]">
        {reference
          ? <WorldCardFullReference world={story} onOpen={() => onAction(`Open ${story.title}`)} />
          : <WorldCard world={story} senSash={state.sash === 'shown'} displayStatus={CARD_STATUS_PREVIEW[state.cardStatus]}
              onOpen={() => setOpenedWorld(story)} />}
      </div>
    </Stage>}
    {!openedWorld && !reference && show('grid') && <Stage title="Home grid" note="Two across on a phone, more on wider screens.">
      <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5">
        {previewHomeGrid(state).map(world => <WorldCard key={world.id} world={world} senSash={state.sash === 'shown'}
          displayStatus={CARD_STATUS_PREVIEW[state.cardStatus]} onOpen={() => world.id === story.id ? setOpenedWorld(story) : onAction(`Open ${world.title}`)} />)}
      </div>
    </Stage>}
    {!openedWorld && show('compact') && <Stage title="Compact" note="Create · Your worlds.">
      <CompactRow key={`${reference}-${state.titleLength}-${state.cover}`} worlds={worlds} reference={reference} senSash={state.sash === 'shown'} onOpen={setOpenedWorld} />
    </Stage>}
  </div>;
}

const selectClass = 'min-h-11 rounded-lg border border-white/20 bg-black/30 p-2 text-sm text-white';

function canvasUrl(view: View, state: WorldCardPreviewState, reference: boolean) {
  const params = new URLSearchParams({ preview: 'world-card', canvas: '1', view,
    reference: reference ? '1' : '0', ...state });
  return `/?${params.toString()}`;
}

function readCanvasState(params: URLSearchParams): WorldCardPreviewState {
  const pick = <T extends string>(value: string | null, options: readonly T[], fallback: T): T =>
    options.includes(value as T) ? value as T : fallback;
  return {
    recentlyRead: pick(params.get('recentlyRead'), ['no', 'yes'], DEFAULT_STATE.recentlyRead),
    titleLength: pick(params.get('titleLength'), ['standard', 'long'], DEFAULT_STATE.titleLength),
    cover: pick(params.get('cover'), ['art', 'missing'], DEFAULT_STATE.cover),
    sash: pick(params.get('sash'), ['hidden', 'shown'], DEFAULT_STATE.sash),
    activity: pick(params.get('activity'), ['active-now', 'active-this-week', 'quiet', 'hidden'], DEFAULT_STATE.activity),
    cardStatus: pick(params.get('cardStatus'), Object.keys(CARD_STATUS_PREVIEW) as WorldCardStatusPreview[], DEFAULT_STATE.cardStatus),
    destinations: pick(params.get('destinations'), ['all', 'reading-only', 'none'], DEFAULT_STATE.destinations),
    reading: pick(params.get('reading'), ['start', 'chapter-7', 'new-story'], DEFAULT_STATE.reading),
    blueprint: pick(params.get('blueprint'), ['creator', 'creator-shared', 'reader-copy', 'reader-view', 'reader-off'], DEFAULT_STATE.blueprint),
  };
}

/** The same Workshop stage inside a real-width document for viewport checks. */
function WorldCardCanvas() {
  const params = new URLSearchParams(window.location.search);
  const view = pickView(params.get('view'));
  const [action, setAction] = useState('');
  return <div className="min-h-screen bg-[#04060d] text-slate-300">
    <WorldCardStage view={view} state={readCanvasState(params)} reference={params.get('reference') === '1'}
      onAction={message => setAction(`${message} · mock preview`)} />
    <p className="px-4 pb-6 font-sans text-xs text-neutral-400 sm:px-8" role="status">{action}</p>
  </div>;
}

function pickView(value: string | null): View {
  return value && Object.hasOwn(VIEWS, value) ? value as View : 'all';
}

/** The Info page, Full card, and Compact face in one Workshop. */
function WorldCardWorkspaceShell() {
  const [view, setView] = useState<View>('all');
  const [viewport, setViewport] = useState<Viewport>('current');
  const [state, setState] = useState<WorldCardPreviewState>(DEFAULT_STATE);
  const [action, setAction] = useState('');
  const update = (patch: Partial<WorldCardPreviewState>) => setState(current => ({ ...current, ...patch }));

  const render = (reference: boolean) => {
    if (viewport !== 'current') {
      const { label, width, height } = VIEWPORTS[viewport];
      return <div className="overflow-x-auto py-4 sm:px-4" data-world-card-viewport={viewport}>
        <p className="mb-3 px-4 text-xs text-white/65 sm:px-0">{label} · {width} × {height}</p>
        <iframe title={`World Card ${reference ? 'reference' : 'development'} at ${label} width`}
          src={canvasUrl(view, state, reference)} width={width} height={height}
          className="mx-auto block max-w-none border-0 bg-[#04060d] sm:rounded-xl sm:border sm:border-white/20"
          style={{ width, height, boxSizing: 'content-box' }} />
      </div>;
    }
    return <>
      <WorldCardStage view={view} state={state} reference={reference} onAction={message => setAction(`${message} · mock preview`)} />
      <p className="px-4 pb-6 font-sans text-xs text-neutral-400 sm:px-8" role="status">{action}</p>
    </>;
  };

  return <FeatureWorkspace entry={entry}
    renderReference={() => render(true)} renderDevelopment={() => render(false)}
    workshopControls={{
      description: 'The same world at every size. Home, the world detail and Create render these cards directly, so Development changes here show up on those pages.',
      defaultSection: 'pages',
      sections: [{
        id: 'pages',
        description: VIEWS[view].description,
        content: <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs">View
            <select className={selectClass} value={view} onChange={event => setView(event.target.value as View)}>
              {Object.entries(VIEWS).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">Viewport
            <select className={selectClass} value={viewport} onChange={event => setViewport(event.target.value as Viewport)}>
              {Object.entries(VIEWPORTS).map(([value, size]) => <option key={value} value={value}>
                {size.width ? `${size.label} · ${size.width} × ${size.height}` : size.label}
              </option>)}
            </select>
          </label>
        </div>,
      }, {
        id: 'states',
        description: 'Full card progress changes with its public or personal-library context. Reader history, reading position and the Info page destinations stay on the Info page. Activity appears only in the Full card’s story panel.',
        content: <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs">Full card progress
            <select className={selectClass} value={state.cardStatus} onChange={event => update({ cardStatus: event.target.value as WorldCardStatusPreview })}>
              <optgroup label="Public view">
                <option value="public-ongoing">On Going</option>
                <option value="public-completed">Completed</option>
              </optgroup>
              <optgroup label="Your library">
                <option value="library-draft">Draft</option>
                <option value="library-shared">Shared</option>
                <option value="library-public">Public</option>
                <option value="library-complete">Complete</option>
              </optgroup>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">SEN sash
            <select className={selectClass} value={state.sash} onChange={event => update({ sash: event.target.value as WorldCardSashPreview })}>
              <option value="hidden">Not awarded (default)</option>
              <option value="shown">Awarded</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">Reader history
            <select className={selectClass} value={state.recentlyRead} onChange={event => update({ recentlyRead: event.target.value as WorldCardRecentlyRead })}>
              <option value="no">Not read recently</option>
              <option value="yes">Recently read</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">Title
            <select className={selectClass} value={state.titleLength} onChange={event => update({ titleLength: event.target.value as WorldCardTitleLength })}>
              <option value="standard">Standard</option>
              <option value="long">Very long</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">Cover
            <select className={selectClass} value={state.cover} onChange={event => update({ cover: event.target.value as WorldCardCover })}>
              <option value="art">World art</option>
              <option value="missing">No cover yet</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">Activity
            <select className={selectClass} value={state.activity} onChange={event => update({ activity: event.target.value as WorldActivityStatus | 'hidden' })}>
              <option value="active-now">Active now</option>
              <option value="active-this-week">Active this week</option>
              <option value="quiet">Quiet</option>
              <option value="hidden">Hidden or unavailable</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">Info destinations
            <select className={selectClass} value={state.destinations} onChange={event => update({ destinations: event.target.value as WorldCardDestinations })}>
              <option value="all">Reading and Codex</option>
              <option value="reading-only">Reading only</option>
              <option value="none">None supplied</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">Reading position
            <select className={selectClass} value={state.reading} onChange={event => update({ reading: event.target.value as WorldCardReadingPreview })}>
              <option value="chapter-7">Known: Chapter 7 (Continue)</option>
              <option value="start">Not started (Continue)</option>
              <option value="new-story">New story, no chapters (Begin Story)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">Blueprint view
            <select className={selectClass} value={state.blueprint} onChange={event => update({ blueprint: event.target.value as WorldCardBlueprintPreview })}>
              <option value="creator">Creator, private novel (edit)</option>
              <option value="creator-shared">Creator, shared novel (view)</option>
              <option value="reader-copy">Reader, copy allowed</option>
              <option value="reader-view">Reader, view only</option>
              <option value="reader-off">Reader, sharing off (no button)</option>
            </select>
          </label>
        </div>,
      }],
    }} />;
}

export function WorldCardWorkspace() {
  return new URLSearchParams(window.location.search).get('canvas') === '1'
    ? <WorldCardCanvas /> : <WorldCardWorkspaceShell />;
}
