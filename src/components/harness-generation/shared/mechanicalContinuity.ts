import type { HarnessSemanticEvent } from './types';

/** Quantities are observations, never automatically reset from a Foundation. */
export const buildHarnessMechanicalContinuity = (events: HarnessSemanticEvent[]) => {
  const observations = new Map<string, {
    sourceId: string; chapterNumber: number; subject: string; name: string; value: string; unit?: string;
    subsequentDevelopments: Array<{ sourceId: string; chapterNumber: number; description: string }>;
  }>();
  for (const event of [...events].sort((a, b) => a.chapterNumber - b.chapterNumber)) {
    const measurement = event.details?.mechanics;
    const key = measurement && `${measurement.subject}:${measurement.name}`.toLowerCase();
    for (const [observationKey, observation] of observations) {
      if (key === observationKey) continue;
      const words = event.description.toLowerCase();
      if ([observation.name, observation.unit].some(term => term && words.includes(term.toLowerCase()))) {
        observation.subsequentDevelopments.push({ sourceId: event.id, chapterNumber: event.chapterNumber, description: event.description });
      }
    }
    if (measurement && key) observations.set(key, {
      sourceId: event.id, chapterNumber: event.chapterNumber, ...measurement, subsequentDevelopments: [],
    });
  }
  return [...observations.values()].map(item => ({ ...item, subsequentDevelopments: item.subsequentDevelopments.slice(-6) }));
};
