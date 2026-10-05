import React from 'react';
import ReactDOM from 'react-dom/client';
import '../host/styles/theme.css';
import '@seihouse/sen/styles.css';
import { createHostReaderMixer } from '../host/reader/readerMixer';
import { NovelExpandedApp } from './NovelExpandedApp';
import { createNovelExpandedServices } from './services';

const services = createNovelExpandedServices();
// One mixer for the page's lifetime, saved with the reader's other device preferences.
const readerMixer = createHostReaderMixer(services.readerPreferences);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NovelExpandedApp services={services} readerMixer={readerMixer} />
  </React.StrictMode>,
);
