import { useState } from 'react';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { headerStates, type HeaderConfiguration } from './headerPreviewData';

const devices = { narrow: [320, 740], phone: [390, 844], tablet: [768, 1024], desktop: [1440, 900], landscape: [844, 390] } as const;
type Device = keyof typeof devices;
type SafeArea = 'off' | 'on' | 'landscape';
const configurations: Record<HeaderConfiguration, string> = {
  'main-library': 'Main Library', 'story-seed': 'Story Seed', 'cultivator-cave': 'Cultivator Cave', 'header-states': 'Header slot states',
};
const checks = [
  'Top row: Logo, existing Library badge, optional page context, Help, Search.',
  'Header slot states: compare present, absent and long context. Help and Search stay aligned at the right.',
  'Home supplies Dao Insights; the public Cave supplies Public View. Private Cave and Story Seed omit the contextual item.',
  'Help opens the existing Library guidance. Search filters existing destinations and actions; try a match and no results.',
  'On phones Search and context use emblems. Every top-row control has a 44px touch target and a visible keyboard focus ring.',
  'Escape dismisses overlays and returns focus. Tab stays within a modal; selecting a Search result runs the host action.',
  'Page commands retain their existing controls below the top row. Safe-area gutters keep the header clear of notches.',
  'Global strip: Home, Library, Discover, Profile. Page destinations remain available through top Search.',
  'Main Library states exercise Home, Library, Discover, Sects and Tiers. Back/Forward updates the active destination.',
  'Cave Search contains Home, Stories and Relics; public Search also has Exit. Settings stays beneath Daily Dao Pillar.',
  'Story Seed retains its existing strip and Reader stays immersive. Neither receives the global strip.',
];

export function LibraryShellWorkspace() {
  const query = new URLSearchParams(window.location.search);
  const initial = query.get('source') ?? '';
  const [source, setSource] = useState<HeaderConfiguration>(initial in configurations ? initial as HeaderConfiguration : 'main-library');
  const [state, setState] = useState(() => (headerStates[source] as readonly string[]).includes(query.get('state') ?? '') ? query.get('state')! : headerStates[source][0]);
  const [device, setDevice] = useState<Device>((query.get('device') ?? '') in devices ? query.get('device') as Device : 'phone');
  const [safeArea, setSafeArea] = useState<SafeArea>('off');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [publicView, setPublicView] = useState(false);
  const [width, height] = devices[device];
  const controls = 'min-h-11 rounded-lg border border-white/20 bg-black/30 p-2 text-sm text-white';
  const environment = `${safeArea === 'off' ? '' : `&safeArea=${safeArea}`}${reducedMotion ? '&motion=reduced' : ''}${source === 'cultivator-cave' && publicView ? '&cave=/public/home' : ''}`;
  const render = (variant: 'reference' | 'development') => {
    if (variant === 'reference' && (source === 'cultivator-cave' || source === 'header-states')) return <p className="p-8 text-sm text-white/70">This configuration has no locked capture. Select Main Library or Story Seed for the original header reference.</p>;
    const frameState = variant === 'reference' && source === 'story-seed' ? (state === 'empty-intake' ? 'empty' : state === 'generating-blueprint' ? 'generating' : 'filled') : state;
    const src = `/library-shell.html?source=${source}&state=${frameState}&variant=${variant}${variant === 'development' ? environment : ''}`;
    return <div className="overflow-x-auto p-4">
      <p className="mb-3 text-xs text-white/65">{variant === 'reference' ? 'Locked shell capture' : 'Development workspace'} · {width} × {height}</p>
      <iframe title={`${source} ${device} ${variant}`} src={src} width={width} height={height}
        className="block max-w-none rounded-xl border border-white/20 bg-black" style={{ width, boxSizing: 'content-box' }} />
      <a className="mt-3 inline-block text-sm text-cyan-200 underline" href={src} target="_blank" rel="noreferrer">Open responsive {variant} at browser width</a>
    </div>;
  };
  return <FeatureWorkspace entry={workshopEntries.find(entry => entry.id === 'library-shell')!}
    renderReference={() => render('reference')} renderDevelopment={() => render('development')}
    workshopControls={{ description: 'Shared Library navigation: top header, four global destinations and page Search. Existing Story Seed and Reader navigation remain specialized.', sections: [{ id: 'pages', content: <div className="flex flex-wrap gap-4">
      <label className="flex flex-col gap-1 text-xs">Configuration<select className={controls} value={source} onChange={event => { const value = event.target.value as HeaderConfiguration; setSource(value); setState(headerStates[value][0]); }}>{Object.entries(configurations).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="flex flex-col gap-1 text-xs">Viewport<select className={controls} value={device} onChange={event => setDevice(event.target.value as Device)}>{Object.entries(devices).map(([value, size]) => <option key={value} value={value}>{value} · {size[0]} × {size[1]}</option>)}</select></label>
      <label className="flex flex-col gap-1 text-xs">Mock state<select className={controls} value={state} onChange={event => setState(event.target.value)}>{headerStates[source].map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="flex flex-col gap-1 text-xs">Safe area<select className={controls} value={safeArea} onChange={event => setSafeArea(event.target.value as SafeArea)}><option value="off">None</option><option value="on">Notch · top and bottom</option><option value="landscape">Landscape · left and right</option></select></label>
      <label className="flex min-h-11 items-center gap-2 self-end text-xs"><input type="checkbox" className="size-4" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} />Reduced motion</label>
      {source === 'cultivator-cave' && <label className="flex min-h-11 items-center gap-2 self-end text-xs"><input type="checkbox" className="size-4" checked={publicView} onChange={event => setPublicView(event.target.checked)} />Public View context</label>}
    </div> }, { id: 'states', content: <ul className="list-disc space-y-2 pl-5 text-xs text-white/75">{checks.map(check => <li key={check}>{check}</li>)}</ul> }] }} />;
}
