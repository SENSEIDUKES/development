import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLibraryBottomClearance } from '@seihouse/library/shell';
import { createHostReaderMixer } from '../../../host/reader/readerMixer';
import { playDeviceMediaThrough } from '../../../host/media/deviceMediaPacks';
import { NovelExpandedApp } from '../../../novel-expanded/NovelExpandedApp';
import { createNovelExpandedServices } from '../../../novel-expanded/services';
import { routeSearch, type NovelExpandedRoute } from '../../../novel-expanded/routes';
import {
  DISCOVER_RANKING_BOARDS, DISCOVER_SAMPLE_FATE_SURVIVAL, DISCOVER_SAMPLE_RELEASES,
  DISCOVER_SAMPLE_TRACKED, DISCOVER_SAMPLE_WORLDS, DISCOVER_SAMPLE_CREATORS,
  DISCOVER_SAMPLE_CODEX, DISCOVER_SAMPLE_FOLLOWED_CREATORS, DISCOVER_SAMPLE_TRACKED_CODEX,
} from './previewData';

const hrefFor = (route: NovelExpandedRoute) =>
  `/?preview=discover&canvas=1${routeSearch(route).replace('?', '&')}`;

/** The full app host, with only the catalogue and its sample-opening feedback injected. */
export function DiscoverPreview() {
  const [services] = useState(createNovelExpandedServices);
  const [readerMixer] = useState(() => playDeviceMediaThrough(createHostReaderMixer(services.readerPreferences), services.deviceMedia));
  const [opened, setOpened] = useState<{ title: string; at: number }>();
  const clearance = useLibraryBottomClearance();
  useEffect(() => {
    if (!opened) return;
    const timer = setTimeout(() => setOpened(undefined), 4000);
    return () => clearTimeout(timer);
  }, [opened]);
  return <>
    <NovelExpandedApp services={services} readerMixer={readerMixer} hrefFor={hrefFor}
      discoverCatalogue={{
        worlds: DISCOVER_SAMPLE_WORLDS, releases: DISCOVER_SAMPLE_RELEASES,
        trackedWorldIds: DISCOVER_SAMPLE_TRACKED, fateSurvivalWorldIds: DISCOVER_SAMPLE_FATE_SURVIVAL,
        creators: DISCOVER_SAMPLE_CREATORS, codexEntries: DISCOVER_SAMPLE_CODEX,
        followedCreatorIds: DISCOVER_SAMPLE_FOLLOWED_CREATORS, trackedCodexIds: DISCOVER_SAMPLE_TRACKED_CODEX,
        rankingBoards: DISCOVER_RANKING_BOARDS,
        onOpenWorld: id => {
          const world = DISCOVER_SAMPLE_WORLDS.find(world => world.id === id);
          if (world) setOpened({ title: world.title, at: Date.now() });
        },
        notice: <details className="discover-sample-notice">
          <summary>Sample catalogue</summary>
          <p>Explore sample stories, creators and Codex entries. Rankings and follows are examples.</p>
        </details>,
      }} />
    {opened && createPortal(<p role="status" data-testid="discover-sample-note"
      className="pointer-events-none fixed left-1/2 z-50 w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl bg-[#14161c]/95 px-4 py-3 text-center font-serif text-sm text-[#f3eee7] shadow-lg shadow-black/50 ring-1 ring-white/10"
      style={{ bottom: clearance + 16 }}>
      “{opened.title}” is a sample world. Real worlds will open straight into their World Info and Reader.
    </p>, document.body)}
  </>;
}
