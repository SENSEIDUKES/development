import React from 'react';
import ReactDOM from 'react-dom/client';
import '../host/styles/theme.css';
import '@seihouse/sen/styles.css';
import { createHostReaderMixer } from '../host/reader/readerMixer';
import { NovelExpandedApp } from './NovelExpandedApp';
import { createNovelExpandedServices } from './services';

// The app is a Library host: its sheets and menus open on the body, so the
// body takes the Library's gold scrollbar too.
document.body.classList.add('library-scrollbars');
const services = createNovelExpandedServices();
// One mixer for the page's lifetime, saved with the reader's other device preferences.
const readerMixer = createHostReaderMixer(services.readerPreferences);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NovelExpandedApp services={services} readerMixer={readerMixer} />
  </React.StrictMode>,
);
