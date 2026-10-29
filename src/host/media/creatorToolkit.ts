import { STORY_STYLE_OPTIONS } from '@seihouse/sen/story-seed';
import type { CreatorToolkitItem } from '@seihouse/library/creator-space';
import { TRACK_LIBRARY } from './soundscapeCatalog';

const styles = STORY_STYLE_OPTIONS.map(option => option.label);

/** Previews of real first-party systems; the pack browser itself is not built. */
export const CREATOR_TOOLKIT: readonly CreatorToolkitItem[] = [
  { id: 'style-packs', kind: 'style', title: 'Style Packs',
    description: `${styles.slice(0, -1).join(', ')} and ${styles.at(-1)} writing styles.`,
    imageUrl: '/manifest-backdrops/immortal-land-2.jpg' },
  { id: 'soundscapes', kind: 'soundscape', title: 'Soundscapes',
    description: `${TRACK_LIBRARY.length} ambient scores for your scenes.`,
    imageUrl: '/manifest-backdrops/immortal-land-4.jpg' },
];
