import type { CSSProperties, ReactNode, HTMLAttributes } from 'react';
import { ManifestButton } from '@seihouse/library-ui';

/** Stable material identities describe appearance, never a page or component. */
export const LIBRARY_MATERIALS = [
  { id: 'violet-shell', name: 'Midnight violet', usage: 'Header, navigation frame and plain footer' },
  { id: 'violet-panel', name: 'Violet glass', usage: 'Outer panels and grouped controls' },
  { id: 'violet-card', name: 'Violet inset', usage: 'Nested panels and empty states' },
  { id: 'black-control', name: 'Obsidian', usage: 'Black control faces and companion sheets' },
  { id: 'rainbow-action', name: 'Spectrum action', usage: 'Black action face with the animated rainbow ring' },
  { id: 'reader', name: 'Reader blue', usage: 'Reader Chamber panels, Codex and settings' },
] as const;
/** Prior paints retain their original identities for saved Workshop looks. */
export const ARCHIVED_LIBRARY_MATERIALS = [
  { id: 'blue-glass', name: 'Tidal glass', usage: 'Previous blue outer panels' },
  { id: 'smoked-glass', name: 'Smoked glass', usage: 'Previous black nested panels' },
] as const;
export type LibraryMaterialId = typeof LIBRARY_MATERIALS[number]['id'] | typeof ARCHIVED_LIBRARY_MATERIALS[number]['id'];

/** Surface only: layout and behavior remain with the consuming component. */
export function LibraryMaterialSurface({ material, children, className = '', style, disabled = false, ...attributes }: {
  material: LibraryMaterialId; children?: ReactNode; className?: string; style?: CSSProperties; disabled?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, 'children' | 'style'>) {
  const props = { ...attributes, 'data-library-material': material, style,
    className: `library-material-scope ${className}` };
  if (material === 'rainbow-action') return <ManifestButton {...props} type="button" disabled={disabled}>{children}</ManifestButton>;
  return <div {...props} className={`${props.className} library-material-surface ${material === 'reader' ? 'reader-glass reader-glass-panel' : 'reader-border-glow'}`}>{children}</div>;
}
