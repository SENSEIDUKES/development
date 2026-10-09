import { EnergyActionCost } from '../../components/energy/development/EnergyActionCost';

/**
 * The World Blueprint's Energy badge, for Story Seed's Manifest. A Blueprint
 * has no price of its own yet, so it shows a chapter's (practice: nothing is
 * taken yet).
 */
export function BlueprintEnergyCost() {
  return <EnergyActionCost actionId="chapter.generate" />;
}
