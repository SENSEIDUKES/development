import { useEffect, useState } from 'react';
import { MainLibraryHeader, MainLibraryHomeInsights, WorkspaceHeaderCenterProvider, WorkspaceHeaderPreferencesProvider, useMenuMusic, type LibraryLocation } from '@seihouse/library/shell';
import { WORKSHOP_SOUND_PREFERENCES } from '../user-profile/mockUserProfileServices';
import { MainLibraryPreview } from './MainLibraryPreview';
import { StorySeedWorkspace } from '../story-seed/StorySeedWorkspace';
import { UserProfileWorkspace } from '../user-profile/UserProfileWorkspace';
import type { PreviewState } from '../story-seed/previewStates';
import type { UserProfilePreviewState } from '../user-profile/previewStates';
import type { HeaderConfiguration } from './headerPreviewData';
import { libraryPreviewUrl, readLibraryPreviewLocation } from './libraryPreviewNavigation';
import { HeaderSlotPreview } from './HeaderSlotPreview';
import { ProductFamiliarSession, ProductFamiliarSurface } from '../familiar/ProductFamiliarPreview';

/** Exercise the real Development consumers with their existing Workshop adapters. */
export function DevelopmentHeaderPreview({ source, state }: { source: HeaderConfiguration; state: string }) {
  const [menuMusic, onMenuMusicChange] = useMenuMusic(WORKSHOP_SOUND_PREFERENCES);
  return <WorkspaceHeaderPreferencesProvider preferences={{ menuMusic, onMenuMusicChange }}>
    <DevelopmentHeaderContent source={source} state={state} />
  </WorkspaceHeaderPreferencesProvider>;
}

function DevelopmentHeaderContent({ source, state }: { source: HeaderConfiguration; state: string }) {
  const [message, setMessage] = useState('Local preview ready.');
  const copyText = async (text: string) => { setMessage(`Local preview clipboard: ${text}`); };
  const headerCenter = <MainLibraryHomeInsights everyWidth adapter={{ copyText }} />;
  if (source === 'header-states') return <HeaderSlotPreview state={state} />;
  if (source === 'main-library' || source === 'cultivator-cave') {
    const app = <WorkspaceHeaderCenterProvider center={headerCenter} centerBreakpoint="always">
      <LibraryAppPreview source={source} state={state} message={message} setMessage={setMessage} />
    </WorkspaceHeaderCenterProvider>;
    if (new URLSearchParams(window.location.search).get('homeReference') === '1') return app;
    return <ProductFamiliarSession initialState={source === 'cultivator-cave' ? state as UserProfilePreviewState : state === 'guest' ? 'signed-out' : 'developed-cultivator'}>
      <ProductFamiliarSurface viewport headerRecall bottomInset={72}>{app}</ProductFamiliarSurface>
    </ProductFamiliarSession>;
  }
  if (source === 'story-seed') return <WorkspaceHeaderCenterProvider center={headerCenter} centerBreakpoint="always">
    <ProductFamiliarSession>
      <ProductFamiliarSurface viewport headerRecall bottomInset={72}>
        <StorySeedWorkspace embedded localGeneration initialState={state as PreviewState} />
      </ProductFamiliarSurface>
    </ProductFamiliarSession>
  </WorkspaceHeaderCenterProvider>;
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
  const isHomeReference = new URLSearchParams(window.location.search).get('homeReference') === '1';
  return <>
    <div hidden={profile}>
      <MainLibraryPreview state={source === 'cultivator-cave' ? 'linked' : state} developmentNavigation active={!profile}
        homeReference={isHomeReference}
        developmentHeader={adapter => <MainLibraryHeader adapter={{ ...adapter, copyText }} landmark="none" />}
        developmentHomeContent={isHomeReference ? adapter => <MainLibraryHomeInsights adapter={{ ...adapter, copyText }} /> : undefined}
        extraFeedback={message} />
    </div>
    {profileVisited && <div hidden={!profile}><UserProfileWorkspace embedded initialState={source === 'cultivator-cave' ? state as UserProfilePreviewState : 'developed-cultivator'} /></div>}
  </>;
}
