import { createContext, useContext, type ReactNode } from 'react';
import { getEnergyPriceEntry, type EnergyActionId } from './energyContracts';
import { GRADED_ENERGY_PRICES, modelEnergyGrade, type EnergyGrade, type GradedEnergyKind } from './energyGrades';

/**
 * The models a host will generate with, by kind (its Model Router choice),
 * so every price shown before generating is the grade's price for that model,
 * the same Energy the Usage page records. Without a provider, prices are the
 * catalog's (Mortal).
 */
export type EnergyModels = Partial<Record<GradedEnergyKind, string | undefined>>;
/** The grade a kind is priced at when the reader chose a tier, which can differ from its model's own. */
export type EnergyGrades = Partial<Record<GradedEnergyKind, EnergyGrade>>;

interface EnergyModelSelection {
  models: EnergyModels;
  grades?: EnergyGrades;
  codexImageGrade?: EnergyGrade;
}

const EnergyModelsContext = createContext<EnergyModelSelection | null>(null);

export function EnergyModelsProvider({ models, grades, codexImageGrade, children }: EnergyModelSelection & { children: ReactNode }) {
  return <EnergyModelsContext.Provider value={{ models, grades, codexImageGrade }}>{children}</EnergyModelsContext.Provider>;
}

const GRADED_ACTIONS: Partial<Record<EnergyActionId, GradedEnergyKind>> = {
  'chapter.generate': 'chapter',
  'image.generate': 'image',
};

/** One action's price: the reader's tier, else its model's grade, or the catalog price. `null` when unpriced. */
export function useActionEnergyPrice(actionId: EnergyActionId, imageUse?: 'codex'): number | null {
  const host = useContext(EnergyModelsContext);
  const kind = GRADED_ACTIONS[actionId];
  const catalog = getEnergyPriceEntry(actionId).price;
  if (!host || !kind || catalog === null) return catalog;
  const grade = kind === 'image' && imageUse === 'codex' ? host.codexImageGrade : undefined;
  return GRADED_ENERGY_PRICES[kind][grade ?? host.grades?.[kind] ?? modelEnergyGrade(host.models[kind])];
}
