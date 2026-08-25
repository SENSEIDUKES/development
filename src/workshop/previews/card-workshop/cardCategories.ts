import type { SystemPromptContentStyle } from '../../../components/card-workshop/shared/types';

/**
 * The Workshop's two real card families. Every card category belongs to exactly
 * one branch, and only the selected branch's categories are ever offered.
 */
export type CardBranchId = 'codex-cards' | 'system-prompts';

export interface CardCategory {
  id: string;
  label: string;
  /** The preset this category renders. Several System categories share one preset. */
  presetId: string;
  /**
   * System branches narrow the shared System Prompt preset to the content
   * styles that actually belong to that category.
   */
  systemPromptStyles?: readonly SystemPromptContentStyle[];
}

export interface CardBranch {
  id: CardBranchId;
  label: string;
  categories: readonly CardCategory[];
}

export const CARD_BRANCHES: readonly CardBranch[] = [
  {
    id: 'codex-cards',
    label: 'Codex Cards',
    categories: [
      { id: 'codex-human', label: 'Human', presetId: 'preset-human-character' },
      { id: 'codex-non-human', label: 'Non-Human', presetId: 'preset-nonhuman-individual' },
      { id: 'codex-artifacts', label: 'Artifacts', presetId: 'preset-artifact-relic' },
      { id: 'codex-locations', label: 'Locations', presetId: 'preset-location' },
      { id: 'codex-factions', label: 'Factions', presetId: 'preset-faction' },
    ],
  },
  {
    id: 'system-prompts',
    label: 'System Prompts',
    categories: [
      {
        id: 'system-narrative',
        label: 'Narrative',
        presetId: 'preset-system-prompt',
        systemPromptStyles: ['breakthrough', 'broken-promise'],
      },
      {
        id: 'system-mechanical',
        label: 'Mechanical',
        presetId: 'preset-system-prompt',
        systemPromptStyles: ['structured', 'target-scan'],
      },
      {
        id: 'system-world-notice',
        label: 'World Notice',
        presetId: 'preset-system-prompt',
        systemPromptStyles: ['guild-bounty', 'mission-board'],
      },
      { id: 'system-fate', label: 'Fate System', presetId: 'preset-fate-system-prompt' },
    ],
  },
];

export const CARD_CATEGORIES: readonly CardCategory[] = CARD_BRANCHES.flatMap(
  branch => branch.categories,
);

export function findCardCategory(categoryId: string): CardCategory | undefined {
  return CARD_CATEGORIES.find(category => category.id === categoryId);
}

export function findBranchForCategory(categoryId: string): CardBranch {
  return CARD_BRANCHES.find(
    branch => branch.categories.some(category => category.id === categoryId),
  ) ?? CARD_BRANCHES[0];
}

/** Resolves an incoming preset id (old Workshop links) to its first category. */
export function findCategoryForPreset(presetId: string): CardCategory {
  return CARD_CATEGORIES.find(category => category.presetId === presetId)
    ?? CARD_BRANCHES[0].categories[0];
}
