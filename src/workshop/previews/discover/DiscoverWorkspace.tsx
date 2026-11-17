import { useState } from 'react';
import { DiscoverPreview } from './DiscoverPreview';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';

/** The sizes Discover is judged at. Mobile leads, as on Home. */
const viewports = {
  mobile: { label: 'Mobile', width: 390, height: 844 },
  tablet: { label: 'Tablet', width: 768, height: 1024 },
  laptop: { label: 'Laptop', width: 1440, height: 900 },
} as const;
type Viewport = keyof typeof viewports;

/** Development shares the app's Discover page and shell, with Workshop-only sample data. */
const SRC = '/?preview=discover&canvas=1&page=discover';

export function DiscoverWorkspace() {
  const [viewport, setViewport] = useState<Viewport>('mobile');
  if (new URLSearchParams(window.location.search).get('canvas') === '1') return <DiscoverPreview />;
  const { label, width, height } = viewports[viewport];
  const title = `Discover ${viewport}`;
  const caption = `${label} · ${width} × ${height}`;

  // Same framing as Home: on a phone the Mobile frame is the viewport itself.
  const render = () => viewport === 'mobile'
    ? <div className="sm:p-4">
        <p className="mb-3 hidden text-xs text-white/65 sm:block">{caption}</p>
        <iframe title={title} src={SRC}
          className="block h-[100dvh] w-full border-0 sm:mx-auto sm:h-[844px] sm:w-[390px] sm:rounded-xl sm:border sm:border-white/20 sm:bg-black" />
        <a className="inline-flex min-h-11 items-center px-4 text-cyan-200 underline sm:px-0" href={SRC} target="_blank" rel="noreferrer">Open Discover in its own tab</a>
      </div>
    : <div className="overflow-x-auto p-4">
        <p className="mb-3 text-xs text-white/65">{caption}</p>
        <iframe title={title} src={SRC} width={width} height={height}
          className="block max-w-none rounded-xl border border-white/20 bg-black" style={{ width, boxSizing: 'content-box' }} />
        <a className="mt-3 inline-flex min-h-11 items-center text-cyan-200 underline" href={SRC} target="_blank" rel="noreferrer">Open Discover in its own tab</a>
      </div>;

  return <FeatureWorkspace entry={workshopEntries.find(entry => entry.id === 'discover')!}
    renderDevelopment={render}
    workshopControls={{
      description: 'Development shares the app’s Discover page and shell: Stories, Creators, Codex and Lore with a left browsing rail and genre filter beside the feed controls. Events appear under Rankings. Sample stories, creators, Codex entries, follows and rankings exist only in Workshop. This preview reads the app’s saved profile preferences; sample worlds stay isolated, and navigation outside Discover opens the real app.',
      defaultSection: 'pages',
      sections: [{
        id: 'pages',
        content: <label className="flex flex-col gap-1 text-xs">Viewport
          <select className="min-h-11 rounded-lg border border-white/20 bg-black/30 p-2 text-sm text-white"
            value={viewport} onChange={event => setViewport(event.target.value as Viewport)}>
            {Object.entries(viewports).map(([value, size]) => (
              <option key={value} value={value}>{size.label} · {size.width} × {size.height}</option>
            ))}
          </select>
        </label>,
      }],
    }} />;
}
