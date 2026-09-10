import {
  BookOpen,
  Brain,
  Drama,
  Feather,
  Gauge,
  Gem,
  GitBranch,
  Globe,
  Landmark,
  Library,
  Lightbulb,
  PenLine,
  Route,
  ScrollText,
  Shield,
  Sparkles,
  Sprout,
  Tag,
  WandSparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Library Help content — the single home for guidance that used to live
 * in loose tip boxes scattered across the creation sections.
 *
 * The data is deliberately content-first so the feature grows without UI
 * changes:
 *
 * - **New help item:** add one entry to `STORY_SEED_HELP_ITEMS`; the menu
 *   renders it automatically.
 * - **New language:** extend `StorySeedHelpLanguage` and add that language's
 *   `line` and optional `audioUrl` under every item's `translations`. The menu reads
 *   whichever language it is given and falls back to English.
 */

/** Languages the Help menu can speak. English is the launch language. */
export type StorySeedHelpLanguage = 'en';

export const DEFAULT_HELP_LANGUAGE: StorySeedHelpLanguage = 'en';

export interface StorySeedHelpTranslation {
  /** Written guidance line shown on the item's info card. */
  line: string;
  /** Optional supporting copy. This is written guidance only, never TTS. */
  detail?: string;
  /** Optional spoken version of the same line. Details are never included. */
  audioUrl?: string;
}

export interface StorySeedHelpItem {
  /** Stable id — used as the menu row key and for playback state. */
  id: string;
  /** Short topic label shown in the menu list. */
  label: string;
  icon: LucideIcon;
  /** Library pages where this topic should be prioritized. */
  contexts?: string[];
  /** Guidance per language. */
  translations: Partial<Record<StorySeedHelpLanguage, StorySeedHelpTranslation>>;
}

/** Prioritize the current page, then filter against every visible text field. */
export const getLibraryHelpItems = (
  items: readonly StorySeedHelpItem[],
  language: StorySeedHelpLanguage,
  page: string,
  query: string,
): StorySeedHelpItem[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return items
    .map((item, index) => ({
      item,
      index,
      isRelevant: item.contexts?.includes(page) ? 1 : 0,
    }))
    .filter(({ item }) => {
      if (!normalizedQuery) return true;
      const translation = getHelpTranslation(item, language);
      return [item.label, translation?.line, translation?.detail]
        .some(value => value?.toLocaleLowerCase().includes(normalizedQuery));
    })
    .sort((a, b) => {
      return b.isRelevant - a.isRelevant || a.index - b.index;
    })
    .map(({ item }) => item);
};

/** Resolve an item's guidance for a language, falling back to English. */
export const getHelpTranslation = (
  item: StorySeedHelpItem,
  language: StorySeedHelpLanguage,
): StorySeedHelpTranslation | undefined =>
  item.translations[language] ?? item.translations[DEFAULT_HELP_LANGUAGE];

/** The SEIHouse lines CDN folder holding the shared Library help lines. */
const LIBRARY_HELP_LINES_CDN =
  'https://lines.seihouse.org/LIBRARY/Lines/SYSTEM/SYSTEM/HELP%20LINES';

export const STORY_SEED_HELP_ITEMS: StorySeedHelpItem[] = [
  {
    id: 'story-seed',
    label: 'Story Seed',
    icon: Sprout,
    contexts: ['story-seed'],
    translations: {
      en: {
        line: 'Your Story Seed is the first spark of the novel. Give the Library enough information for it to create your universe.',
        detail: 'Quick tip: Start with the clearest version of your idea. You can deepen the world as the seed grows.',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/STORY%20SEED%20ENG.mp3`,
      },
    },
  },
  {
    id: 'style',
    label: 'Style',
    icon: PenLine,
    contexts: ['story-seed'],
    translations: {
      en: {
        line: 'Style controls the flavor of the writing, not the plot itself, cultivator',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/STYLE%20ENG.mp3`,
      },
    },
  },
  {
    id: 'premise',
    label: 'Premise',
    icon: Lightbulb,
    contexts: ['story-seed'],
    translations: {
      en: {
        line: 'The premise tells the Library what your story is really about, scholar.',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/PREMISE%20ENG.mp3`,
      },
    },
  },
  {
    id: 'genre',
    label: 'Genre',
    icon: Drama,
    contexts: ['story-seed'],
    translations: {
      en: {
        line: 'Genre tells the Library what kind of story this should feel like.',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/GENRE%20ENG.mp3`,
      },
    },
  },
  {
    id: 'story-tags',
    label: 'Story Tags',
    icon: Tag,
    contexts: ['story-seed'],
    translations: {
      en: {
        line: 'Story Tags are powerful signals. For the best results, use a few strong ones instead of flooding the story.',
        detail: 'Quick tip: Choose the tags that most strongly define the experience you want the reader to have.',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/STORY%20TAGS%20ENG.mp3`,
      },
    },
  },
  {
    id: 'world',
    label: 'World',
    icon: Globe,
    contexts: ['story-seed'],
    translations: {
      en: {
        line: 'World details shape the setting, powers, factions, and rules around your story, Choose wisely disciple.',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/WORLD%20ENG.mp3`,
      },
    },
  },
  {
    id: 'arc',
    label: 'ARC',
    icon: Route,
    contexts: ['story-seed'],
    translations: {
      en: {
        line: 'ARC guides the path of the story, including plot, tropes, even Face-Slaps, Use ARC to shape the Novels Destiny.',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/ARC%20ENG.mp3`,
      },
    },
  },
  {
    id: 'origin',
    label: 'Origin',
    icon: Feather,
    contexts: ['story-seed'],
    translations: {
      en: {
        line: 'Origin holds the required heart of your story, the title, premise, genre, style and tags.',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/ORIGIN%20ENG.mp3`,
      },
    },
  },
  {
    id: 'fate-survival',
    label: 'Fate Survival',
    icon: Shield,
    contexts: ['story-seed', 'fate'],
    translations: {
      en: {
        line: 'Fate Survival is a narrative pressure system layered on top of any genre.',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/Fate%20Survival%20Eng.mp3`,
      },
    },
  },
  {
    id: 'mind-palace',
    label: 'Mind Palace',
    icon: Brain,
    contexts: ['fate'],
    translations: {
      en: {
        line: 'Mind Palace is the temporary clue-tracking system used during a Fate Event.',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/Mind%20Palace%20Eng.mp3`,
      },
    },
  },
  {
    id: 'alter-fate',
    label: 'Alter Fate',
    icon: GitBranch,
    contexts: ['reader', 'fate'],
    translations: {
      en: {
        line: 'The ability for a reader to change the outcome of the next scenes narrative',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/Alter%20Fate%20-%20Eng.mp3`,
      },
    },
  },
  {
    id: 'fate-event',
    label: 'Fate Event',
    icon: Gauge,
    contexts: ['fate'],
    translations: {
      en: {
        line: 'A Fate Event is a Mechanic in which after a series of chapters fate forces  a decision to be made.',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/Fate%20event%20eng.mp3`,
      },
    },
  },
  {
    id: 'manifest',
    label: 'Manifest',
    icon: WandSparkles,
    contexts: ['library', 'story-seed', 'reader'],
    translations: {
      en: {
        line: 'Manifesting is the act of generating chapters, images, audio, rewards, and videos in the the celestial library',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/Manifest%20-%20Eng.mp3`,
      },
    },
  },
  {
    id: 'seed-bank',
    label: 'Seed Bank',
    icon: Landmark,
    contexts: ['story-seed', 'seed-bank'],
    translations: {
      en: {
        line: 'The storage bank for a Readers Story Seeds and world blueprints',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/Seed%20Bank%20-%20ENG.mp3`,
      },
    },
  },
  {
    id: 'world-blueprint',
    label: 'World Blueprint',
    icon: ScrollText,
    contexts: ['story-seed', 'seed-bank'],
    translations: {
      en: {
        line: 'A World Blueprint is the final overview of a novel before it is manifested from the seed.',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/World%20Blueprint%20-%20Eng.mp3`,
      },
    },
  },
  {
    id: 'energy',
    label: 'Energy',
    icon: Zap,
    contexts: ['library', 'story-seed'],
    translations: {
      en: {
        line: 'Energy is the currency used for manifesting inside of the celestial library',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/Energy%20-%20Eng.mp3`,
      },
    },
  },
  {
    id: 'sen',
    label: 'SEN',
    icon: Sparkles,
    contexts: ['library'],
    translations: {
      en: {
        line: 'SEIHouse Expanded Novels, is a narrative engine designed by, and for the library',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/SEN%20-%20ENG.mp3`,
      },
    },
  },
  {
    id: 'celestial-library',
    label: 'Celestial Library',
    icon: Library,
    contexts: ['library'],
    translations: {
      en: {
        line: 'The Celestial Library is home for Narration, illustration, Animation, video games and wandering scholars from around the universe.',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/Celestial%20Library%20-%20Eng.mp3`,
      },
    },
  },
  {
    id: 'relics',
    label: 'Relics',
    icon: Gem,
    contexts: ['library', 'relics'],
    translations: {
      en: {
        line: 'Items lost by the Library that a cultivator can return for a reward',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/Relics%20-%20Eng.mp3`,
      },
    },
  },
  {
    id: 'pressure',
    label: 'Pressure',
    icon: BookOpen,
    contexts: ['story-seed', 'fate'],
    translations: {
      en: {
        line: 'Pressure is how much influence the Library exerts over a scholars story',
        audioUrl: `${LIBRARY_HELP_LINES_CDN}/Pressure%20-%20eng.mp3`,
      },
    },
  },
];
