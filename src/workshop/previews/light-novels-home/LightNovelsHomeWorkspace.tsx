import { useState } from 'react';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';

/** The sizes Home is judged at. Mobile leads because Home is read on a phone first. */
const viewports = {
  mobile: { label: 'Mobile', width: 390, height: 844 },
  tablet: { label: 'Tablet', width: 768, height: 1024 },
  laptop: { label: 'Laptop', width: 1440, height: 900 },
} as const;
type Viewport = keyof typeof viewports;

export function LightNovelsHomeWorkspace() {
  const [viewport, setViewport] = useState<Viewport>('mobile');
  const { label, width, height } = viewports[viewport];

  const render = (reference: boolean) => {
    const src = `/library-shell.html?variant=development&source=main-library&screen=home&collection=featured${reference ? '&homeReference=1' : ''}`;
    const title = `Light Novels Home ${reference ? 'reference' : 'development'} ${viewport}`;
    const caption = `${label} · ${width} × ${height}`;

    // Home is a separate document, so it lays out against the iframe's own box
    // rather than the browser window: every pixel of padding or border here is a
    // pixel Home does not get, and its breakpoints answer to the frame instead of
    // the device. So on a phone the Mobile frame *is* the viewport — full width,
    // full height, no border — and Home renders at the width it is being judged
    // on, with its fixed bottom navigation where the real app puts it. From the
    // small breakpoint up the window is already wider than a phone, so Mobile
    // becomes a true 390px frame instead.
    if (viewport === 'mobile') {
      return <div className="sm:p-4">
        <p className="mb-3 hidden text-xs text-white/65 sm:block">{caption}</p>
        <iframe title={title} src={src}
          className="block h-[100dvh] w-full border-0 sm:mx-auto sm:h-[844px] sm:w-[390px] sm:rounded-xl sm:border sm:border-white/20 sm:bg-black" />
        <a className="inline-flex min-h-11 items-center px-4 text-cyan-200 underline sm:px-0"
          href={src} target="_blank" rel="noreferrer">Open Home in its own tab</a>
      </div>;
    }

    // Tablet and Laptop are deliberately wider than the phone showing them, so the
    // frame keeps its real width and the container scrolls sideways to reach it.
    return <div className="overflow-x-auto p-4">
      <p className="mb-3 text-xs text-white/65">{caption}</p>
      <iframe title={title} src={src} width={width} height={height}
        className="block max-w-none rounded-xl border border-white/20 bg-black"
        style={{ width, boxSizing: 'content-box' }} />
      <a className="mt-3 inline-flex min-h-11 items-center text-cyan-200 underline"
        href={src} target="_blank" rel="noreferrer">Open Home in its own tab</a>
    </div>;
  };

  return <FeatureWorkspace entry={workshopEntries.find(entry => entry.id === 'light-novels-home')!}
    renderReference={() => render(true)} renderDevelopment={() => render(false)}
    workshopControls={{
      description: 'Home is previewed at the size it is being judged at. Mobile fills a phone edge to edge, so what you see is the real device width rather than a frame inside one.',
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
