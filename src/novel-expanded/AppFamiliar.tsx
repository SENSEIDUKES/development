import { useEffect, useMemo, useState, type ReactNode, type RefObject } from 'react';
import type { FrontDeskGuide } from '@seihouse/front-desk';
import { createBrowserVoice, createWakeWord } from '@seihouse/front-desk/engines';
import { FamiliarCompanion, FamiliarFrontDesk, FamiliarPlace, FamiliarRecall, type FamiliarHelpPlace, type FamiliarPage } from '@seihouse/library/familiar';
import type { UserProfile } from '@seihouse/library/profile';
import { WorkspaceHeaderAccessoryProvider, useLibraryBottomClearance } from '@seihouse/library/shell';
import { allFamiliarOptions, defaultFamiliar, familiarCatalogueEntry } from '../host/familiar/catalogue';
import { useFamiliarLive } from '../host/familiar/liveTalk';
import { appFamiliarActions } from './appFamiliarActions';
import { canGoBack, type Navigate } from './routes';

/** The space the Familiar keeps above the bottom bar and the music note floating over it. */
const BOTTOM_GAP = 8;
/** In the Reader, the space it keeps above the Reader's bottom bar and its story audio note. */
const READER_BOTTOM = 136;

/**
 * The reader's equipped Familiar: one companion for the whole app, so it keeps
 * its place from page to page. It waits in the header by default (Familiar page → settings → Keep in the
 * header, on unless the reader turns it off): minimized, its recall in every
 * Library header (beside the music note on laptops), until they call it; with
 * that setting off it floats over the page.
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
 * Its Guides button opens its own card beside it, on any page, and plays
 * `guides` there (the screen dims a little; nothing navigates). It does not
 * greet a new reader by itself: the app's welcome (the System voice, then
 * Create and Discover) comes first and hands over to the Familiar
 * (SENSEI, 2026-11-03).
 * `tucked` (the Familiar page, where it already stands on the stage) sends a
 * floating Familiar to the header until the reader calls it; leaving the page
 * returns it to the reader's choice.
 */
export function AppFamiliar({ profile, present, reading = false, place, navigate, guides, onGuideSeen, tucked = false, boundaryRef, children }: { profile: UserProfile; present: boolean; reading?: boolean; tucked?: boolean; guides?: readonly FrontDeskGuide[]; onGuideSeen?: (guideId: string) => void; place: { title: string; help: FamiliarHelpPlace; page?: FamiliarPage }; navigate?: Navigate; boundaryRef?: RefObject<HTMLElement | null>; children: ReactNode }) {
  const inHeader = profile.familiarInHeader ?? true;
  const [minimized, setMinimized] = useState(inHeader);
  // Changing the setting moves it at once, on the Familiar page too.
  useEffect(() => { setMinimized(inHeader); }, [inHeader]);
  // Arriving on the Familiar page tucks it away; leaving returns it to the reader's choice.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setMinimized(inHeader || tucked); }, [tucked]);
  const [voice] = useState(createBrowserVoice);
  const live = useFamiliarLive();
  const [wake] = useState(createWakeWord);
  const familiar = (familiarCatalogueEntry(profile.familiarId) ?? defaultFamiliar).definition;
  const clearance = useLibraryBottomClearance();
  const bottomInset = reading ? READER_BOTTOM : clearance ? clearance + BOTTOM_GAP : 0;
  // "Take me back" is offered everywhere but the Home the app was opened on, where there is nothing behind.
  const back = Boolean(navigate) && canGoBack(place.page === 'home');
  const actions = useMemo(() => navigate ? appFamiliarActions(navigate, { back }) : undefined, [navigate, back]);
  const welcomeOption = allFamiliarOptions.find(option => option.id === familiar.id);
  const recall = present && minimized ? <FamiliarRecall key={familiar.id} familiar={familiar} onRecall={() => setMinimized(false)} /> : null;
  // The Familiar's guides: its Guides button opens its card anywhere; a reader who has not met it is greeted once.
  const familiarGuides = useMemo(() => welcomeOption && guides?.length ? {
    guides, familiar: welcomeOption, name: profile.familiarPersonal?.[familiar.id]?.name, onSeen: onGuideSeen,
  } : undefined, [guides, welcomeOption, profile.familiarPersonal, familiar.id, onGuideSeen]);
  return <FamiliarFrontDesk voice={voice} live={profile.familiarLiveTalk ? live : undefined} wake={profile.familiarWakeWord ? wake : undefined} familiar={{ name: familiar.displayName, description: familiar.description }} guides={familiarGuides} bottomInset={bottomInset}><WorkspaceHeaderAccessoryProvider accessory={recall}>
    <FamiliarPlace title={place.title} help={place.help} page={place.page} actions={actions} />
    {children}
    {present && <FamiliarCompanion key={familiar.id} familiar={familiar} size={profile.familiarSize}
      boundaryRef={boundaryRef} minimized={minimized} onMinimize={() => setMinimized(true)} bottomInset={bottomInset} />}
  </WorkspaceHeaderAccessoryProvider></FamiliarFrontDesk>;
}
