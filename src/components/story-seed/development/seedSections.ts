import {
  Feather,
  Globe,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { StorySeedInput } from '../shared/storySeedSchema';
import { normalizeStoryStyle } from '../shared/storyStyle';
import { plotAndTropeSettings, storyRequired, worldFoundations, worldIdentity } from './seedState';
import type { StorySeedIconName } from './SENStorySeedIcon';

/**
 * The visible navigation hierarchy and its canonical Story Seed ownership.
 * Origin is the single editor for required Story inputs; ARC owns optional
 * direction and the destined ending; World owns the optional foundations.
 * Experience metadata such as Fate Survival belongs to Story Seed Settings.
 */
export type SeedFamily = 'story' | 'world';

export type SeedSectionId =
  | 'origin'
  | 'arc'
  | 'world-identity'
  | 'characters'
  | 'factions'
  | 'abilities'
  | 'power-system';

export interface SeedSection {
  id: SeedSectionId;
  family: SeedFamily;
  label: string;
  icon: StorySeedIconName | LucideIcon;
  /** Whether the visible section must be completed before generation. */
  required?: boolean;
  tagline: string;
  isFilled: (seed: StorySeedInput) => boolean;
}

export const SEED_FAMILIES: Record<SeedFamily, { label: string; tagline: string }> = {
  story: { label: 'Story', tagline: "The novel's direction" },
  world: { label: 'World', tagline: "The novel's history" },
};

const hasText = (value?: string): boolean => Boolean(value?.trim());

export const SEED_SECTIONS: SeedSection[] = [
  {
    id: 'origin',
    family: 'story',
    label: 'Origin',
    icon: Feather,
    required: true,
    tagline: 'The premise, tradition, genre, and story details that give this novel its first shape.',
    isFilled: seed => Boolean(
      normalizeStoryStyle(storyRequired(seed).style)
      && hasText(storyRequired(seed).genre)
      && hasText(storyRequired(seed).premise),
    ),
  },
  {
    id: 'arc',
    family: 'story',
    label: 'ARC',
    icon: 'arc',
    tagline: 'The forces that shape the journey and the destination it ultimately reaches.',
    isFilled: seed => {
      const settings = plotAndTropeSettings(seed);
      return hasText(seed.story.optional.additionalStoryDirection)
        || hasText(seed.story.optional.makeItWorkInstruction)
        || hasText(settings.longTermGoal)
        || hasText(settings.firstMajorConflict)
        || hasText(settings.mainAntagonistPressure)
        || hasText(worldFoundations(seed).destinedEnding);
    },
  },
  {
    id: 'world-identity',
    family: 'world',
    label: 'World Identity',
    icon: 'world-identity',
    tagline: 'World type, society, and the place the story opens in.',
    isFilled: seed => {
      const identity = worldIdentity(seed);
      return hasText(identity.worldType)
        || hasText(identity.startingLocation)
        || hasText(identity.societyStructure);
    },
  },
  {
    id: 'characters',
    family: 'world',
    label: 'Characters',
    icon: Users,
    tagline: 'The main character and any cast you want defined before generation.',
    isFilled: seed => {
      const foundations = worldFoundations(seed);
      return (foundations.additionalCharacters || []).some(character => hasText(character.name))
        || Object.values(foundations.mainCharacter || {}).some(hasText);
    },
  },
  {
    id: 'factions',
    family: 'world',
    label: 'Factions',
    icon: 'ally-faction',
    tagline: 'Sects, guilds, and powers that already shape the world.',
    isFilled: seed => (worldFoundations(seed).factions || []).some(faction => hasText(faction.name)),
  },
  {
    id: 'abilities',
    family: 'world',
    label: 'Abilities',
    icon: 'ability',
    tagline: "The main character's starting power and the path only they can walk.",
    isFilled: seed => {
      const abilities = worldFoundations(seed).abilities || {};
      return hasText(abilities.startingPowerConcept) || hasText(abilities.uniquePath);
    },
  },
  {
    id: 'power-system',
    family: 'world',
    label: 'Power System',
    icon: 'power-system',
    tagline: "The style and rank ladder of the world's power system.",
    isFilled: seed => {
      const powerSystem = worldFoundations(seed).powerSystem || {};
      return hasText(powerSystem.flavor) || hasText(powerSystem.knownRanks);
    },
  },
];

export const FAMILY_SECTIONS: Record<SeedFamily, SeedSection[]> = {
  story: SEED_SECTIONS.filter(section => section.family === 'story'),
  world: SEED_SECTIONS.filter(section => section.family === 'world'),
};

export interface RequiredStoryInput {
  id: 'style' | 'genre' | 'premise';
  label: 'Style' | 'Genre' | 'Premise';
  isFilled: (seed: StorySeedInput) => boolean;
}

// The gate stays granular so validation messages identify the missing Origin
// input even though those inputs share one visible editing surface.
export const REQUIRED_STORY_SECTIONS: RequiredStoryInput[] = [
  {
    id: 'style',
    label: 'Style',
    isFilled: seed => Boolean(normalizeStoryStyle(storyRequired(seed).style)),
  },
  {
    id: 'genre',
    label: 'Genre',
    isFilled: seed => hasText(storyRequired(seed).genre),
  },
  {
    id: 'premise',
    label: 'Premise',
    isFilled: seed => hasText(storyRequired(seed).premise),
  },
];

export const getSeedSection = (id: SeedSectionId): SeedSection => {
  const section = SEED_SECTIONS.find(candidate => candidate.id === id);
  if (!section) throw new Error(`Unknown Story Seed section: ${id}`);
  return section;
};

export const missingRequiredSections = (seed: StorySeedInput): RequiredStoryInput[] =>
  REQUIRED_STORY_SECTIONS.filter(section => !section.isFilled(seed));

/** Compares only the completion state rendered by Story Seed navigation. */
export const haveSameSeedSectionState = (
  previous: StorySeedInput,
  next: StorySeedInput,
): boolean => SEED_SECTIONS.every(
  section => section.isFilled(previous) === section.isFilled(next),
);

export const FAMILY_ICONS: Record<SeedFamily, StorySeedIconName | LucideIcon> = {
  story: 'scroll',
  world: Globe,
};
