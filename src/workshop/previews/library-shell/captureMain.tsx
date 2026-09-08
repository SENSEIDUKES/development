import { createRoot } from 'react-dom/client';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { shellStates, type ShellSource } from './previewData';

const query = new URLSearchParams(window.location.search);
const source: ShellSource = query.get('source') === 'story-seed' ? 'story-seed' : 'main-library';
const requested = query.get('state') ?? '';
const state = (shellStates[source] as readonly string[]).includes(requested) ? requested : shellStates[source][0];
async function mount() {
  // Separate documents preserve each source's CSS, portal target and media queries.
  const root = createRoot(document.getElementById('root')!);
  if (source === 'main-library') {
    await import('../../../components/library-shell/reference/main-library/source-theme.css');
    const { MainLibraryPreview } = await import('./MainLibraryPreview');
    root.render(<MainLibraryPreview state={state} />);
  } else {
    await import('../../../styles.css');
    const { StorySeedPreview } = await import('./StorySeedPreview');
    root.render(<LibraryPresentationProvider><StorySeedPreview state={state} /></LibraryPresentationProvider>);
  }
}
void mount();
