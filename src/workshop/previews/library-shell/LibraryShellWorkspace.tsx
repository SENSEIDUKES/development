import { useState } from 'react';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { headerStates, type HeaderConfiguration } from './DevelopmentHeaderPreview';

const devices = { phone: [390, 844], tablet: [768, 1024], desktop: [1440, 900] } as const;
export function LibraryShellWorkspace() {
  const query = new URLSearchParams(window.location.search);
  const initial = query.get('source');
  const [source, setSource] = useState<HeaderConfiguration>(initial === 'story-seed' || initial === 'cultivator-cave' ? initial : 'main-library');
  const [state, setState] = useState(() => (headerStates[source] as readonly string[]).includes(query.get('state') ?? '') ? query.get('state')! : headerStates[source][0]);
  const [device, setDevice] = useState<keyof typeof devices>(query.get('device') === 'desktop' ? 'desktop' : query.get('device') === 'tablet' ? 'tablet' : 'phone');
  const [width, height] = devices[device];
  const controls = 'min-h-11 rounded-lg border border-white/20 bg-black/30 p-2 text-sm text-white';
  const render = (variant: 'reference' | 'development') => {
    if (variant === 'reference' && source === 'cultivator-cave') return <p className="p-8 text-sm text-white/70">Cultivator Cave is a new Workspace Header configuration. No locked Cultivator Cave capture exists; select Story Seed to inspect the approved badge baseline.</p>;
    const src = `/library-shell.html?source=${source}&state=${state}&variant=${variant}`;
    return <div className="overflow-x-auto p-4">
      <p className="mb-3 text-xs text-white/65">{variant === 'reference' ? 'Locked shell capture' : 'Development header'} · {width} × {height}</p>
      <iframe title={`${source} ${device} ${variant}`} src={src} width={width} height={height}
        className="block max-w-none rounded-xl border border-white/20 bg-black" style={{ width, boxSizing: 'content-box' }} />
      <a className="mt-3 inline-block text-sm text-cyan-200 underline" href={src} target="_blank" rel="noreferrer">Open responsive {variant} at browser width</a>
    </div>;
  };
  return <FeatureWorkspace entry={workshopEntries.find(entry => entry.id === 'library-shell')!}
    renderReference={() => render('reference')} renderDevelopment={() => render('development')}
    workshopControls={{ description: 'Header family refinement. Locked references remain available for comparison.', sections: [{ id: 'pages', content: <div className="flex flex-wrap gap-4">
      <label className="flex flex-col gap-1 text-xs">Configuration<select className={controls} value={source} onChange={event => { const value = event.target.value as HeaderConfiguration; setSource(value); setState(headerStates[value][0]); }}><option value="main-library">Main Library</option><option value="story-seed">Story Seed</option><option value="cultivator-cave">Cultivator Cave</option></select></label>
      <label className="flex flex-col gap-1 text-xs">Viewport<select className={controls} value={device} onChange={event => setDevice(event.target.value as keyof typeof devices)}><option value="phone">Phone · 390 × 844</option><option value="tablet">Tablet · 768 × 1024</option><option value="desktop">Desktop · 1440 × 900</option></select></label>
      <label className="flex flex-col gap-1 text-xs">Mock state<select className={controls} value={state} onChange={event => setState(event.target.value)}>{headerStates[source].map(value => <option key={value}>{value}</option>)}</select></label>
    </div> }] }} />;
}
