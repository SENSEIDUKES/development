import { useState } from 'react';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { shellStates, type ShellSource } from './previewData';

export function LibraryShellWorkspace() {
  const query = new URLSearchParams(window.location.search);
  const [source, setSource] = useState<ShellSource>(query.get('source') === 'story-seed' ? 'story-seed' : 'main-library');
  const [state, setState] = useState(() => (shellStates[source] as readonly string[]).includes(query.get('state') ?? '') ? query.get('state')! : shellStates[source][0]);
  const [device, setDevice] = useState(query.get('device') === 'desktop' ? 'desktop' : 'phone');
  const src = `/library-shell.html?source=${source}&state=${state}`;
  const controls = 'min-h-11 rounded-lg border border-white/20 bg-black/30 p-2 text-sm text-white';
  const render = () => <div className="overflow-x-auto p-4">
    <p className="mb-3 text-xs text-white/55">Locked {source === 'main-library' ? 'Main Library' : 'Story Seed'} capture · {device === 'phone' ? '390 × 844' : '1440 × 900'} · both comparison panes use the same captured baseline.</p>
    <iframe title={`${source} ${device} locked reference`} src={src} width={device === 'phone' ? 390 : 1440} height={device === 'phone' ? 844 : 900}
      className="block max-w-none border border-white/20 rounded-xl bg-black" style={{ width: device === 'phone' ? 390 : 1440 }} />
    <a className="mt-3 inline-block text-sm text-cyan-200 underline" href={src} target="_blank" rel="noreferrer">Open responsive capture at browser width</a>
  </div>;
  return <FeatureWorkspace entry={workshopEntries.find(entry => entry.id === 'library-shell')!}
    renderReference={render} renderDevelopment={render}
    workshopControls={{ description: 'Frozen sources, local adapters. No redesign or shared shell candidate.', sections: [{ id: 'pages', content: <div className="flex flex-wrap gap-4">
      <label className="flex flex-col gap-1 text-xs">Reference<select className={controls} value={source} onChange={event => { const value = event.target.value as ShellSource; setSource(value); setState(shellStates[value][0]); }}><option value="main-library">Main Library</option><option value="story-seed">Story Seed workspace</option></select></label>
      <label className="flex flex-col gap-1 text-xs">Viewport<select className={controls} value={device} onChange={event => setDevice(event.target.value)}><option value="phone">Phone · 390 × 844</option><option value="desktop">Desktop · 1440 × 900</option></select></label>
      <label className="flex flex-col gap-1 text-xs">Mock state<select className={controls} value={state} onChange={event => setState(event.target.value)}>{shellStates[source].map(value => <option key={value}>{value}</option>)}</select></label>
    </div> }] }} />;
}
