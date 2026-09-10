import { createRoot } from 'react-dom/client';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { shellStates, type ShellSource } from './previewData';

const query = new URLSearchParams(window.location.search);
const source: ShellSource = query.get('source') === 'story-seed' ? 'story-seed' : 'main-library';
const requested = query.get('state') ?? '';
const state = (shellStates[source] as readonly string[]).includes(requested) ? requested : shellStates[source][0];
// Workshop-only environment flags. They set attributes the preview stylesheet
// keys off, so the shell can be inspected under safe-area insets and reduced
// motion inside this frame.
const safeArea = query.get('safeArea');
if (safeArea === 'on' || safeArea === 'landscape') document.documentElement.dataset.previewSafeArea = safeArea;
if (query.get('motion') === 'reduced') document.documentElement.dataset.previewMotion = 'reduced';

async function mount() {
  // Separate documents preserve each source's CSS, portal target and media queries.
  const root = createRoot(document.getElementById('root')!);
  if (query.get('variant') === 'development') {
    await import('../../../styles.css');
    if (source === 'main-library' && query.get('source') !== 'cultivator-cave') await import('../../../components/library-shell/development/header-theme.css');
    else await import('../../../styles.css');
    await import('./preview-environment.css');
    const { DevelopmentHeaderPreview } = await import('./DevelopmentHeaderPreview');
    const { DevAudioPlaybackProvider } = await import('../../../audio/DevAudioPlayback');
    const { headerStates } = await import('./headerPreviewData');
    const configuration = query.get('source') === 'header-states' ? 'header-states' : query.get('source') === 'cultivator-cave' ? 'cultivator-cave' : source;
    const headerState = (headerStates[configuration] as readonly string[]).includes(requested) ? requested : headerStates[configuration][0];
    document.title = 'Library Shell — Development headers';
    root.render(<DevAudioPlaybackProvider><LibraryPresentationProvider><DevelopmentHeaderPreview source={configuration} state={headerState} /></LibraryPresentationProvider></DevAudioPlaybackProvider>);
  } else if (source === 'main-library') {
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
