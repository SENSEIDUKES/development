import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MainLibraryHeader, WorkspaceHeaderPreferencesProvider, WorkspaceHeaderProfileProvider, useMenuMusic, type LibraryLocation, type WorkspaceHeaderProfile } from '@seihouse/library/shell';
import { LibraryLook } from '@seihouse/library/presentation';
import { StoryAuthGate } from '@seihouse/library/story-seed';
import { getPreviewScenario } from '../user-profile/previewData';
import { WORKSHOP_SOUND_PREFERENCES } from '../user-profile/mockUserProfileServices';
import { MainLibraryPreview } from './MainLibraryPreview';
import { StorySeedWorkspace } from '../story-seed/StorySeedWorkspace';
import { UserProfileWorkspace } from '../user-profile/UserProfileWorkspace';
import type { PreviewState } from '../story-seed/previewStates';
import type { UserProfilePreviewState } from '../user-profile/previewStates';
import type { HeaderConfiguration } from './headerPreviewData';
import { libraryPreviewUrl, navigateLibraryPreview, readLibraryPreviewLocation } from './libraryPreviewNavigation';
import { HeaderSlotPreview } from './HeaderSlotPreview';
import { ProductFamiliarSession, ProductFamiliarSurface } from '../familiar/ProductFamiliarPreview';

const fixtureReader = getPreviewScenario('developed-cultivator').profile;

/**
 * Exercise the real Development consumers with their existing Workshop adapters.
 * The Profile Portrait wears a fixture reader, as the app supplies its own:
 * Your profile and Settings open the preview's Cave, and Sign in opens the
 * Library's sign-in screen marked not connected, as in the app.
 */
export function DevelopmentHeaderPreview({ source, state }: { source: HeaderConfiguration; state: string }) {
  const [menuMusic, onMenuMusicChange] = useMenuMusic(WORKSHOP_SOUND_PREFERENCES);
  const [signInOpen, setSignInOpen] = useState(false);
  const profile = useMemo<WorkspaceHeaderProfile>(() => ({
    name: fixtureReader?.displayName?.trim() || 'Cultivator',
    detail: 'Reader',
    avatarUrl: fixtureReader?.avatarUrl || undefined,
    onOpenProfile: () => navigateLibraryPreview({ screen: 'profile' }),
    onOpenSettings: () => navigateLibraryPreview({ screen: 'profile', cave: '/settings' }),
    signIn: { onSignIn: () => setSignInOpen(true), note: 'Not connected yet' },
  }), []);
  return <WorkspaceHeaderProfileProvider profile={profile}>
    <WorkspaceHeaderPreferencesProvider preferences={{ menuMusic, onMenuMusicChange }}>
      <DevelopmentHeaderContent source={source} state={state} />
    </WorkspaceHeaderPreferencesProvider>
    {signInOpen && createPortal(<LibraryLook className="fixed inset-0 z-[120]" data-testid="library-shell-sign-in">
      <StoryAuthGate context="spirit-link" onClose={() => setSignInOpen(false)}
        description="Sign in to keep your stories, Familiars and progress, and return to them from any device."
        unavailableNote="Accounts are coming. Sign-in is not connected yet, so nothing is sent."
        reassurance="Your stories stay saved on this device." />
    </LibraryLook>, document.body)}
  </WorkspaceHeaderProfileProvider>;
}

function DevelopmentHeaderContent({ source, state }: { source: HeaderConfiguration; state: string }) {
  const [message, setMessage] = useState('Local preview ready.');
  if (source === 'header-states') return <HeaderSlotPreview state={state} />;
  if (source === 'main-library' || source === 'cultivator-cave') {
    const app = <LibraryAppPreview source={source} state={state} message={message} setMessage={setMessage} />;
    return <ProductFamiliarSession initialState={source === 'cultivator-cave' ? state as UserProfilePreviewState : state === 'guest' ? 'signed-out' : 'developed-cultivator'}>
      <ProductFamiliarSurface viewport headerRecall bottomInset={72}>{app}</ProductFamiliarSurface>
    </ProductFamiliarSession>;
  }
  if (source === 'story-seed') return <ProductFamiliarSession>
    <ProductFamiliarSurface viewport headerRecall bottomInset={72}>
      <StorySeedWorkspace embedded localGeneration initialState={state as PreviewState} />
    </ProductFamiliarSurface>
  </ProductFamiliarSession>;
  return null;
}

/** Keep each visited screen's local state while its existing shell is inactive. */
function LibraryAppPreview({ source, state, message, setMessage }: { source: HeaderConfiguration; state: string; message: string; setMessage: (value: string) => void }) {
  const readProfile = () => readLibraryPreviewLocation(state).screen === 'profile';
  const [profile, setProfile] = useState(readProfile);
  const [profileVisited, setProfileVisited] = useState(readProfile);
  useEffect(() => {
    const sync = () => { const next = readProfile(); setProfile(next); if (next) setProfileVisited(true); };
    const navigate = (event: Event) => {
      const target = (event as CustomEvent<LibraryLocation>).detail;
      if (target.screen === 'creator') return;
      event.preventDefault();
      window.history.pushState(window.history.state, '', libraryPreviewUrl(target));
      window.dispatchEvent(new PopStateEvent('popstate'));
    };
    window.addEventListener('library-preview-navigate', navigate);
    window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('library-preview-navigate', navigate); window.removeEventListener('popstate', sync); };
  }, [state]);

  const copyText = async (text: string) => { setMessage(`Local preview clipboard: ${text}`); };
  return <>
    <div hidden={profile}>
      <MainLibraryPreview state={source === 'cultivator-cave' ? 'linked' : state} developmentNavigation active={!profile}
        developmentHeader={adapter => <MainLibraryHeader adapter={{ ...adapter, copyText }} landmark="none" />}
        extraFeedback={message} />
    </div>
    {profileVisited && <div hidden={!profile}><UserProfileWorkspace embedded initialState={source === 'cultivator-cave' ? state as UserProfilePreviewState : 'developed-cultivator'} /></div>}
  </>;
}
