import { type StorySeedInput } from '@seihouse/sen/story-seed';
import {
  FAMILY_SECTIONS,
  SEED_SECTIONS,
  missingRequiredSections,
  type SeedSection,
  type SeedSectionId,
} from '../seedSections';

/**
 * The character-creator step model over Story Seed's sections. The strip shows
 * four steps — Origin, ARC, World, Manifest — and World holds its eight kinds
 * as sub-tabs. Next and Back walk every section in `SEED_SECTIONS` order, then
 * the Manifest step, so the order has one owner: the section list itself.
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
  { id: 'arc', label: 'ARC', page: 'arc' },
  { id: 'world', label: 'World', page: FAMILY_SECTIONS.world[0].id },
  { id: 'manifest', label: 'Manifest', page: 'manifest' },
];

export const WORLD_KINDS: readonly SeedSection[] = FAMILY_SECTIONS.world;

/** Every page in walking order: each section, then the Manifest step. */
export const CREATOR_PAGE_ORDER: readonly CreatorPageId[] = [...SEED_SECTIONS.map(section => section.id), 'manifest'];

export const stepOfPage = (page: CreatorPageId): CreatorStepId => {
  if (page === 'manifest') return 'manifest';
  if (page === 'origin' || page === 'arc') return page;
  return 'world';
};

export const nextPage = (page: CreatorPageId): CreatorPageId | null =>
  CREATOR_PAGE_ORDER[CREATOR_PAGE_ORDER.indexOf(page) + 1] ?? null;

export const previousPage = (page: CreatorPageId): CreatorPageId | null =>
  CREATOR_PAGE_ORDER[CREATOR_PAGE_ORDER.indexOf(page) - 1] ?? null;

export const pageLabel = (page: CreatorPageId): string =>
  page === 'manifest' ? 'Manifest' : SEED_SECTIONS.find(section => section.id === page)?.label ?? page;

export type CreatorStepStatus = 'missing' | 'filled' | 'empty';

/**
 * What a step's marker shows. Origin is the only step with required inputs;
 * Manifest is ready once nothing required is missing.
 */
export const stepStatus = (step: CreatorStepId, seed: StorySeedInput): CreatorStepStatus => {
  if (step === 'manifest') return missingRequiredSections(seed).length ? 'empty' : 'filled';
  const sections = step === 'world' ? WORLD_KINDS : SEED_SECTIONS.filter(section => section.id === step);
  if (sections.some(section => section.required && !section.isFilled(seed))) return 'missing';
  return sections.some(section => section.isFilled(seed)) ? 'filled' : 'empty';
};
