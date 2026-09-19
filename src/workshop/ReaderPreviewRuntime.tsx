import { useMemo, type PropsWithChildren } from 'react';
import { makeWorkshopManifestation } from './readerImageFixtures';
import { ReaderRuntimeProvider, type ReaderRuntime } from '@seihouse/sen/reader-runtime';
import { readerPreviewStore, setMockState, useAppStore } from '../components/reader-chamber/shared/stubs';
import { useReaderPlayback } from '../components/reader-chamber/shared/readerPlayback';
import { extractWorkshopGlossaryTerms } from '../components/reader-codex/shared/workshopGlossary';
import { TRACK_LIBRARY } from '../host/media/soundscapeCatalog';
import { requestCodexVoice } from '../host/reader/codexVoice';
import { DEFAULT_CULTIVATION_GLOSSARY } from '../host/reader/cultivationGlossary';
import { ReaderTranslationController, ReaderTranslationRuntimeProvider } from '@seihouse/sen/translation';
import { ReaderTranslationHttpProvider } from '../host/reader/translationHttp';
import { WebReaderTranslationRepository, READER_TRANSLATION_STORAGE_KEY } from '../host/reader/translationStorage';

const runtime: ReaderRuntime = {
  store: readerPreviewStore,
  useNarration: useReaderPlayback,
  tracks: TRACK_LIBRARY.map(track => ({ ...track, group: track.url.split('/AUDIO/')[1]?.split('/')[0] || 'OTHER' })),
  requestVoice: requestCodexVoice,
  manifestImages: async ({ id, name, type, description }) => ({
    urls: [0, 1, 2].map(variant => makeWorkshopManifestation(id, name, type, variant)),
    prompt: `${type} manifestation for ${name}: ${description ?? ''}`,
  }),
  defaultGlossary: DEFAULT_CULTIVATION_GLOSSARY,
  preferences: {
    read: key => { try { return localStorage.getItem(`workshop.reader.${key}`); } catch { return null; } },
    write: (key, value) => { try { localStorage.setItem(`workshop.reader.${key}`, value); } catch { /* advisory */ } },
    remove: key => { try { localStorage.removeItem(`workshop.reader.${key}`); } catch { /* advisory */ } },
  },
  setAudioChannel(channel, value) {
    const { audioMix } = useAppStore.getState();
    setMockState({ audioMix: { ...audioMix, [channel]: { ...audioMix[channel], ...value } } });
  },
  canGenerate: () => true,
  canManifest: () => true,
  extractGlossary: input => extractWorkshopGlossaryTerms({ ...input, routingConfig: undefined }),
};

/** Explicit preview adapter. Published Reader/Codex never import this module. */
export function ReaderPreviewRuntime({ children }: PropsWithChildren) {
  const controller = useMemo(() => new ReaderTranslationController({
    repository: new WebReaderTranslationRepository(typeof window === 'undefined' ? null : window.localStorage, READER_TRANSLATION_STORAGE_KEY),
    provider: new ReaderTranslationHttpProvider(),
  }), []);
  return <ReaderRuntimeProvider value={runtime}><ReaderTranslationRuntimeProvider controller={controller}>{children}</ReaderTranslationRuntimeProvider></ReaderRuntimeProvider>;
}
