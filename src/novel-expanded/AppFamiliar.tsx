import { useEffect, useMemo, useState, type ReactNode, type RefObject } from 'react';
import { FamiliarCompanion, FamiliarPlace, FamiliarRecall, FamiliarHelperProvider, FamiliarWelcome, type FamiliarHelpPlace, type FamiliarPage } from '@seihouse/library/familiar';
import type { UserProfile } from '@seihouse/library/profile';
import { WorkspaceHeaderAccessoryProvider, useLibraryBottomClearance } from '@seihouse/library/shell';
import { allFamiliarOptions, defaultFamiliar, familiarCatalogueEntry } from '../host/familiar/catalogue';
import { createFamiliarBrowserVoice } from '../host/familiar/voice';
import { useFamiliarLive } from '../host/familiar/liveTalk';
import { createFamiliarWakeWord } from '../host/familiar/wakeWord';
import { appFamiliarActions } from './appFamiliarActions';
import type { Navigate } from './routes';

/** The space the Familiar keeps above the bottom bar and the music note floating over it. */
const BOTTOM_GAP = 8;
/** In the Reader, the space it keeps above the Reader's bottom bar and its story audio note. */
const READER_BOTTOM = 136;

/**
 * The reader's equipped Familiar: one companion for the whole app, so it keeps
 * its place from page to page. It floats over the page unless the reader keeps
 * it in the header (Familiar page → settings → Keep in the header): minimized, its
 * recall in every Library header (beside the music note on laptops).
 * Floating, it starts at the bottom right above the bottom bar and the music
 * note on phones and tablets, and above the page's corner on laptops. It
 * follows the profile: a Familiar or size chosen in the Cave changes it at
 * once. In the Reader (`reading`) its recall is in the Reader's top bar beside
 * Reader Settings (the Library hands it over), and summoned it floats above the Reader's
 * bottom bar. It sits under the economy's providers: its Energy panel reads
 * the reader's account. `place` is the page, for the Familiar's Explain.
 * With Familiar page → settings → Live talk (beta) on, and where the server offers
 * it, its microphone starts a live conversation with the equipped Familiar.
 * With Say “Familiar” (beta) on, saying the word calls it as its microphone does.
 * With `navigate`, it can take the reader anywhere in the app (Home, My Energy,
 * Settings…), as the master action list allows on `place.page`.
 * With `onWelcomed`, a reader who has not met their Familiar yet is greeted
 * once (outside the Reader): Show me around opens the Familiar page's Guides.
 * Either answer calls `onWelcomed`, so it never shows again.
 * `tucked` (the Familiar page, where it already stands on the stage) sends a
 * floating Familiar to the header until the reader calls it; leaving the page
 * returns it to the reader's choice.
 */
export function AppFamiliar({ profile, present, reading = false, place, navigate, onWelcomed, tucked = false, boundaryRef, children }: { profile: UserProfile; present: boolean; reading?: boolean; tucked?: boolean; place: { title: string; help: FamiliarHelpPlace; page?: FamiliarPage }; navigate?: Navigate; onWelcomed?: () => void; boundaryRef?: RefObject<HTMLElement | null>; children: ReactNode }) {
  const inHeader = profile.familiarInHeader ?? false;
  const [minimized, setMinimized] = useState(inHeader);
  // Changing the setting moves it at once, on the Familiar page too.
  useEffect(() => { setMinimized(inHeader); }, [inHeader]);
  // Arriving on the Familiar page tucks it away; leaving returns it to the reader's choice.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setMinimized(inHeader || tucked); }, [tucked]);
  const [voice] = useState(createFamiliarBrowserVoice);
  const live = useFamiliarLive();
  const [wake] = useState(createFamiliarWakeWord);
  const familiar = (familiarCatalogueEntry(profile.familiarId) ?? defaultFamiliar).definition;
  const clearance = useLibraryBottomClearance();
  const bottomInset = reading ? READER_BOTTOM : clearance ? clearance + BOTTOM_GAP : 0;
  const actions = useMemo(() => navigate ? appFamiliarActions(navigate) : undefined, [navigate]);
  const welcomeOption = allFamiliarOptions.find(option => option.id === familiar.id);
  const welcoming = Boolean(present && !reading && onWelcomed && !profile.familiarWelcomed && welcomeOption);
  const recall = present && minimized ? <FamiliarRecall key={familiar.id} familiar={familiar} onRecall={() => setMinimized(false)} /> : null;
  return <FamiliarHelperProvider voice={voice} live={profile.familiarLiveTalk ? live : undefined} wake={profile.familiarWakeWord ? wake : undefined} familiar={{ name: familiar.displayName, description: familiar.description }} bottomInset={bottomInset}><WorkspaceHeaderAccessoryProvider accessory={recall}>
    <FamiliarPlace title={place.title} help={place.help} page={place.page} actions={actions} />
    {children}
    {welcoming && <FamiliarWelcome familiar={welcomeOption!} name={profile.familiarPersonal?.[familiar.id]?.name}
      onLater={onWelcomed!}
      onShowAround={() => { onWelcomed!(); navigate?.({ page: 'profile', cave: '/home/familiar/guides' }); }} />}
    {present && !welcoming && <FamiliarCompanion key={familiar.id} familiar={familiar} size={profile.familiarSize}
      boundaryRef={boundaryRef} minimized={minimized} onMinimize={() => setMinimized(true)} bottomInset={bottomInset} />}
  </WorkspaceHeaderAccessoryProvider></FamiliarHelperProvider>;
}
