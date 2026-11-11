import { FRONT_DESK_BACK_ACTION_ID, FRONT_DESK_BACK_PHRASES, type FrontDeskContext } from '@seihouse/front-desk';
import type { FamiliarPage } from '@seihouse/library/familiar';
import { ArrowLeft, PenLine } from 'lucide-react';
import { LibraryHomeIcon, LibraryProfileIcon, LibrarySettingsIcon, LibraryStoreIcon } from '@seihouse/library-ui';
import { EnergySunIcon } from '@seihouse/library/energy';
import { HOME_ROUTE, goBack, type Navigate, type NovelExpandedRoute } from './routes';

/** One of the Familiar's actions (the package's name for it also names its tray button). */
type FrontDeskAction = FrontDeskContext['actions'][number];

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

const go = (id: string, label: string, icon: FrontDeskAction['icon'], phrases: readonly string[], to: NovelExpandedRoute, navigate: Navigate): FrontDeskAction => ({
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
export function appFamiliarActions(navigate: Navigate, { back = false }: { back?: boolean } = {}): FrontDeskAction[] {
  return [
    // "Take me back": the previous screen, never out of the app. Offered wherever there is somewhere to go back to.
    ...(back ? [{
      id: FRONT_DESK_BACK_ACTION_ID, label: 'Take me back', icon: ArrowLeft, phrases: [...FRONT_DESK_BACK_PHRASES],
      describe: () => 'Go back to the previous screen.', success: 'Went back.',
      run: async () => { goBack(navigate); },
    }] : []),
    go('go-home', 'Home', LibraryHomeIcon, ['home', 'go home', 'take me home', 'open home', 'my stories'], HOME_ROUTE, navigate),
    go('go-create', 'Create', PenLine, ['create', 'go to create', 'open create', 'new story', 'create a story'], { page: 'create' }, navigate),
    go('go-profile', 'Profile', LibraryProfileIcon, ['profile', 'my profile', 'open profile', 'go to profile', 'my cave'], { page: 'profile' }, navigate),
    go('go-energy', 'My Energy', EnergySunIcon, ['my energy', 'energy', 'check energy', 'check my energy', 'open energy', 'qi', 'my qi'], { page: 'profile', cave: '/home/energy' }, navigate),
    go('go-settings', 'Settings', LibrarySettingsIcon, ['settings', 'open settings', 'go to settings'], { page: 'profile', cave: '/settings' }, navigate),
    go('go-store', 'Store', LibraryStoreIcon, ['store', 'open store', 'go to store', 'shop', 'celestial store'], { page: 'profile', cave: '/home/store' }, navigate),
  ];
}
