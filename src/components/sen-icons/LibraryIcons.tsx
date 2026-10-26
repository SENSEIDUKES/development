import { HighlightActionIcon, type HighlightActionIconProps } from '@seihouse/sen';
import remoteIcons from './r2-icons.json';

export type LibraryGlyphProps = Omit<HighlightActionIconProps, 'name'>;

// Named semantic adapters share the original artwork; no duplicate SVG geometry.
export function LibraryEditIcon(props: LibraryGlyphProps) { return <HighlightActionIcon {...props} name="edit" />; }
export function LibraryCopyIcon(props: LibraryGlyphProps) { return <HighlightActionIcon {...props} name="copy" />; }
export function LibraryMediaIcon(props: LibraryGlyphProps) { return <HighlightActionIcon {...props} name="media" />; }
export function LibraryRemoveIcon(props: LibraryGlyphProps) { return <HighlightActionIcon {...props} name="remove" />; }
export function LibraryBackIcon(props: LibraryGlyphProps) { return <HighlightActionIcon {...props} name="back" />; }
export function LibraryAudioIcon(props: LibraryGlyphProps) { return <HighlightActionIcon {...props} name="audio" />; }
export function LibraryCueIcon(props: LibraryGlyphProps) { return <HighlightActionIcon {...props} name="cue" />; }
export function LibrarySoundscapeIcon(props: LibraryGlyphProps) { return <HighlightActionIcon {...props} name="soundscape" />; }
export function LibraryAtmosphereIcon(props: LibraryGlyphProps) { return <HighlightActionIcon {...props} name="atmosphere" />; }
export function LibrarySaveIcon(props: LibraryGlyphProps) { return <HighlightActionIcon {...props} name="save" />; }
export function LibraryUndoIcon(props: LibraryGlyphProps) { return <HighlightActionIcon {...props} name="undo" />; }
export function LibraryDeleteIcon(props: LibraryGlyphProps) { return <HighlightActionIcon {...props} name="delete" />; }

/** One catalog for remote artwork and bundled semantic icons. */
export const LIBRARY_ICON_CATALOG = [
  ...remoteIcons.map(icon => ({ ...icon, source: 'remote' as const,
    group: icon.key.includes('/Basic/') ? 'Basic' as const : 'Special' as const,
    label: icon.file.replace(/\.svg$/, ''),
  })),
  { source: 'bundled' as const, key: 'bundled/edit', group: 'Basic' as const, label: 'Edit', exportName: 'LibraryEditIcon', Icon: LibraryEditIcon },
  { source: 'bundled' as const, key: 'bundled/copy', group: 'Basic' as const, label: 'Copy', exportName: 'LibraryCopyIcon', Icon: LibraryCopyIcon },
  { source: 'bundled' as const, key: 'bundled/media', group: 'Special' as const, label: 'Media', exportName: 'LibraryMediaIcon', Icon: LibraryMediaIcon },
  { source: 'bundled' as const, key: 'bundled/remove', group: 'Basic' as const, label: 'Remove', exportName: 'LibraryRemoveIcon', Icon: LibraryRemoveIcon },
  { source: 'bundled' as const, key: 'bundled/back', group: 'Basic' as const, label: 'Back', exportName: 'LibraryBackIcon', Icon: LibraryBackIcon },
  { source: 'bundled' as const, key: 'bundled/audio', group: 'Special' as const, label: 'Audio', exportName: 'LibraryAudioIcon', Icon: LibraryAudioIcon },
  { source: 'bundled' as const, key: 'bundled/cue', group: 'Special' as const, label: 'Cue', exportName: 'LibraryCueIcon', Icon: LibraryCueIcon },
  { source: 'bundled' as const, key: 'bundled/soundscape', group: 'Special' as const, label: 'Soundscape', exportName: 'LibrarySoundscapeIcon', Icon: LibrarySoundscapeIcon },
  { source: 'bundled' as const, key: 'bundled/atmosphere', group: 'Special' as const, label: 'Atmosphere', exportName: 'LibraryAtmosphereIcon', Icon: LibraryAtmosphereIcon },
  { source: 'bundled' as const, key: 'bundled/save', group: 'Basic' as const, label: 'Save', exportName: 'LibrarySaveIcon', Icon: LibrarySaveIcon },
  { source: 'bundled' as const, key: 'bundled/undo', group: 'Basic' as const, label: 'Undo', exportName: 'LibraryUndoIcon', Icon: LibraryUndoIcon },
  { source: 'bundled' as const, key: 'bundled/delete', group: 'Basic' as const, label: 'Delete', exportName: 'LibraryDeleteIcon', Icon: LibraryDeleteIcon },
] as const;
