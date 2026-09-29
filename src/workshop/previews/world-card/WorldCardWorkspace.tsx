import { useState, type ReactNode } from 'react';
import { useLibraryAssets } from '@seihouse/library/presentation';
import { WorldCard, WorldCardCompact, WorldCardInfo, WorldCardMini, WORLD_STATUS_LABELS } from '@seihouse/library/world-card';
import type { CreatorWorld } from '@seihouse/library/creator-space';
import { WorldCardFullReference } from '../../../components/world-card/reference/WorldCardFull';
import { WorldCardCompactReference } from '../../../components/world-card/reference/WorldCardCompact';
import { StoryDetailScreen as ReferenceStoryDetail } from '../../../components/light-novels-home/reference/StoryDetailScreen';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import {
  ACQUISITION_LABELS, previewCreatorWorlds, previewStory,
  type WorldCardAcquisition, type WorldCardBranchPreview, type WorldCardCover, type WorldCardPreviewState, type WorldCardTitleLength,
} from './previewData';
import type { WorldActivityStatus } from '@seihouse/library/home';

const entry = workshopEntries.find(candidate => candidate.id === 'world-card')!;

const VIEWS = {
  all: { label: 'All sizes', description: 'Every size of the same world, largest to smallest.' },
  info: { label: 'Info page', description: 'The full world overview a reader lands on when they open a world.' },
  full: { label: 'World Card', description: 'The full 2:3 discovery card, shown at its Home grid width.' },
  compact: { label: 'Compact', description: 'Create’s “Your worlds” tile. Tap a tile to move the glowing selection.' },
  mini: { label: 'Mini', description: 'New: a single row sized like an audio-player track — cover thumb, title, one line of meta and a round action.' },
} as const;
type View = keyof typeof VIEWS;

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

function CompactRow({ worlds, reference }: { worlds: readonly CreatorWorld[]; reference: boolean }) {
  const { homeImages = [] } = useLibraryAssets();
  const [selectedId, setSelectedId] = useState(worlds[0]?.id);
  const Card = reference ? WorldCardCompactReference : WorldCardCompact;
  return <ul className="flex gap-3 overflow-x-auto pb-4" aria-label="Your worlds">
    {worlds.slice(0, 3).map(world => <li key={world.id} className="w-[min(46%,13.5rem)] flex-none sm:w-[13.5rem]">
      <Card world={world} cover={world.imageUrl ?? fallbackCover(world.id, homeImages)} fallbackCover={!world.imageUrl}
        selected={world.id === selectedId} onSelect={() => setSelectedId(world.id)} />
    </li>)}
  </ul>;
}

function WorldCardStage({ view, state, reference, onAction }: {
  view: View; state: WorldCardPreviewState; reference: boolean; onAction: (message: string) => void;
}) {
  const story = previewStory(state);
  const worlds = previewCreatorWorlds(state);
  const show = (candidate: View) => view === 'all' || view === candidate;

  return <div className="mx-auto max-w-5xl space-y-12 px-4 py-6 sm:px-8" data-world-card-stage={reference ? 'reference' : 'development'}>
    {show('info') && <Stage title="Info page">
      {reference
        ? <ReferenceStoryDetail story={story} onBack={() => onAction('Back to novels')} />
        : <WorldCardInfo story={story} />}
    </Stage>}
    {show('full') && <Stage title="World Card" note="Home grid width.">
      <div className="w-[min(100%,13rem)]">
        {reference
          ? <WorldCardFullReference world={story} onOpen={() => onAction(`Open ${story.title}`)} />
          : <WorldCard world={story} onOpen={() => onAction(`Open ${story.title}`)} />}
      </div>
    </Stage>}
    {show('compact') && <Stage title="Compact" note="Create · Your worlds.">
      <CompactRow key={`${reference}-${state.titleLength}-${state.cover}`} worlds={worlds} reference={reference} />
    </Stage>}
    {show('mini') && <Stage title="Mini" note={reference ? undefined : 'Track-sized row.'}>
      {reference
        ? <p className="max-w-md font-sans text-sm text-neutral-400">New in Development — the Mini size has no production original yet.</p>
        : <ul className="max-w-md space-y-2" aria-label="Worlds, mini">
            {worlds.slice(0, 4).map(world => {
              const meta = world.id === story.id
                ? `Ch. ${world.chapterCount} · ${story.genre}`
                : `Ch. ${world.chapterCount} · ${WORLD_STATUS_LABELS[world.status]}`;
              return <li key={world.id}>
                <WorldCardMini title={world.title} imageUrl={world.imageUrl} meta={meta}
                  onOpen={() => onAction(`Open ${world.title}`)} onAction={() => onAction(`Continue ${world.title}`)} />
              </li>;
            })}
          </ul>}
    </Stage>}
  </div>;
}

const selectClass = 'min-h-11 rounded-lg border border-white/20 bg-black/30 p-2 text-sm text-white';

/** One world in every size it appears: Info page, Full card, Compact and Mini. */
export function WorldCardWorkspace() {
  const [view, setView] = useState<View>('all');
  const [state, setState] = useState<WorldCardPreviewState>({ acquisition: 'sealed', titleLength: 'standard', cover: 'art', branches: 'sample', activity: 'active-this-week' });
  const [action, setAction] = useState('');
  const update = (patch: Partial<WorldCardPreviewState>) => setState(current => ({ ...current, ...patch }));

  const render = (reference: boolean) => <>
    <WorldCardStage view={view} state={state} reference={reference} onAction={message => setAction(`${message} · mock preview`)} />
    <p className="px-4 pb-6 font-sans text-xs text-neutral-400 sm:px-8" role="status">{action}</p>
  </>;

  return <FeatureWorkspace entry={entry}
    renderReference={() => render(true)} renderDevelopment={() => render(false)}
    workshopControls={{
      description: 'The same world at every size. Home, the world detail and Create render these cards directly, so Development changes here show up on those pages.',
      defaultSection: 'pages',
      sections: [{
        id: 'pages',
        description: VIEWS[view].description,
        content: <label className="flex flex-col gap-1 text-xs">View
          <select className={selectClass} value={view} onChange={event => setView(event.target.value as View)}>
            {Object.entries(VIEWS).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}
          </select>
        </label>,
      }, {
        id: 'states',
        description: 'Library status, branches and activity appear on the Info page. Missing cover applies to every size.',
        content: <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs">Library status
            <select className={selectClass} value={state.acquisition} onChange={event => update({ acquisition: event.target.value as WorldCardAcquisition })}>
              {Object.entries(ACQUISITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
          <label className="flex flex-col gap-1 text-xs">Branches
            <select className={selectClass} value={state.branches} onChange={event => update({ branches: event.target.value as WorldCardBranchPreview })}>
              <option value="sample">12 branches</option>
              <option value="zero">0 branches</option>
              <option value="unavailable">Unavailable</option>
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
        </div>,
      }],
    }} />;
}
