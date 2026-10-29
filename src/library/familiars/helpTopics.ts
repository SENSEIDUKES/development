import { useMemo } from 'react';
import { useLibraryAssets, type LibraryAssets } from '../assets';
import { DEFAULT_HELP_LANGUAGE, STORY_SEED_HELP_ITEMS, getHelpTranslation } from '../../components/story-seed/development/storySeedHelp';
import type { FamiliarTopic } from './helper';

/** Where a help topic belongs, as the help menu tags it: Home and the Library, Create, the Reader. */
export type FamiliarHelpPlace = 'library' | 'story-seed' | 'reader';

/**
 * The help menu's topics for one place, as the Familiar's Explain topics: the
 * same words and icons, read in the System voice where a line was recorded,
 * and shown in a clip where one exists. One source, so help and the Familiar
 * never say different things.
 */
export function familiarHelpTopics(place: FamiliarHelpPlace, assets: Pick<LibraryAssets, 'helpAudio' | 'helpVideos'>): FamiliarTopic[] {
  return STORY_SEED_HELP_ITEMS.filter(item => item.contexts?.includes(place)).flatMap(item => {
    const line = getHelpTranslation(item, DEFAULT_HELP_LANGUAGE)?.line;
    if (!line) return [];
    const name = item.label.toLocaleLowerCase('en-US');
    return [{
      id: item.id, label: item.label, icon: item.icon,
      phrases: [name, `what is ${name}`, `what's ${name}`, `explain ${name}`],
      explanation: line,
      ...(assets.helpAudio?.[item.id] ? { audioUrl: assets.helpAudio[item.id] } : {}),
      ...(assets.helpVideos?.[item.id] ? { videoUrl: assets.helpVideos[item.id] } : {}),
    }];
  });
}

export function useFamiliarHelpTopics(place: FamiliarHelpPlace): FamiliarTopic[] {
  const { helpAudio, helpVideos } = useLibraryAssets();
  return useMemo(() => familiarHelpTopics(place, { helpAudio, helpVideos }), [place, helpAudio, helpVideos]);
}
