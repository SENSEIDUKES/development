import { useState } from 'react';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { headerStates, type HeaderConfiguration } from './headerPreviewData';

const devices = { narrow: [320, 740], phone: [390, 844], tablet: [768, 1024], desktop: [1440, 900], landscape: [844, 390] } as const;
type Device = keyof typeof devices;
type SafeArea = 'off' | 'on' | 'landscape';
const configurations: Record<HeaderConfiguration, string> = {
  'main-library': 'Home, Create & My Library', 'cultivator-cave': 'Cultivator Cave', 'story-seed': 'Story Seed', 'header-states': 'Header slot states',
};
/** The Library Shell's two navigation modes, and the pages that show each. */
const modes = [
  { label: 'Main mode · global strip', sources: ['main-library', 'cultivator-cave'] },
  { label: 'Workspace mode · task bar', sources: ['story-seed'] },
  { label: 'Header only', sources: ['header-states'] },
] as const satisfies readonly { label: string; sources: readonly HeaderConfiguration[] }[];
const modeOf = (source: HeaderConfiguration) => source === 'story-seed' ? 'Workspace mode' : source === 'header-states' ? 'Header only' : 'Main mode';
const checks = [
  'Top row: Logo, existing Library badge, optional page context, Help, Search.',
  'Header slot states: compare present, absent and long context. Help and Search stay aligned at the right.',
  'Home supplies Dao Insights; the public Cave supplies Public View. Private Cave and Story Seed omit the contextual item.',
  'Help opens the existing Library guidance. Search filters existing destinations and actions; try a match and no results.',
  'On phones Search and context use emblems. Every top-row control has a 44px touch target and a visible keyboard focus ring.',
  'Escape dismisses overlays and returns focus. Tab stays within a modal; selecting a Search result runs the host action.',
  'Page commands retain their existing controls below the top row. Safe-area gutters keep the header clear of notches.',
  'Main mode: the global strip is Home, Create, Discover, Profile. Page destinations remain available through top Search and the desktop rail.',
  'Main mode states exercise Home, Create, My Library, Discover, Sects and Tiers. Back/Forward updates the active destination.',
  'Cave Search contains Home, Stories and Relics; public Search also has Exit. Settings stays beneath Daily Dao Pillar.',
  'Workspace mode (Story Seed): the shell draws the task bar in the global strip\'s place — Sections, Story Bank, Settings, Back. Sections opens the drawer; from 1024px the rail replaces the drawer and the bar.',
  'Workspace mode header matches main mode: the Celestial Library emblem, Help and Search; the logo and Back both return to Library Home.',
  'Reader stays immersive: no strip, no task bar, and it scrolls the whole page for cinematic reading.',
  'Laptop navigation (1024px and wider): the Pathways sidebar — identity, Home, Create, Discover, Profile with the page\'s sections nested under the active one, Settings, artwork — replaces the bottom strip; 1024–1279px shows the compact icon rail. Compare it with the strip it replaced.',
  'On laptops Home\'s header carries Dao Insights in its center; phones keep Dao Insights in Home content and the strip at the bottom.',
  'Browsing screens scroll inside the frame: the header stays put, the rail appears from 1024px and scrolls on its own, and nothing hides behind the bottom strip.',
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
  // Laptop navigation: the Pathways sidebar, the bottom strip it replaced, or both stacked for comparison.
  const [laptopNav, setLaptopNav] = useState<'sidebar' | 'strip' | 'compare'>(query.get('laptopNav') === 'strip' ? 'strip' : 'sidebar');
  const [width, height] = devices[device];
  const controls = 'min-h-11 rounded-lg border border-white/20 bg-black/30 p-2 text-sm text-white';
  const environment = `${safeArea === 'off' ? '' : `&safeArea=${safeArea}`}${reducedMotion ? '&motion=reduced' : ''}${source === 'cultivator-cave' && publicView ? '&cave=/public/home' : ''}`;
  const withLaptopNav = (value: 'sidebar' | 'strip' | 'compare') => value === 'strip' ? '&laptopNav=strip' : '';
  const render = (variant: 'reference' | 'development') => {
    if (variant === 'reference' && (source === 'cultivator-cave' || source === 'header-states')) return <p className="p-8 text-sm text-white/70">This configuration has no locked capture. Select Main Library or Story Seed for the original header reference.</p>;
    const frameState = variant === 'reference' && source === 'story-seed' ? (state === 'empty-intake' ? 'empty' : state === 'generating-blueprint' ? 'generating' : 'filled') : state;
    const base = `/library-shell.html?source=${source}&state=${frameState}&variant=${variant}${variant === 'development' ? environment : ''}`;
    const frame = (src: string, caption: string, key: string) => <div key={key} className="overflow-x-auto p-4">
      <p className="mb-3 text-xs text-white/65">{caption} · {width} × {height}</p>
      <iframe title={`${source} ${device} ${variant} ${key}`} src={src} width={width} height={height}
        className="block max-w-none rounded-xl border border-white/20 bg-black" style={{ width, boxSizing: 'content-box' }} />
      <a className="mt-3 inline-block text-sm text-cyan-200 underline" href={src} target="_blank" rel="noreferrer">Open responsive {caption.toLowerCase()} at browser width</a>
    </div>;
    if (variant === 'reference') return frame(base, 'Locked shell capture', 'reference');
    if (laptopNav === 'compare') return <>
      {frame(base, 'Development · Pathways sidebar', 'sidebar')}
      {frame(base + withLaptopNav('strip'), 'Development · bottom strip (before)', 'strip')}
    </>;
    return frame(base + withLaptopNav(laptopNav), laptopNav === 'strip' ? 'Development · bottom strip (before)' : 'Development workspace', laptopNav);
  };
  return <FeatureWorkspace entry={workshopEntries.find(entry => entry.id === 'library-shell')!}
    renderReference={() => render('reference')} renderDevelopment={() => render('development')}
    workshopControls={{ description: 'One Library navigation system in two modes: main mode (the bottom strip on phones and the Pathways sidebar on laptops, on Home, Create, My Library and the Cave) and workspace mode (Story Seed\'s task bar, Sections drawer and rail), under one shared header. The Reader stays immersive.', sections: [{ id: 'pages', content: <div className="flex flex-wrap gap-4">
      <label className="flex flex-col gap-1 text-xs">Page<select className={controls} value={source} onChange={event => { const value = event.target.value as HeaderConfiguration; setSource(value); setState(headerStates[value][0]); }}>{modes.map(mode => <optgroup key={mode.label} label={mode.label}>{mode.sources.map(value => <option key={value} value={value}>{configurations[value]}</option>)}</optgroup>)}</select></label>
      <p className="flex min-h-11 items-center self-end text-xs text-white/75" data-library-shell-mode>Navigation: {modeOf(source)}</p>
      <label className="flex flex-col gap-1 text-xs">Viewport<select className={controls} value={device} onChange={event => setDevice(event.target.value as Device)}>{Object.entries(devices).map(([value, size]) => <option key={value} value={value}>{value} · {size[0]} × {size[1]}</option>)}</select></label>
      <label className="flex flex-col gap-1 text-xs">Mock state<select className={controls} value={state} onChange={event => setState(event.target.value)}>{headerStates[source].map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="flex flex-col gap-1 text-xs">Safe area<select className={controls} value={safeArea} onChange={event => setSafeArea(event.target.value as SafeArea)}><option value="off">None</option><option value="on">Notch · top and bottom</option><option value="landscape">Landscape · left and right</option></select></label>
      <label className="flex flex-col gap-1 text-xs">Laptop navigation<select className={controls} value={laptopNav} onChange={event => setLaptopNav(event.target.value as typeof laptopNav)}><option value="sidebar">Pathways sidebar</option><option value="strip">Bottom strip (before)</option><option value="compare">Compare both</option></select></label>
      <label className="flex min-h-11 items-center gap-2 self-end text-xs"><input type="checkbox" className="size-4" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} />Reduced motion</label>
      {source === 'cultivator-cave' && <label className="flex min-h-11 items-center gap-2 self-end text-xs"><input type="checkbox" className="size-4" checked={publicView} onChange={event => setPublicView(event.target.checked)} />Public View context</label>}
    </div> }, { id: 'states', content: <ul className="list-disc space-y-2 pl-5 text-xs text-white/75">{checks.map(check => <li key={check}>{check}</li>)}</ul> }] }} />;
}
