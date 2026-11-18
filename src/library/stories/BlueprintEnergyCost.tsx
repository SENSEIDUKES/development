import { EnergyActionCost } from '../../components/energy/development/EnergyActionCost';

import { GRADED_ENERGY_PRICES, modelEnergyGrade } from '../../components/energy/shared/energyGrades';

/**
 * The World Blueprint's Energy badge, for Story Seed's Manifest. A Blueprint
 * uses the chapter price schedule with its selected model's grade. An
 * inherited model uses the active Chapter price.
 */
export function BlueprintEnergyCost({ model }: { model?: string } = {}) {
  return model
    ? <EnergyActionCost price={GRADED_ENERGY_PRICES.chapter[modelEnergyGrade(model)]} />
    : <EnergyActionCost actionId="chapter.generate" />;
}
