import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { useLibraryAssets } from '../../library/assets';
import { LibraryAppearanceScope } from './LibraryAppearanceScope';

/** The look's own accent, used until the reader saves one of their own. */
export const LIBRARY_LOOK_ACCENT = '#c9a24a';

/**
 * The Library's applied look (the owner's V2 combination, `look.css`): the
 * violet glass chrome, black controls, gold rims and the dimmed artwork behind
 * every page that wears it. A host wraps each page's shell in it; Profile's
 * Cave and the Reader keep their own presentation. Only the surfaces inside
 * change: layout, behavior and the saved background and accent preferences
 * stay with their owners.
 */
export function LibraryLook({ accentColor, className = '', style, children, ...attributes }: {
  /** The reader's saved accent; absent, the look's gold. */
  accentColor?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'style'>) {
  const { homeImages } = useLibraryAssets();
  const art = homeImages?.[0];
  return <LibraryAppearanceScope color={accentColor ?? LIBRARY_LOOK_ACCENT}>
    <div {...attributes} className={`library-look ${className}`.trim()}
      style={art ? { ...style, '--library-look-art': `url(${JSON.stringify(art)})` } as CSSProperties : style}>
      {children}
    </div>
  </LibraryAppearanceScope>;
}
