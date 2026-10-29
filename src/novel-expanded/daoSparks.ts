import { useMemo } from 'react';
import type { DaoSparkHost } from '@seihouse/library/shell';
import type { UserProfile } from '@seihouse/library/profile';
import { storySeedInputFromSpark, type StorySpark } from '@seihouse/sen/story-seed';
import type { Navigate } from './routes';
import type { NovelExpandedServices } from './services';
import { NOVEL_EXPANDED_READER_ID } from './storyCreationRuntime';

/**
 * Dao Insights on Home: sparks from the Story Spark server (free, twenty a day
 * for a visitor; the owner's saved token lifts that), kept in the app's own
 * Story Bank. A spark is planted as a new Story Seed holding only its premise
 * and genre, in the profile's reading language and Reading Mode, the way a new
 * seed in Create starts. Beginning one opens it in Create.
 */
export function useDaoSparks(
  services: Pick<NovelExpandedServices, 'requestStorySpark' | 'storySparksConfigured' | 'storySeeds' | 'accessToken'>,
  profile: Pick<UserProfile, 'defaultReadingLanguage' | 'defaultChapterWritingStyle'>,
  navigate: Navigate,
): DaoSparkHost {
  const { defaultReadingLanguage, defaultChapterWritingStyle } = profile;
  return useMemo(() => {
    const plant = (spark: StorySpark) => {
      const seed = storySeedInputFromSpark(spark);
      if (defaultChapterWritingStyle) seed.story.optional.chapterWritingStyle = defaultChapterWritingStyle;
      return services.storySeeds.create(NOVEL_EXPANDED_READER_ID, seed, undefined, defaultReadingLanguage);
    };
    return {
      checkSparks: () => services.storySparksConfigured(),
      requestSpark: (request, signal) => services.requestStorySpark(request, services.accessToken.current, signal),
      keepSpark: async spark => { await plant(spark); },
      beginSpark: async spark => {
        const record = await plant(spark);
        navigate({ page: 'story-seed', seedId: record.id });
      },
    };
  }, [services, defaultReadingLanguage, defaultChapterWritingStyle, navigate]);
}
