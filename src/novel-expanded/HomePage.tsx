import { useCallback, useMemo, useRef } from 'react';
import { LightNovelsHome, type HomeWorld } from '@seihouse/library/home';
import { useFrontDeskContext, type FrontDeskContext } from '@seihouse/front-desk';
import type { UserProfile } from '@seihouse/library/profile';
import { AppShell } from './AppShell';
import type { Navigate } from './routes';
import { HOME_SAMPLE_EVENTS } from './homeEvents';

const EMPTY_LIST = {
  title: 'Your stories appear here',
  description: 'Carve New Destiny to plant a Story Seed and shape its World Blueprint. Every story you start waits here, ready to read and continue.',
};

/** How many of the reader's stories the Featured hero cycles through after Featured Ascension. */
const FEATURED_STORIES = 5;

/**
 * Home: the reader's stories, newest first, and the way to start a new one (Carve New Destiny plants a Story Seed at once), inside the Library Shell.
 * Featured cycles through the newest stories that have a cover. Sparks lives in
 * Create (the Creator Space and Story Seed's Origin), not here.
 */
export function HomePage({ worlds, navigate, readerProfile }: {
  worlds: readonly HomeWorld[];
  navigate: Navigate;
  readerProfile: UserProfile;
}) {
  const homeOrder = useRef<readonly string[]>([]);
  const showOrder = useCallback((ids: readonly string[]) => { homeOrder.current = ids; }, []);
  useFamiliarHomeCodes(navigate, homeOrder);
  return <AppShell route={{ page: 'home' }} navigate={navigate} stories={worlds} readerProfile={readerProfile} mainLabel="Your stories">
    <div className="mx-auto w-full max-w-7xl px-4 py-8" data-testid="novel-expanded-home">
      <LightNovelsHome worlds={worlds} emptyState={EMPTY_LIST}
        events={HOME_SAMPLE_EVENTS}
        featuredWorlds={worlds.filter(world => world.imageUrl.trim()).slice(0, FEATURED_STORIES)}
        onCreateStory={() => navigate({ page: 'create', newSeed: true })}
        onOpenWorld={storyId => navigate({ page: 'story', storyId })}
        onVisibleWorldsChange={showOrder} />
    </div>
  </AppShell>;
}

type FamiliarAction = FrontDeskContext['actions'][number];

/**
 * Home's spoken codes for the Familiar: N1, N2… open the story on the card
 * with that badge, in the order shown (sorting and filtering included).
 */
export function homeCodeAction(navigate: Navigate, order: { readonly current: readonly string[] }): FamiliarAction {
  return {
    id: 'open-novel', label: 'Open a story', code: { letter: 'N' },
    detail: 'The reader says N and the number on its card: N1, N2…',
    phrases: ['open story', 'open novel'],
    input: { label: 'Story number', maxLength: 3 },
    describe: number => `Open story N${number}.`,
    success: 'Opened the story.',
    run: async number => {
      const storyId = order.current[Number(number) - 1];
      if (!storyId) throw new Error(`There is no N${number} on Home.`);
      navigate({ page: 'story', storyId });
    },
  };
}

function useFamiliarHomeCodes(navigate: Navigate, order: { readonly current: readonly string[] }) {
  const context = useMemo<FrontDeskContext>(() => ({
    key: 'home:codes', title: 'Home', topics: [], hint: '', page: 'home', actions: [homeCodeAction(navigate, order)],
  }), [navigate, order]);
  useFrontDeskContext(context);
}
