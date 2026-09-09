import { useState } from 'react';
import { MainLibraryHeader } from '../../../components/library-shell/development/MainLibraryHeader';
import { MainLibraryPreview } from './MainLibraryPreview';
import { StorySeedWorkspace } from '../story-seed/StorySeedWorkspace';
import { UserProfileWorkspace } from '../user-profile/UserProfileWorkspace';
import type { PreviewState } from '../story-seed/previewStates';
import type { UserProfilePreviewState } from '../user-profile/previewStates';
import type { HeaderConfiguration } from './headerPreviewData';
import { HeaderSlotPreview } from './HeaderSlotPreview';

/** Exercise the real Development consumers with their existing Workshop adapters. */
export function DevelopmentHeaderPreview({ source, state }: { source: HeaderConfiguration; state: string }) {
  const [message, setMessage] = useState('Local preview ready.');
  if (source === 'header-states') return <HeaderSlotPreview state={state} />;
  if (source === 'main-library') return <MainLibraryPreview state={state} developmentHeader={adapter =>
    <MainLibraryHeader adapter={{ ...adapter, copyText: async text => { setMessage(`Local preview clipboard: ${text}`); } }} />
  } extraFeedback={message} />;
  if (source === 'story-seed') return <StorySeedWorkspace embedded localGeneration initialState={state as PreviewState} />;
  return <UserProfileWorkspace embedded initialState={state as UserProfilePreviewState} />;
}
