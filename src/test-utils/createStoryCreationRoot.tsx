import type { Root, RootOptions } from 'react-dom/client';
import { createRoot as createDomRoot } from './createLibraryRoot';
import { StoryCreationPreviewRuntime } from '../workshop/StoryCreationPreviewRuntime';

/** Test-owned host injection; Library itself never installs a preview default. */
export function createRoot(container: Element | DocumentFragment, options?: RootOptions): Root {
  const root = createDomRoot(container, options);
  return { unmount: () => root.unmount(), render: children => root.render(<StoryCreationPreviewRuntime>{children}</StoryCreationPreviewRuntime>) };
}
