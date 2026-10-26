import { createElement, forwardRef } from 'react';
import {
  Feather,
  MapPin,
  PawPrint,
  Sword,
  type LucideIcon,
} from 'lucide-react';
import { type StorySeedInput } from '@seihouse/sen/story-seed';
import { normalizeStoryStyle } from '@seihouse/sen/story-seed';
import { storyRequired, worldFoundations, worldIdentity } from './seedState';
import type { StorySeedIconName } from './SENStorySeedIcon';

/**
 * The visible navigation hierarchy and its canonical Story Seed ownership.
 * Origin is the single editor for required Story inputs; ARC owns optional
 * direction and the destined ending; World owns the optional foundations.
 * Origin also owns Pressure and Survival; Settings owns mature-audience metadata.
 */
export type SeedFamily = 'story' | 'world';

export type SeedSectionId =
  | 'origin'
  | 'arc'
  | 'world-identity'
  | 'characters'
  | 'factions'
  | 'things'
  | 'places'
  | 'species'
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

// Semantic hook lets the Library skin supply its Origin artwork.
export const OriginIcon: LucideIcon = forwardRef((props, ref) => createElement(Feather, { ...props, ref, className: [props.className, 'sen-origin-icon'].filter(Boolean).join(' ') }));

export const SEED_SECTIONS: SeedSection[] = [
  {
    id: 'origin',
    family: 'story',
    label: 'Origin',
    icon: OriginIcon,
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
      return hasText(seed.story.optional.activeArcGoal?.text)
        || Boolean(seed.story.optional.hardPins?.length)
        || seed.story.optional.arcCount !== undefined
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
        || hasText(identity.societyStructure)
        || hasText(seed.story.optional.makeItWorkInstruction)
        || hasText(worldFoundations(seed).mainOpposition);
    },
  },
  {
    id: 'characters',
    family: 'world',
    label: 'Characters',
    icon: 'characters',
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
    id: 'things',
    family: 'world',
    label: 'Things',
    icon: Sword,
    tagline: 'The weapons, heirlooms and treasures the world already has, and who holds them.',
    isFilled: seed => (worldFoundations(seed).things || []).some(thing => hasText(thing.name)),
  },
  {
    id: 'places',
    family: 'world',
    label: 'Places',
    icon: MapPin,
    tagline: 'The places the story opens among, so the record knows where everyone is.',
    isFilled: seed => (worldFoundations(seed).places || []).some(place => hasText(place.name)),
  },
  {
    id: 'species',
    family: 'world',
    label: 'Bestiary',
    icon: PawPrint,
    tagline: 'The creatures natural to this world. A named beast is a character of its species.',
    isFilled: seed => (worldFoundations(seed).species || []).some(species => hasText(species.name)),
  },
  {
    id: 'abilities',
    family: 'world',
    label: 'Abilities',
    icon: 'ability',
    tagline: "The main character's starting power, the path only they can walk, and the techniques the world already knows.",
    isFilled: seed => {
      const foundations = worldFoundations(seed);
      const abilities = foundations.abilities || {};
      return hasText(abilities.startingPowerConcept)
        || hasText(abilities.uniquePath)
        || (foundations.startingAbilities || []).some(ability => hasText(ability.name));
    },
  },
  {
    id: 'power-system',
    family: 'world',
    label: 'World Rules',
    icon: 'power-system',
    tagline: "The rank ladder every card is measured by, the laws that change what can happen, and the age the story stands in.",
    isFilled: seed => {
      const powerSystem = worldFoundations(seed).powerSystem || {};
      return hasText(powerSystem.flavor) || hasText(powerSystem.knownRanks)
        || hasText(powerSystem.laws) || hasText(powerSystem.era);
    },
  },
];

export const FAMILY_SECTIONS: Record<SeedFamily, SeedSection[]> = {
  story: SEED_SECTIONS.filter(section => section.family === 'story'),
  world: SEED_SECTIONS.filter(section => section.family === 'world'),
};

export interface RequiredStoryInput {
  id: 'style' | 'genre' | 'premise';
  label: 'Style' | 'Genre' | 'Synopsis';
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
    label: 'Synopsis',
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
  world: 'world',
};
