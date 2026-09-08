import { useEffect, useRef, useState } from 'react';
import { Bookmark, CircleHelp, Settings, Vault, Sparkles, Mountain, Download } from 'lucide-react';
import { LibraryButton, LibraryPanel } from '@seihouse/library-ui';
import { MainLibraryHeader, WorkspaceHeader, type HeaderAction } from '../../../components/library-shell/development/LibraryShell';
import { MainLibraryPreview } from './MainLibraryPreview';

export const headerStates = {
  'main-library': ['linked', 'guest', 'syncing', 'offline', 'profile', 'active-story', 'long-name', 'missing-profile', 'dao-local', 'dao-error'],
  'story-seed': ['filled', 'empty', 'saved', 'generating', 'error', 'long-title', 'minimal'],
  'cultivator-cave': ['ready', 'cultivating', 'error', 'long-title', 'minimal'],
} as const;
export type HeaderConfiguration = keyof typeof headerStates;

export function DevelopmentHeaderPreview({ source, state }: { source: HeaderConfiguration; state: string }) {
  const [message, setMessage] = useState('Local preview ready.');
  if (source === 'main-library') return <MainLibraryPreview state={state} developmentHeader={adapter =>
    <MainLibraryHeader adapter={{ ...adapter, copyText: async text => { setMessage(`Local preview clipboard: ${text}`); } }} />
  } extraFeedback={message} />;
  return <WorkspaceHeaderPreview key={`${source}-${state}`} source={source} state={state} />;
}

function WorkspaceHeaderPreview({ source, state }: { source: Exclude<HeaderConfiguration, 'main-library'>; state: string }) {
  const cave = source === 'cultivator-cave';
  const minimal = state === 'minimal';
  const title = state === 'long-title' ? (cave ? 'Cultivator Cave of the Nine Celestial Mountains' : 'Story Seed of the Nine Unfinished Universes') : cave ? 'Cultivator Cave' : 'Story Seed';
  const [busy, setBusy] = useState(state === 'generating' || state === 'cultivating');
  const [saved, setSaved] = useState(state === 'saved');
  const [error, setError] = useState(state === 'error');
  const [bankOpen, setBankOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [destination, setDestination] = useState('Your workspace is ready.');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const act = () => {
    setBusy(true); setError(false); setDestination(cave ? 'Gathering Qi…' : 'Saving draft…');
    timer.current = setTimeout(() => { setBusy(false); setSaved(true); setDestination(cave ? 'Cultivation session completed locally.' : 'Story Seed draft saved locally.'); }, 1200);
  };
  const primary: HeaderAction = {
    id: 'primary', label: busy ? (cave ? 'Cultivating' : 'Saving draft') : error ? 'Try again' : cave ? 'Begin Cultivation' : saved ? 'Saved' : 'Save Draft',
    icon: cave ? Mountain : Bookmark, onAction: act, loading: busy, disabled: state === 'empty',
  };
  const actions: HeaderAction[] = [
    { id: 'settings', label: 'Settings', icon: Settings, pressed: settingsOpen, onAction: () => { setSettingsOpen(value => !value); setDestination('Settings opened in the local host content.'); } },
    { id: 'bank', label: cave ? 'Relics' : 'Story Bank', icon: Vault, pressed: bankOpen, onAction: () => { setBankOpen(value => !value); setDestination(cave ? 'Relic collection toggled.' : 'Story Bank toggled.'); } },
  ];
  return <div className="min-h-dvh">
    <WorkspaceHeader title={title} subtitle={minimal ? undefined : cave ? 'Refine Your Inner World' : 'Grow Your Universe'}
      emblem={minimal ? undefined : { src: '/favicon.jpg', alt: 'Celestial Library' }}
      home={minimal ? undefined : { href: '/?preview=library-shell', label: 'Return to Library', onNavigate: () => setDestination('Returned to Library locally.') }}
      back={cave && !minimal ? { label: 'Back to Profile', onNavigate: () => setDestination('Returned to Profile locally.') } : undefined}
      primaryAction={minimal ? undefined : primary} secondaryActions={minimal ? [] : actions}
      overflowActions={minimal ? [] : [
        { id: 'help', label: 'Help', icon: CircleHelp, onAction: () => setDestination(`${cave ? 'Cultivator Cave' : 'Story Seed'} help opened locally.`) },
        { id: 'export', label: 'Export summary', icon: Download, onAction: () => setDestination('Summary exported to the local preview output.') },
      ]}
      status={minimal ? undefined : { label: busy ? 'Local operation in progress' : error ? 'Could not complete · retry available' : state === 'empty' ? 'Add a premise to save' : saved ? 'All changes saved locally' : cave ? 'Qi settled · ready to cultivate' : 'Unsaved changes', tone: busy ? 'busy' : error ? 'error' : saved ? 'success' : 'neutral' }} />
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="mb-3 text-xs uppercase tracking-widest text-sen-portal">Workshop · {cave ? 'Cultivator Cave' : 'Story Seed'}</p>
      <LibraryPanel padding="lg">
        <h2 className="font-sen-display text-2xl text-sen-signal">{cave ? 'A quiet place to cultivate' : 'The beginning of a universe'}</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-400">Header configuration preview. Page content and navigation remain with the workspace that owns them.</p>
        <p role="status" className="mt-6 text-sm text-sen-portal">{destination}</p>
        {busy && <LibraryButton variant="secondary" onClick={() => { clearTimeout(timer.current); setBusy(false); setDestination('Local operation cancelled.'); }}>Cancel local operation</LibraryButton>}
        {settingsOpen && <section aria-label="Local settings adapter" className="mt-6 border-t border-white/10 pt-4">
          <h3 className="mb-3 font-sen-display text-xl">Local settings</h3>
          <LibraryButton variant="secondary" aria-pressed={quiet} onClick={() => setQuiet(value => !value)}>{quiet ? 'Quiet mode on' : 'Quiet mode off'}</LibraryButton>
        </section>}
        {bankOpen && <p className="mt-6 text-sm text-neutral-300">{cave ? 'Equipped relic: Stillwater Jade' : 'Saved Story Seed: The Seventh Dawn'}</p>}
      </LibraryPanel>
      <p className="mt-6 flex gap-2 text-xs text-neutral-400"><Sparkles size={14} aria-hidden="true" />Local adapters only. Refresh resets this preview.</p>
    </main>
  </div>;
}
