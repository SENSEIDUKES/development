import type { ReactNode } from 'react';
import * as LibraryUI from '@seihouse/library-ui';
import {
  NarrativePresentationProvider,
  NarrativeArtProvider,
  type NarrativeIconProps,
  type NarrativePresentation,
} from '@seihouse/sen/presentation';
import { SENCharactersIcon, SENSettingsIcon, SENSearchIcon, SENManifestingIcon } from '../sen-icons';

function LibraryNarrativeIcon({ name, ...props }: NarrativeIconProps) {
  const icons = { characters: SENCharactersIcon, settings: SENSettingsIcon, search: SENSearchIcon, generating: SENManifestingIcon };
  const Icon = icons[name];
  return <Icon {...props} />;
}

const components = {
  NarrativePanel: LibraryUI.LibraryPanel,
  NarrativeButton: LibraryUI.LibraryButton,
  CreationButton: LibraryUI.ManifestButton,
  NarrativeTextBox: LibraryUI.LibraryTextBox,
  NarrativeTextArea: LibraryUI.LibraryTextArea,
  NarrativeHeaderBadge: LibraryUI.LibraryHeaderBadge,
  NarrativeNavigationDrawer: LibraryUI.LibraryNavigationDrawer,
  NarrativeNavigationDrawerPanel: LibraryUI.LibraryNavigationDrawerPanel,
  NarrativeBottomNavigation: LibraryUI.LibraryBottomNavigation,
  NarrativeDragonCycleIcon: LibraryUI.LibraryDragonCycleIcon,
  NarrativeSoundGlyph: LibraryUI.LibrarySoundGlyph,
  AmbientEffect: LibraryUI.ParticleEffect,
  NarrativeCard: LibraryUI.LibraryCard,
  NarrativeCardMedia: LibraryUI.LibraryCardMedia,
  NarrativeCardContent: LibraryUI.LibraryCardContent,
  NarrativeCardHeader: LibraryUI.LibraryCardHeader,
  NarrativeCardTitle: LibraryUI.LibraryCardTitle,
  NarrativeCardDescription: LibraryUI.LibraryCardDescription,
  NarrativeCardBody: LibraryUI.LibraryCardBody,
  NarrativeCardMetadata: LibraryUI.LibraryCardMetadata,
  NarrativeCardActions: LibraryUI.LibraryCardActions,
  NarrativeCardFooter: LibraryUI.LibraryCardFooter,
} satisfies NarrativePresentation;

/** First-party composition: all SEN descendants use the canonical Library skin. */
export function LibraryPresentationProvider({
  children,
  backdrops = [],
}: {
  children: ReactNode;
  backdrops?: readonly string[];
}) {
  return (
    <NarrativePresentationProvider components={components}>
      <NarrativeArtProvider value={{ Icon: LibraryNarrativeIcon, backdrops }}>{children}</NarrativeArtProvider>
    </NarrativePresentationProvider>
  );
}
