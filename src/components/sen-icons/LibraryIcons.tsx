import { FatePressureIcon } from '../story-seed/development/FatePressureIcon';
import { FateSurvivalIcon } from '../story-seed/development/FateSurvivalIcon';
import { GenreIcon } from '../story-seed/development/GenreIcon';
import { LibraryDaoInsightIcon } from './LibraryDaoInsightIcon';
import { HighlightActionIcon, type HighlightActionIconProps } from '@seihouse/sen';
import remoteIcons from './r2-icons.json';

const originUrl = new URL('./assets/SENOrigin.svg', import.meta.url).href;
const informationUrl = new URL('./assets/SENInformation.svg', import.meta.url).href;
const settingsV2Url = new URL('./assets/SENSettingsv2.svg', import.meta.url).href;
const manifestUrl = new URL('./assets/SENManifesting.svg', import.meta.url).href;
const helpV2Url = new URL('./assets/SENHelpv2.svg', import.meta.url).href;
const searchV2Url = new URL('./assets/SENSearchv2.svg', import.meta.url).href;

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

export function LibraryMortalPressureIcon(props: LibraryGlyphProps) { return <FatePressureIcon {...props} level="mortal" />; }
export function LibraryImmortalPressureIcon(props: LibraryGlyphProps) { return <FatePressureIcon {...props} level="immortal" />; }
export function LibraryHeavenPressureIcon(props: LibraryGlyphProps) { return <FatePressureIcon {...props} level="heaven" />; }
export function LibrarySurvivalIcon(props: LibraryGlyphProps) { return <FateSurvivalIcon {...props} />; }
export function LibraryGenreIcon(props: LibraryGlyphProps) { return <GenreIcon {...props} />; }

/** One catalog for remote artwork and bundled semantic icons. */
export const LIBRARY_ICON_CATALOG = [
  ...remoteIcons.map(icon => ({ ...icon, source: 'remote' as const,
    ...(icon.file === 'SENManifesting.svg' ? { url: manifestUrl, etag: undefined } : {}),
    ...(icon.file === 'SENHelpv2.svg' ? { url: helpV2Url, etag: undefined } : {}),
    ...(icon.file === 'SENSearchv2.svg' ? { url: searchV2Url, etag: undefined } : {}),
    group: icon.key.includes('/Basic/') ? 'Basic' as const : 'Special' as const,
    label: icon.file.replace(/\.svg$/, ''),
  })),
  { source: 'remote' as const, key: 'local/SENInformation.svg', file: 'SENInformation.svg', group: 'Basic' as const, label: 'Information', url: informationUrl, libraryIcons: [], etag: undefined },
  { source: 'remote' as const, key: 'local/SENSettingsv2.svg', file: 'SENSettingsv2.svg', group: 'Basic' as const, label: 'SENSettingsv2', url: settingsV2Url, libraryIcons: ['header-settings'], etag: undefined },
  { source: 'remote' as const, key: 'local/SENOrigin.svg', file: 'SENOrigin.svg', group: 'Special' as const, label: 'Origin', url: originUrl, libraryIcons: [], etag: undefined },
  { source: 'bundled' as const, key: 'bundled/mortal-pressure', group: 'Special' as const, label: 'Mortal Pressure', exportName: 'LibraryMortalPressureIcon', Icon: LibraryMortalPressureIcon },
  { source: 'bundled' as const, key: 'bundled/immortal-pressure', group: 'Special' as const, label: 'Immortal Pressure', exportName: 'LibraryImmortalPressureIcon', Icon: LibraryImmortalPressureIcon },
  { source: 'bundled' as const, key: 'bundled/heaven-pressure', group: 'Special' as const, label: 'Heaven Pressure', exportName: 'LibraryHeavenPressureIcon', Icon: LibraryHeavenPressureIcon },
  { source: 'bundled' as const, key: 'bundled/survival', group: 'Special' as const, label: 'Survival', exportName: 'LibrarySurvivalIcon', Icon: LibrarySurvivalIcon },
  { source: 'bundled' as const, key: 'bundled/genre', group: 'Special' as const, label: 'Genre', exportName: 'LibraryGenreIcon', Icon: LibraryGenreIcon },
  { source: 'bundled' as const, key: 'bundled/dao-insight', group: 'Special' as const, label: 'Dao Insight', exportName: 'LibraryDaoInsightIcon', Icon: LibraryDaoInsightIcon },
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
