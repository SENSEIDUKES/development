import { useMemo, type ReactNode } from 'react';
import { EnergyModelsProvider } from '@seihouse/library/energy';
import { chosenEnergyGrade, useModelPreference, useTierPreference } from './modelPreference';

/**
 * Every Energy price shown before generating follows the Model Router: a
 * chapter or image costs the reader's tier, or the grade of the exact model
 * they picked (Mortal for the server's default), the same Energy Usage records.
 */
export function RouterEnergyModels({ children }: { children: ReactNode }) {
  const [chapter] = useModelPreference('chapters');
  const [image] = useModelPreference('images');
  const [live] = useModelPreference('live');
  // Re-read the grades whenever a tier or a tier's model changes.
  const tiers = [useTierPreference('chapters'), useTierPreference('images'), useTierPreference('live')];
  const models = useMemo(() => ({ chapter, image, 'live-minute': live }), [chapter, image, live]);
  const grades = useMemo(() => ({
    chapter: chosenEnergyGrade('chapters', chapter),
    image: chosenEnergyGrade('images', image),
    'live-minute': chosenEnergyGrade('live', live),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [chapter, image, live, ...tiers]);
  return <EnergyModelsProvider models={models} grades={grades}>{children}</EnergyModelsProvider>;
}
