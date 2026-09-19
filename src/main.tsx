import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DevAudioPlaybackProvider } from './audio/DevAudioPlayback';
import { ReaderPreviewRuntime } from './workshop/ReaderPreviewRuntime';
import { StoryCreationPreviewRuntime } from './workshop/StoryCreationPreviewRuntime';
import { MANIFEST_BACKDROPS } from './host/reader/manifestBackdrops';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DevAudioPlaybackProvider>
      <ReaderPreviewRuntime><StoryCreationPreviewRuntime><LibraryPresentationProvider backdrops={MANIFEST_BACKDROPS}><App /></LibraryPresentationProvider></StoryCreationPreviewRuntime></ReaderPreviewRuntime>
    </DevAudioPlaybackProvider>
  </React.StrictMode>,
);
