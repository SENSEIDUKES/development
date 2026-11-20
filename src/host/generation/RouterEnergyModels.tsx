import { useMemo, type ReactNode } from 'react';
import { EnergyModelsProvider } from '@seihouse/library/energy';
import { chosenEnergyGrade, useModelPreference, useTierPreference } from './modelPreference';
import { IMAGE_JOB_DEFAULTS } from './modelDefaults';

/**
 * Every Energy price shown before generating follows the Model Router: a
 * chapter or image costs the reader's tier, or the grade of the selected model.
 */
export function RouterEnergyModels({ children }: { children: ReactNode }) {
  const [chapter] = useModelPreference('chapters');
  const [coverImage] = useModelPreference('images');
  const [codexImage] = useModelPreference('codex-images');
  const image = coverImage ?? IMAGE_JOB_DEFAULTS.images;
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
  useTierPreference('codex-images');
  const codexImageGrade = chosenEnergyGrade('codex-images', codexImage ?? IMAGE_JOB_DEFAULTS['codex-images']);
  return <EnergyModelsProvider models={models} grades={grades} codexImageGrade={codexImageGrade}>{children}</EnergyModelsProvider>;
}
