import type { HarnessStory } from '@seihouse/sen/harness-generation';

/**
 * What Story Settings shows and changes: a story's Story Language, Reading
 * Mode, hand-equipped CAPA skills and Media Loadout. A story has them; so does
 * a story still being created, from what it will start with.
 */
export type StorySettingsValues = Pick<HarnessStory, 'originalLanguage' | 'chapterWritingStyle' | 'skillLoadout' | 'mediaLoadout'>;
