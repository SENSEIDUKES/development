import type { ComponentProps } from 'react';
import { LibraryScrubber } from '@seihouse/library-ui';

export type ProgressIndicatorProps = ComponentProps<typeof LibraryScrubber>;

/** The generation journey. Library UI owns the path, traveler and gate artwork. */
export function ProgressIndicator(props: ProgressIndicatorProps) {
  return <LibraryScrubber {...props} />;
}
