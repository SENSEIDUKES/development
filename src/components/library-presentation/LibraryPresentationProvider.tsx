import type { ReactNode } from 'react';
import * as LibraryUI from '@seihouse/library-ui';
import {
  NarrativePresentationProvider,
  type NarrativePresentation,
} from '@seihouse/sen/presentation';

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
}: {
  children: ReactNode;
}) {
  return (
    <NarrativePresentationProvider components={components}>
      {children}
    </NarrativePresentationProvider>
  );
}
