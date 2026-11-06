import type { FamiliarHelperContext, FamiliarPage } from '@seihouse/library/familiar';
import { ArrowLeft, Home, PenLine, Settings, Store, UserRound, Zap } from 'lucide-react';
import { FAMILIAR_BACK_ACTION_ID, FAMILIAR_BACK_PHRASES } from '@seihouse/library/familiar';
import { HOME_ROUTE, goBack, type Navigate, type NovelExpandedRoute } from './routes';

/** One of the Familiar's actions (the package's name for it also names its tray button). */
type FamiliarHelperAction = FamiliarHelperContext['actions'][number];

/** Which page each route is, for the Familiar's master action list. */
export function familiarPage(page: NovelExpandedRoute['page']): FamiliarPage {
  switch (page) {
    case 'home': return 'home';
    case 'discover': return 'discover';
    case 'create':
    case 'world': return 'create';
    case 'story':
    case 'blueprint': return 'world-info';
    case 'profile': return 'profile';
    case 'read':
    case 'write': return 'reader';
  }
}

const go = (id: string, label: string, icon: FamiliarHelperAction['icon'], phrases: readonly string[], to: NovelExpandedRoute, navigate: Navigate): FamiliarHelperAction => ({
  id, label, icon, phrases,
  describe: () => `Go to ${label}.`,
  success: `Opened ${label}.`,
  run: async () => { navigate(to); },
});

/**
 * The app's anywhere actions: where the Familiar can take the reader from any
 * page. Each goes to exactly one place. They are in the master action list
 * (`@seihouse/library/familiar` `FAMILIAR_ACTION_LIST`), which decides where
 * they are offered; going somewhere changes nothing, so none asks to confirm.
 */
export function appFamiliarActions(navigate: Navigate, { back = false }: { back?: boolean } = {}): FamiliarHelperAction[] {
  return [
    // "Take me back": the previous screen, never out of the app. Offered wherever there is somewhere to go back to.
    ...(back ? [{
      id: FAMILIAR_BACK_ACTION_ID, label: 'Take me back', icon: ArrowLeft, phrases: [...FAMILIAR_BACK_PHRASES],
      describe: () => 'Go back to the previous screen.', success: 'Went back.',
      run: async () => { goBack(navigate); },
    }] : []),
    go('go-home', 'Home', Home, ['home', 'go home', 'take me home', 'open home', 'my stories'], HOME_ROUTE, navigate),
    go('go-create', 'Create', PenLine, ['create', 'go to create', 'open create', 'new story', 'create a story'], { page: 'create' }, navigate),
    go('go-profile', 'Profile', UserRound, ['profile', 'my profile', 'open profile', 'go to profile', 'my cave'], { page: 'profile' }, navigate),
    go('go-energy', 'My Energy', Zap, ['my energy', 'energy', 'check energy', 'check my energy', 'open energy', 'qi', 'my qi'], { page: 'profile', cave: '/home/energy' }, navigate),
    go('go-settings', 'Settings', Settings, ['settings', 'open settings', 'go to settings'], { page: 'profile', cave: '/settings' }, navigate),
    go('go-store', 'Store', Store, ['store', 'open store', 'go to store', 'shop', 'celestial store'], { page: 'profile', cave: '/home/store' }, navigate),
  ];
}
