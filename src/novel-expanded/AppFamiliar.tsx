import { useState, type ReactNode } from 'react';
import { FamiliarCompanion, FamiliarRecall } from '@seihouse/library/familiar';
import type { UserProfile } from '@seihouse/library/profile';
import { WorkspaceHeaderAccessoryProvider, useLibraryBottomClearance } from '@seihouse/library/shell';
import { defaultFamiliar, familiarCatalogueEntry } from '../host/familiar/catalogue';

/** The space the Familiar keeps above the bottom bar and the music note floating over it. */
const BOTTOM_GAP = 8;
/** In the Reader, the space it keeps above the Reader's bottom bar and its story audio note. */
const READER_BOTTOM = 136;

/**
 * The reader's equipped Familiar: one companion for the whole app, so it keeps
 * its place from page to page. It starts minimized, its recall in every
 * Library header (beside the music note on laptops); summoned, it floats over
 * the page, starting at the bottom right above the bottom bar and the music
 * note on phones and tablets, and above the page's corner on laptops. It
 * follows the profile: a Familiar or size chosen in the Cave changes it at
 * once. In the Reader (`reading`) its recall is in the Reader's top bar beside
 * Fate (the Library hands it over), and summoned it floats above the Reader's
 * bottom bar. It sits under the economy's providers: its Energy panel reads
 * the reader's account.
 */
export function AppFamiliar({ profile, present, reading = false, children }: { profile: UserProfile; present: boolean; reading?: boolean; children: ReactNode }) {
  const [minimized, setMinimized] = useState(true);
  const familiar = (familiarCatalogueEntry(profile.familiarId) ?? defaultFamiliar).definition;
  const clearance = useLibraryBottomClearance();
  const recall = present && minimized ? <FamiliarRecall key={familiar.id} familiar={familiar} onRecall={() => setMinimized(false)} /> : null;
  return <WorkspaceHeaderAccessoryProvider accessory={recall}>
    {children}
    {present && <FamiliarCompanion key={familiar.id} familiar={familiar} size={profile.familiarSize}
      minimized={minimized} onMinimize={() => setMinimized(true)} bottomInset={reading ? READER_BOTTOM : clearance ? clearance + BOTTOM_GAP : 0} />}
  </WorkspaceHeaderAccessoryProvider>;
}
