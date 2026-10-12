// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReaderMixerProvider, type ReaderMixer } from '@seihouse/audio-player';
import { DEFAULT_SOUNDTRACK_CHOICE } from '@seihouse/sen/reader-runtime';
import type { SceneAtmosphere } from '@seihouse/sen/audio';
import { createHostReaderMixer } from '../../../host/reader/readerMixer';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { installAudioMediaStubs } from '../../../test-utils/renderWithDevAudio';
import { useReaderSoundtrack } from './useReaderSoundtrack';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const memory = () => {
  const values = new Map<string, string>();
  return { read: (key: string) => values.get(key) ?? null, write: (key: string, value: string) => { values.set(key, value); }, remove: (key: string) => { values.delete(key); } };
};

/** A story's own Atmosphere pack, equipped in its Atmospheres slot. */
const SHRINE: SceneAtmosphere[] = [
  { id: 'shrine:forest-1', word: 'forest', label: 'Shrine Forest', group: 'Forest', url: 'https://media.example.org/shrine/forest-1.mp3' },
  { id: 'shrine:hall', word: 'temple hall', label: 'Temple Hall', group: 'Temple Hall', url: 'https://media.example.org/shrine/hall.mp3' },
];

function Reader({ atmospheres, scene }: { atmospheres: readonly SceneAtmosphere[]; scene?: { atmosphere: string } }) {
  useReaderSoundtrack({
    active: true, chapterId: 'c1', scene, pieces: [], atmospheres, choice: DEFAULT_SOUNDTRACK_CHOICE,
    speaking: false, listenEnded: false, onSleep: () => undefined, chapterEnd: null,
  });
  return null;
}

let host: HTMLDivElement;
let root: Root;
let mixer: ReaderMixer;
beforeEach(() => {
  installAudioMediaStubs();
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  mixer = createHostReaderMixer(memory());
});
afterEach(() => { act(() => root.unmount()); host.remove(); mixer.dispose(); vi.unstubAllGlobals(); });

describe('The story’s atmospheres in the Reader', () => {
  it('are the mixer’s whole choice while the Reader is open, and the host’s come back when it closes', async () => {
    const hosts = mixer.getAtmosphereOptions().map(option => option.id);
    await act(async () => root.render(<ReaderMixerProvider mixer={mixer}><Reader atmospheres={SHRINE} scene={{ atmosphere: 'shrine:hall' }} /></ReaderMixerProvider>));
    expect(mixer.getAtmosphereOptions().map(option => option.id)).toEqual(['shrine:forest-1', 'shrine:hall']);
    expect(mixer.getPreferences().atmosphereId).toBe('shrine:hall');
    await act(async () => root.render(<ReaderMixerProvider mixer={mixer}>{null}</ReaderMixerProvider>));
    expect(mixer.getAtmosphereOptions().map(option => option.id)).toEqual(hosts);
  });

  it('leave the host’s beds untouched for a story on the Library’s own atmospheres, and for beds frozen without a file', async () => {
    const swap = vi.spyOn(mixer, 'setAtmosphereOptions');
    await act(async () => root.render(<ReaderMixerProvider mixer={mixer}><Reader atmospheres={LIBRARY_BASE_MEDIA.atmospheres!} /></ReaderMixerProvider>));
    await act(async () => root.render(<ReaderMixerProvider mixer={mixer}><Reader atmospheres={SHRINE.map(({ url: _url, ...bed }) => bed)} /></ReaderMixerProvider>));
    expect(swap).not.toHaveBeenCalled();
  });
});
