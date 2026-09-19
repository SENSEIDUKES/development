import { createRoot as createDomRoot, type Root, type RootOptions } from 'react-dom/client';
import { LibraryAssetsProvider } from '@seihouse/library/presentation';
import { LIBRARY_ASSETS } from '../host/media/libraryAssets';

/** Explicit host assets for tests; published screens never assume DEV paths. */
export function createRoot(container: Element | DocumentFragment, options?: RootOptions): Root {
  const root = createDomRoot(container, options);
  return { unmount: () => root.unmount(), render: children => root.render(<LibraryAssetsProvider value={LIBRARY_ASSETS}>{children}</LibraryAssetsProvider>) };
}
