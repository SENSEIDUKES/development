import { createContext, useContext, type ReactNode } from 'react';
import { getEnergyPriceEntry, type EnergyActionId } from './energyContracts';
import { gradedEnergyPrice, type GradedEnergyKind } from './energyGrades';

/**
 * The models a host will generate with, by kind (its Model Router choice),
 * so every price shown before generating is the grade's price for that model,
 * the same Energy the Usage page records. Without a provider, prices are the
 * catalog's (Mortal).
 */
export type EnergyModels = Partial<Record<GradedEnergyKind, string | undefined>>;

const EnergyModelsContext = createContext<EnergyModels | null>(null);

export function EnergyModelsProvider({ models, children }: { models: EnergyModels; children: ReactNode }) {
  return <EnergyModelsContext.Provider value={models}>{children}</EnergyModelsContext.Provider>;
}

const GRADED_ACTIONS: Partial<Record<EnergyActionId, GradedEnergyKind>> = {
  'chapter.generate': 'chapter',
  'image.generate': 'image',
};

/** One action's price: its grade's price for the host's model, or the catalog price. `null` when unpriced. */
export function useActionEnergyPrice(actionId: EnergyActionId): number | null {
  const models = useContext(EnergyModelsContext);
  const kind = GRADED_ACTIONS[actionId];
  const catalog = getEnergyPriceEntry(actionId).price;
  if (!models || !kind || catalog === null) return catalog;
  return gradedEnergyPrice(kind, models[kind]);
}
