import { useState } from 'react';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import type { CreatorWorldsSource } from './CreatorSpaceHost';

/** The sizes Create is judged at. Mobile leads because creators start on a phone. */
const viewports = {
  mobile: { label: 'Mobile', width: 390, height: 844 },
  tablet: { label: 'Tablet', width: 768, height: 1024 },
  laptop: { label: 'Laptop', width: 1440, height: 900 },
} as const;
type Viewport = keyof typeof viewports;

const WORLD_SOURCES: Record<CreatorWorldsSource, { label: string; description: string }> = {
  sample: { label: 'Sample worlds', description: 'Six Workshop sample worlds with existing art, including a finished story and one without a cover. Continue and Studio say where they would go.' },
  local: { label: 'This browser’s stories', description: 'The worlds written in this browser’s chapter workspace — the same data the real Create tab reads. Continue and Studio open them there.' },
};

function CreatorSpaceReference() {
  return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-neutral-400 sm:px-8">
    Create has no production original. It is built here first as the Library’s Create tab, replacing the bottom-strip Library tab that reopened Home’s My Library collection.
  </div>;
}

export function CreatorSpaceWorkspace() {
  const [viewport, setViewport] = useState<Viewport>('mobile');
  const [source, setSource] = useState<CreatorWorldsSource>('sample');
  const { label, width, height } = viewports[viewport];
  const src = `/library-shell.html?variant=development&source=main-library&screen=creator-space${source === 'sample' ? '&worlds=sample' : ''}`;
  const title = `Creator Space ${viewport}`;
  const caption = `${label} · ${width} × ${height}`;

  // Same framing as Home: on a phone the Mobile frame is the viewport itself,
  // so Create lays out at the width it is judged at with its fixed bottom strip.
  const render = () => viewport === 'mobile'
    ? <div className="sm:p-4">
        <p className="mb-3 hidden text-xs text-white/65 sm:block">{caption}</p>
        <iframe key={src} title={title} src={src}
          className="block h-[100dvh] w-full border-0 sm:mx-auto sm:h-[844px] sm:w-[390px] sm:rounded-xl sm:border sm:border-white/20 sm:bg-black" />
        <a className="inline-flex min-h-11 items-center px-4 text-cyan-200 underline sm:px-0" href={src} target="_blank" rel="noreferrer">Open Create in its own tab</a>
      </div>
    : <div className="overflow-x-auto p-4">
        <p className="mb-3 text-xs text-white/65">{caption}</p>
        <iframe key={src} title={title} src={src} width={width} height={height}
          className="block max-w-none rounded-xl border border-white/20 bg-black" style={{ width, boxSizing: 'content-box' }} />
        <a className="mt-3 inline-flex min-h-11 items-center text-cyan-200 underline" href={src} target="_blank" rel="noreferrer">Open Create in its own tab</a>
      </div>;

  return <FeatureWorkspace entry={workshopEntries.find(entry => entry.id === 'creator-space')!}
    allowCompare={false}
    renderReference={() => <CreatorSpaceReference />} renderDevelopment={render}
    workshopControls={{
      description: 'Create runs inside the real Library shell: the same header, bottom strip, live Energy account and navigation as Home and Profile.',
      defaultSection: 'pages',
      sections: [{
        id: 'pages',
        description: WORLD_SOURCES[source].description,
        content: <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs">Worlds
            <select className="min-h-11 rounded-lg border border-white/20 bg-black/30 p-2 text-sm text-white"
              value={source} onChange={event => setSource(event.target.value as CreatorWorldsSource)}>
              {Object.entries(WORLD_SOURCES).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">Viewport
            <select className="min-h-11 rounded-lg border border-white/20 bg-black/30 p-2 text-sm text-white"
              value={viewport} onChange={event => setViewport(event.target.value as Viewport)}>
              {Object.entries(viewports).map(([value, size]) => <option key={value} value={value}>{size.label} · {size.width} × {size.height}</option>)}
            </select>
          </label>
        </div>,
      }],
    }} />;
}
