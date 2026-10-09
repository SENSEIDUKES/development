import { useMemo } from 'react';
import { useFamiliarStoreAccount } from '@seihouse/library/familiar';
import { LibraryProfile, UserProfileServicesProvider, type AppUser, type Story, type UserProfileFeature } from '@seihouse/library/profile';
import { allFamiliarOptions } from '../host/familiar/catalogue';
import { createDeviceProfileServices, type DevicePortraitMaker } from '../host/profile/deviceProfileServices';
import { appRouteFor } from './appPlaces';
import { HOME_ROUTE, routeHref, type Navigate } from './routes';
import type { NovelExpandedServices } from './services';
import { NOVEL_EXPANDED_READER_ID } from './storyCreationRuntime';

/** The app has no accounts yet: this device's one reader is always signed in. */
const DEVICE_READER: AppUser = { uid: NOVEL_EXPANDED_READER_ID, email: null, displayName: null, photoURL: null };

/** The note beside every Cave piece that needs a server the app does not have yet. */
export const NOT_IN_THE_APP_YET = 'Not in the app yet.';

/** The Cave's account and server pieces: shown, each with the note, until the database and its services arrive. */
const NOT_YET_BUILT: readonly UserProfileFeature[] = [
  'shortcuts', 'redeem-code', 'sign-out', 'sync', 'backup', 'model-router', 'inbox',
];

/** Familiar ownership is the economy's: the Store charges QI or Energy and grants the Familiar there. */
const FAMILIAR_STORE = { useStoreAccount: useFamiliarStoreAccount };

/**
 * Profile: the Library's Cultivator Cave, whole, for the device's reader. Its
 * record (Dao Name and aura, languages, Reading Mode, Familiar) is saved on
 * this device; its balances, Dao Pillar, rewards and Familiars are the
 * Library economy's practice account (`services.economy`); its Stories page
 * lists the reader's stories and Story Seeds; its profile picture is made from
 * the reader's photo (three to choose from) and kept on this device. What
 * needs a server shows with "Not in the app yet." The Cave draws its own
 * Library header and navigation and moves between its pages itself.
 */
export function ProfilePage({ services, stories, navigate, portraits }: {
  services: Pick<NovelExpandedServices, 'profile' | 'readerPreferences' | 'storySeeds'>;
  /** Makes the profile picture from the reader's photo. */
  portraits?: DevicePortraitMaker;
  /** The reader's stories, for the Cave's Stories page. */
  stories: Story[];
  navigate: Navigate;
}) {
  const profileServices = useMemo(() => createDeviceProfileServices({
    store: services.profile,
    familiars: allFamiliarOptions,
    celestialStore: FAMILIAR_STORE,
    soundPreferences: services.readerPreferences,
    storySeeds: { repository: services.storySeeds, ownerId: NOVEL_EXPANDED_READER_ID },
    notYetBuilt: { note: NOT_IN_THE_APP_YET, features: NOT_YET_BUILT },
    portraits,
  }), [portraits, services.profile, services.readerPreferences, services.storySeeds]);
  return <div data-testid="novel-expanded-profile">
    <UserProfileServicesProvider services={profileServices}>
      <LibraryProfile currentUser={DEVICE_READER} stories={stories}
        homeHref={routeHref(HOME_ROUTE)} onNavigateHome={() => navigate(HOME_ROUTE)}
        onNavigateLibrary={location => { const next = appRouteFor(location); if (next) navigate(next); }}
        // Sever Link is not in the app yet: there is no account to leave.
        onLogout={() => undefined} />
    </UserProfileServicesProvider>
  </div>;
}
