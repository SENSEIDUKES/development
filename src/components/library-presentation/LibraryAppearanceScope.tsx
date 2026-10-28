import type { CSSProperties, ReactNode } from 'react';
import { backgroundTintColor, backgroundTintRgb, normalizeBackgroundTint, type BackgroundTint } from './backgroundTint';
import { normalizeAccentColor } from '../user-profile/development/accentColor';

/** Shared appearance scope. Descendant material roles explicitly opt into background tint. */
export function LibraryAppearanceScope({ color, backgroundTint, children }: { color?: string; backgroundTint?: BackgroundTint; children: ReactNode }) {
  const accent = normalizeAccentColor(color);
  const tint = normalizeBackgroundTint(backgroundTint);
  // Keep the element stable while picking/resetting: changing the wrapper shape
  // would remount the app and discard open settings and unfinished edits.
  return <div className={accent ? 'library-appearance-scope library-custom-accent' : 'library-appearance-scope'}
    style={{ display: 'contents', '--library-accent': accent,
      '--library-background-rgb': tint ? backgroundTintRgb(tint) : undefined,
      '--library-background-solid': tint ? backgroundTintColor(tint) : undefined } as CSSProperties}>{children}</div>;
}
