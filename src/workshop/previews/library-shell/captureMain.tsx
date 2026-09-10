import { createRoot } from 'react-dom/client';
import type { ReactNode } from 'react';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { shellStates, type ShellSource } from './previewData';

/**
 * This capture is its own document (`library-shell.html`), not a route inside
 * the Workshop app (`index.html`). Reached through a Workshop iframe that's
 * fine, but "Open responsive … at browser width" (see LightNovelsHomeWorkspace
 * and LibraryShellWorkspace) navigates the whole tab here, and the captured
 * app shell has no Workshop chrome of its own — without this, that's a dead
 * end. Fixed positioning keeps it reachable above the shell's own bottom
 * navigation on every screen and scroll position, and it only renders when
 * this document is the top-level page, so the same capture stays clean when
 * embedded in a Workshop iframe.
 */
function CaptureExitToWorkshop({ children }: { children: ReactNode }) {
  const isTopLevel = (() => {
    try { return window.top === window.self; } catch { return true; }
  })();
  return <>
    {isTopLevel && <a href="/" style={{
      position: 'fixed', top: 'max(12px, env(safe-area-inset-top))', left: 'max(12px, env(safe-area-inset-left))',
      zIndex: 2147483647, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
      borderRadius: 9999, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(15,15,15,0.85)',
      color: '#e5e5e5', font: '500 12px/1 system-ui, sans-serif', textDecoration: 'none', backdropFilter: 'blur(6px)',
    }}>← Back to Workshop</a>}
    {children}
  </>;
}

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
    root.render(<CaptureExitToWorkshop><DevAudioPlaybackProvider><LibraryPresentationProvider><DevelopmentHeaderPreview source={configuration} state={headerState} /></LibraryPresentationProvider></DevAudioPlaybackProvider></CaptureExitToWorkshop>);
  } else if (source === 'main-library') {
    await import('../../../components/library-shell/reference/main-library/source-theme.css');
    const { MainLibraryPreview } = await import('./MainLibraryPreview');
    root.render(<CaptureExitToWorkshop><MainLibraryPreview state={state} /></CaptureExitToWorkshop>);
  } else {
    await import('../../../styles.css');
    const { StorySeedPreview } = await import('./StorySeedPreview');
    root.render(<CaptureExitToWorkshop><LibraryPresentationProvider><StorySeedPreview state={state} /></LibraryPresentationProvider></CaptureExitToWorkshop>);
  }
}
void mount();
