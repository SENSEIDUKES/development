import React from 'react';
import ReactDOM from 'react-dom/client';
import '../host/styles/theme.css';
import '@seihouse/sen/styles.css';
import { NovelExpandedApp } from './NovelExpandedApp';
import { createNovelExpandedServices } from './services';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NovelExpandedApp services={createNovelExpandedServices()} />
  </React.StrictMode>,
);
