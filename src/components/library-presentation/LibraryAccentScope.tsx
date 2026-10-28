import type { CSSProperties, ReactNode } from 'react';
import { normalizeAccentColor } from '../user-profile/development/accentColor';

/** A reader preference for interface highlights, independent of artwork and identity. */
export function LibraryAccentScope({ color, children }: { color?: string; children: ReactNode }) {
  const accent = normalizeAccentColor(color);
  // Keep the element stable while picking/resetting: changing the wrapper shape
  // would remount the app and discard open settings and unfinished edits.
  return <div className={accent ? 'library-accent-scope library-custom-accent' : 'library-accent-scope'}
    style={{ display: 'contents', '--library-accent': accent } as CSSProperties}>{children}</div>;
}
