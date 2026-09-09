import { useState } from 'react';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { headerStates, type HeaderConfiguration } from './headerPreviewData';

const devices = { phone: [390, 844], tablet: [768, 1024], desktop: [1440, 900] } as const;
type Device = keyof typeof devices;
type SafeArea = 'off' | 'on' | 'landscape';

/**
 * What each viewport is meant to prove about the shared App Header and the
 * complete shell. Story Seed and the Cultivator Cave now render the same
 * `SEIAppHeader` over the same `SEIAppShell`, so both are checked against the
 * same list.
 */
const shellChecks: Record<Device, readonly string[]> = {
  phone: [
    'One header row: emblem, Library badge, primary action, overflow. Nothing is pushed off screen.',
    'Secondary actions live in the overflow menu; the status keeps its tone dot and stays announced.',
    'Sections open in the drawer from the bottom navigation — no sidebar column and no second nav.',
    'Content scrolls under the sticky header and clears the bottom controls at the end of the scroll.',
  ],
  tablet: [
    'Still the drawer and the bottom controls: the desktop rail must not appear before it fits.',
    'No blank sidebar column, no half-height rail, and no horizontal scrollbar on the page.',
    'Secondary header actions are visible again beside the primary action.',
  ],
  desktop: [
    'One narrow 14rem rail. Its surface and border run from under the header to the bottom of the viewport.',
    'The rail stays put and scrolls inside itself while the workspace scrolls; the workspace fills the rest of the width.',
    'The bottom controls and the drawer are gone — navigation is offered once.',
    'The first row of content sits below the header, never underneath it.',
  ],
};

const universalChecks = [
  'Badge: the Library plaque is the visible identity, its emblem returns home, and the glow is not clipped.',
  'Header actions: eligibility, pressed and loading states, and disabled reasons all still come from the feature.',
  'Focus: Tab reaches every header control, focus rings are visible, and Escape returns focus from the overflow menu.',
  'Safe areas: the header surface reaches under the inset and the gutters absorb a landscape notch.',
  'Reduced motion: no header, drawer or rail animation runs.',
];

export function LibraryShellWorkspace() {
  const query = new URLSearchParams(window.location.search);
  const initial = query.get('source');
  const [source, setSource] = useState<HeaderConfiguration>(initial === 'story-seed' || initial === 'cultivator-cave' ? initial : 'main-library');
  const [state, setState] = useState(() => (headerStates[source] as readonly string[]).includes(query.get('state') ?? '') ? query.get('state')! : headerStates[source][0]);
  const [device, setDevice] = useState<Device>(query.get('device') === 'desktop' ? 'desktop' : query.get('device') === 'tablet' ? 'tablet' : 'phone');
  const [safeArea, setSafeArea] = useState<SafeArea>('off');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [width, height] = devices[device];
  const controls = 'min-h-11 rounded-lg border border-white/20 bg-black/30 p-2 text-sm text-white';
  const environment = `${safeArea === 'off' ? '' : `&safeArea=${safeArea}`}${reducedMotion ? '&motion=reduced' : ''}`;
  const render = (variant: 'reference' | 'development') => {
    if (variant === 'reference' && source === 'cultivator-cave') return <p className="p-8 text-sm text-white/70">Cultivator Cave is a new Workspace Header configuration. No locked Cultivator Cave capture exists; select Story Seed to inspect the approved badge baseline.</p>;
    const frameState = variant === 'reference' && source === 'story-seed' ? (state === 'empty-intake' ? 'empty' : state === 'generating-blueprint' ? 'generating' : 'filled') : state;
    const src = `/library-shell.html?source=${source}&state=${frameState}&variant=${variant}${variant === 'development' ? environment : ''}`;
    return <div className="overflow-x-auto p-4">
      <p className="mb-3 text-xs text-white/65">{variant === 'reference' ? 'Locked shell capture' : 'Development workspace'} · {width} × {height}
        {variant === 'development' && safeArea !== 'off' ? ` · safe area: ${safeArea}` : ''}
        {variant === 'development' && reducedMotion ? ' · reduced motion' : ''}</p>
      {/* The frame is a real viewport, so the shell resolves its own breakpoints
          inside it rather than inheriting the Workshop page's width. */}
      <iframe title={`${source} ${device} ${variant}`} src={src} width={width} height={height}
        className="block max-w-none rounded-xl border border-white/20 bg-black" style={{ width, boxSizing: 'content-box' }} />
      <a className="mt-3 inline-block text-sm text-cyan-200 underline" href={src} target="_blank" rel="noreferrer">Open responsive {variant} at browser width</a>
    </div>;
  };
  const checklist = source === 'main-library'
    ? <p className="text-xs text-white/65">The Main Library homepage header is unchanged by the shared App Header migration. Select Story Seed or Cultivator Cave to verify the shell.</p>
    : <div className="space-y-3 text-xs text-white/75">
      <div>
        <p className="font-semibold uppercase tracking-wider text-white/90">{device} · {width} × {height}</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">{shellChecks[device].map(check => <li key={check}>{check}</li>)}</ul>
      </div>
      <div>
        <p className="font-semibold uppercase tracking-wider text-white/90">Every viewport</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">{universalChecks.map(check => <li key={check}>{check}</li>)}</ul>
      </div>
    </div>;
  return <FeatureWorkspace entry={workshopEntries.find(entry => entry.id === 'library-shell')!}
    renderReference={() => render('reference')} renderDevelopment={() => render('development')}
    workshopControls={{ description: 'Story Seed and the Cultivator Cave over the shared SEIAppHeader and SEIAppShell. Locked references remain available for comparison; the Main Library header is unchanged.', sections: [{ id: 'pages', content: <div className="flex flex-wrap gap-4">
      <label className="flex flex-col gap-1 text-xs">Configuration<select className={controls} value={source} onChange={event => { const value = event.target.value as HeaderConfiguration; setSource(value); setState(headerStates[value][0]); }}><option value="main-library">Main Library</option><option value="story-seed">Story Seed</option><option value="cultivator-cave">Cultivator Cave</option></select></label>
      <label className="flex flex-col gap-1 text-xs">Viewport<select className={controls} value={device} onChange={event => setDevice(event.target.value as Device)}><option value="phone">Phone · 390 × 844</option><option value="tablet">Tablet · 768 × 1024</option><option value="desktop">Desktop · 1440 × 900</option></select></label>
      <label className="flex flex-col gap-1 text-xs">Mock state<select className={controls} value={state} onChange={event => setState(event.target.value)}>{headerStates[source].map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="flex flex-col gap-1 text-xs">Safe area<select className={controls} value={safeArea} onChange={event => setSafeArea(event.target.value as SafeArea)}><option value="off">None</option><option value="on">Notch · top and bottom</option><option value="landscape">Landscape · left and right</option></select></label>
      <label className="flex min-h-11 items-center gap-2 self-end text-xs"><input type="checkbox" className="size-4" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} />Reduced motion</label>
    </div> }, { id: 'states', content: checklist }] }} />;
}
