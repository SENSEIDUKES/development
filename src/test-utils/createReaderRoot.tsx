import { LIBRARY_ASSETS } from '../host/media/libraryAssets';
import { createRoot as createDomRoot, type Root, type RootOptions } from 'react-dom/client';
import { ReaderPreviewRuntime } from '../workshop/ReaderPreviewRuntime';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { MANIFEST_BACKDROPS } from '../host/reader/manifestBackdrops';

/** Explicit first-party test assembly, never a default in the published engine. */
export function createRoot(container: Element | DocumentFragment, options?: RootOptions): Root {
  const root = createDomRoot(container, options);
  return { unmount: () => root.unmount(), render: children => root.render(<ReaderPreviewRuntime><LibraryPresentationProvider assets={LIBRARY_ASSETS} backdrops={MANIFEST_BACKDROPS}>{children}</LibraryPresentationProvider></ReaderPreviewRuntime>) };
}
