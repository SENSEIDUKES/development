import { useEffect, useState } from 'react';
import { IndexedDbHarnessGenerationRepository } from '../../../host/generation/indexedDbRepository';
import { routeSearch } from '../../../novel-expanded/routes';
import { NOVEL_EXPANDED_STORAGE } from '../../../novel-expanded/services';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';

/** The sizes the World Space is judged at. Mobile leads because creators start on a phone. */
const viewports = {
  mobile: { label: 'Mobile', width: 390, height: 844 },
  tablet: { label: 'Tablet', width: 768, height: 1024 },
  laptop: { label: 'Laptop', width: 1280, height: 800 },
} as const;
type Viewport = keyof typeof viewports;

type WorldChoice = { id: string; title: string };
type WorldsRead = { status: 'loading' } | { status: 'ready'; worlds: readonly WorldChoice[] } | { status: 'error'; error: string };

/** Read only: the app's own stories in this browser, the most recently changed first. Nothing is saved or upgraded. */
async function readAppWorlds(): Promise<WorldChoice[]> {
  if (typeof indexedDB === 'undefined') throw new Error('This browser has no local story storage, so the app’s worlds cannot be read here.');
  const state = await new IndexedDbHarnessGenerationRepository(NOVEL_EXPANDED_STORAGE.stories).peek();
  return [...state.stories].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(story => ({ id: story.id, title: story.title }));
}

/**
 * The World Space in the Workshop: the app's own page (`/app/?page=create&world=<id>`)
 * in a frame, on one of this browser's real worlds. Everything in the frame is the
 * live app: tagging, voicing, Publish and Export act on the real story.
 */
export function WorldSpaceWorkspace() {
  const [viewport, setViewport] = useState<Viewport>('mobile');
  const [read, setRead] = useState<WorldsRead>({ status: 'loading' });
  const [chosenId, setChosenId] = useState<string>();
  useEffect(() => {
    let current = true;
    const reread = () => readAppWorlds().then(
      worlds => { if (current) setRead({ status: 'ready', worlds }); },
      (error: unknown) => { if (current) setRead({ status: 'error', error: error instanceof Error ? error.message : 'This browser’s story storage could not be read.' }); },
    );
    void reread();
    // A world created in another tab (the empty state's link) shows up on returning here; the chosen world stays chosen.
    window.addEventListener('focus', reread);
    return () => { current = false; window.removeEventListener('focus', reread); };
  }, []);
  const worlds = read.status === 'ready' ? read.worlds : [];
  const world = worlds.find(entry => entry.id === chosenId) ?? worlds[0];
  const { label, width, height } = viewports[viewport];
  const title = `World Space ${viewport}`;
  const caption = `${label} · ${width} × ${height}`;

  const render = () => {
    if (read.status === 'loading') return <p role="status" className="p-4 text-sm text-white/65">Reading this browser’s worlds…</p>;
    if (read.status === 'error') return <p role="alert" className="p-4 text-sm text-amber-200">{read.error}</p>;
    // The World Space always opens on one world; without one there is nothing to show yet.
    if (!world) return <div className="p-4 text-sm text-white/75">
      <p>This browser has no worlds yet. The World Space opens on one of your worlds, so start one first.</p>
      <a className="mt-2 inline-flex min-h-11 items-center text-cyan-200 underline" href="/app/?page=create" target="_blank" rel="noreferrer">Open the Creator Space to create a world</a>
    </div>;
    const src = `/app/${routeSearch({ page: 'world', storyId: world.id })}`;
    // Same framing as Home and Create: on a phone the Mobile frame is the viewport itself.
    return viewport === 'mobile'
      ? <div className="sm:p-4">
          <p className="mb-3 hidden text-xs text-white/65 sm:block">{caption}</p>
          <iframe key={src} title={title} src={src}
            className="block h-[100dvh] w-full border-0 sm:mx-auto sm:h-[844px] sm:w-[390px] sm:rounded-xl sm:border sm:border-white/20 sm:bg-black" />
          <a className="inline-flex min-h-11 items-center px-4 text-cyan-200 underline sm:px-0" href={src} target="_blank" rel="noreferrer">Open the World Space in its own tab</a>
        </div>
      : <div className="overflow-x-auto p-4">
          <p className="mb-3 text-xs text-white/65">{caption}</p>
          <iframe key={src} title={title} src={src} width={width} height={height}
            className="block max-w-none rounded-xl border border-white/20 bg-black" style={{ width, boxSizing: 'content-box' }} />
          <a className="mt-3 inline-flex min-h-11 items-center text-cyan-200 underline" href={src} target="_blank" rel="noreferrer">Open the World Space in its own tab</a>
        </div>;
  };

  return <FeatureWorkspace entry={workshopEntries.find(entry => entry.id === 'world-space')!}
    renderDevelopment={render}
    workshopControls={{
      description: 'The World Space is the app’s own page, loaded live: this browser’s real worlds, storage and actions, inside the real Library shell. Tagging, voicing, Publish and Export here change the real story.',
      defaultSection: 'pages',
      sections: [{
        id: 'pages',
        description: 'Choose which of this browser’s worlds the World Space opens on. In the app, a world’s card or its Edit button in the Creator Space opens it.',
        content: <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs">World
            <select className="min-h-11 rounded-lg border border-white/20 bg-black/30 p-2 text-sm text-white"
              value={world?.id ?? ''} disabled={!worlds.length} onChange={event => setChosenId(event.target.value)}>
              {!worlds.length && <option value="">No worlds in this browser</option>}
              {worlds.map(entry => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
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
