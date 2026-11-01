import { useMemo, type ReactNode } from 'react';
import { EnergyModelsProvider } from '@seihouse/library/energy';
import { useModelPreference } from './modelPreference';

/**
 * Every Energy price shown before generating follows the Model Router: a
 * chapter or image costs its grade's price for the model the Router chose
 * (Mortal for the server's default), the same Energy Usage records.
 */
export function RouterEnergyModels({ children }: { children: ReactNode }) {
  const [chapter] = useModelPreference('chapters');
  const [image] = useModelPreference('images');
  const [live] = useModelPreference('live');
  const models = useMemo(() => ({ chapter, image, 'live-minute': live }), [chapter, image, live]);
  return <EnergyModelsProvider models={models}>{children}</EnergyModelsProvider>;
}
