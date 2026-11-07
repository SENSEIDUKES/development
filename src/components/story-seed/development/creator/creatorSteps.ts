import { normalizeStoryStyle, type StorySeedInput } from '@seihouse/sen/story-seed';
import {
  FAMILY_SECTIONS,
  SEED_SECTIONS,
  missingRequiredSections,
  type SeedSection,
  type SeedSectionId,
} from '../seedSections';

/**
 * The character-creator step model over Story Seed's sections. The strip shows
 * four steps — Origin, World, ARC, Create (the Manifest step, `'manifest'`) —
 * and World holds its eight kinds
 * as sub-tabs. Next and Back walk `CREATOR_PAGE_ORDER`, with World available
 * before the author plans the arc, then finish on the Manifest step.
 */
export type CreatorPageId = SeedSectionId | 'manifest';
export type CreatorStepId = 'origin' | 'arc' | 'world' | 'manifest';

export interface CreatorStep {
  id: CreatorStepId;
  label: string;
  /** The page a tap on this step opens. */
  page: CreatorPageId;
}

export const CREATOR_STEPS: readonly CreatorStep[] = [
  { id: 'origin', label: 'Origin', page: 'origin' },
  { id: 'world', label: 'World', page: FAMILY_SECTIONS.world[0].id },
  { id: 'arc', label: 'ARC', page: 'arc' },
  { id: 'manifest', label: 'Create', page: 'manifest' },
];

export const WORLD_KINDS: readonly SeedSection[] = FAMILY_SECTIONS.world;

/** Every page in walking order: each section, then the Manifest step. */
export const CREATOR_PAGE_ORDER: readonly CreatorPageId[] = ['origin', ...WORLD_KINDS.map(section => section.id), 'arc', 'manifest'];

export const stepOfPage = (page: CreatorPageId): CreatorStepId => {
  if (page === 'manifest') return 'manifest';
  if (page === 'origin' || page === 'arc') return page;
  return 'world';
};

export const nextPage = (page: CreatorPageId): CreatorPageId | null =>
  CREATOR_PAGE_ORDER[CREATOR_PAGE_ORDER.indexOf(page) + 1] ?? null;

export const previousPage = (page: CreatorPageId): CreatorPageId | null =>
  CREATOR_PAGE_ORDER[CREATOR_PAGE_ORDER.indexOf(page) - 1] ?? null;

export interface CreatorPart { id: string; label: string }

/**
 * The steps too long for one phone screen, in parts a phone shows one at a
 * time (SeedPart). Wider screens show each step whole.
 */
export const SECTION_PARTS: Partial<Record<SeedSectionId, readonly CreatorPart[]>> = {
  origin: [
    { id: 'style', label: 'Style' },
    { id: 'synopsis', label: 'Synopsis' },
    { id: 'fate', label: 'Fate' },
    { id: 'tags', label: 'Tags' },
  ],
  arc: [
    { id: 'ending', label: 'Ending' },
    { id: 'goals', label: 'Goals' },
    { id: 'pins', label: 'Hard Pins' },
    { id: 'fun', label: 'Fun Settings' },
  ],
};

export const partsOf = (page: CreatorPageId): readonly CreatorPart[] | undefined =>
  page === 'manifest' ? undefined : SECTION_PARTS[page];

/** A place in the creator: a page, and on a phone the part of it shown. */
export interface CreatorPosition { page: CreatorPageId; part?: string }

/** Every place Next and Back walk through: each page, split into its parts when they are shown. */
export const creatorPositions = (withParts: boolean): CreatorPosition[] =>
  CREATOR_PAGE_ORDER.flatMap(page => {
    const parts = withParts ? partsOf(page) : undefined;
    return parts ? parts.map(part => ({ page, part: part.id })) : [{ page }];
  });

export const positionLabel = ({ page, part }: CreatorPosition): string =>
  partsOf(page)?.find(entry => entry.id === part)?.label ?? pageLabel(page);

export const pageLabel = (page: CreatorPageId): string =>
  page === 'manifest' ? 'Create' : SEED_SECTIONS.find(section => section.id === page)?.label ?? page;

export type CreatorStepStatus = 'missing' | 'filled' | 'empty';

export const tabKey = ({ page, part }: CreatorPosition): string => part ? `${page}.${part}` : page;

/** All parts visible on this screen; Next confirms only these, never skipped tabs. */
export const tabsToConfirm = (position: CreatorPosition, withParts: boolean): string[] => {
  if (position.page === 'manifest') return [];
  const parts = partsOf(position.page);
  return parts && !withParts ? parts.map(part => tabKey({ page: position.page, part: part.id })) : [tabKey(position)];
};

const hasText = (value?: string) => Boolean(value?.trim());

/** Required answers always come from content; confirmations only complete optional tabs. */
export const partComplete = (page: CreatorPageId, part: string, seed: StorySeedInput, confirmed: readonly string[] = []): boolean => {
  const required = seed.story.required;
  if (page === 'origin' && part === 'style') return Boolean(normalizeStoryStyle(required.style) && hasText(required.genre));
  if (page === 'origin' && part === 'synopsis') return hasText(required.premise);
  if (confirmed.includes(tabKey({ page, part }))) return true;
  if (page === 'origin') {
    if (part === 'tags') return required.storyTags.some(hasText);
    if (part === 'fate') return seed.story.optional.fateSurvival.enabled || seed.story.optional.fateSurvival.pressure !== 'immortal';
  }
  if (page === 'arc') {
    if (part === 'pins') return Boolean(seed.story.optional.hardPins?.some(pin => hasText(pin.text)));
    if (part === 'ending') return hasText(seed.world.optional.worldFoundations.destinedEnding) || seed.story.optional.arcCount !== undefined;
    if (part === 'goals') return Boolean(seed.story.optional.arcOneGoals?.some(goal => hasText(goal.text))
      || seed.story.optional.arcLookahead?.some(entry => hasText(entry.direction)));
    if (part === 'fun') return Object.values(seed.story.optional.funSettings).some(level => level !== 'medium');
  }
  return false;
};

export const pageComplete = (page: CreatorPageId, seed: StorySeedInput, confirmed: readonly string[] = []): boolean => {
  const parts = partsOf(page);
  if (parts) return parts.every(part => partComplete(page, part.id, seed, confirmed));
  return confirmed.includes(page) || Boolean(SEED_SECTIONS.find(section => section.id === page)?.isFilled(seed));
};

/**
 * What a step's marker shows. Origin is the only step with required inputs;
 * Manifest is ready once nothing required is missing.
 */
export const stepStatus = (step: CreatorStepId, seed: StorySeedInput, confirmed: readonly string[] = []): CreatorStepStatus => {
  if (step === 'manifest') return missingRequiredSections(seed).length ? 'empty' : 'filled';
  const sections = step === 'world' ? WORLD_KINDS : SEED_SECTIONS.filter(section => section.id === step);
  if (sections.some(section => section.required && !section.isFilled(seed))) return 'missing';
  return sections.every(section => pageComplete(section.id, seed, confirmed)) ? 'filled' : 'empty';
};
