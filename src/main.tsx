import { LIBRARY_ASSETS } from './host/media/libraryAssets';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ReaderMixerProvider } from '@seihouse/audio-player';
import { DevAudioPlaybackProvider } from './audio/DevAudioPlayback';
import { createLocalReaderPreferenceStorage } from './host/reader/readerPreferenceStorage';
import { createHostReaderMixer } from './host/reader/readerMixer';
import { ReaderPreviewRuntime } from './workshop/ReaderPreviewRuntime';
import { StoryCreationPreviewRuntime } from './workshop/StoryCreationPreviewRuntime';
import { MANIFEST_BACKDROPS } from './host/reader/manifestBackdrops';

// The Workshop's reader mixer: the same audio owner the app uses, with the
// Workshop's own saved mix. Older previews keep their single-channel player.
const readerMixer = createHostReaderMixer(createLocalReaderPreferenceStorage('workshop.reader.'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReaderMixerProvider mixer={readerMixer}>
      <DevAudioPlaybackProvider>
        <ReaderPreviewRuntime><StoryCreationPreviewRuntime><LibraryPresentationProvider assets={LIBRARY_ASSETS} backdrops={MANIFEST_BACKDROPS}><App /></LibraryPresentationProvider></StoryCreationPreviewRuntime></ReaderPreviewRuntime>
      </DevAudioPlaybackProvider>
    </ReaderMixerProvider>
  </React.StrictMode>,
);
