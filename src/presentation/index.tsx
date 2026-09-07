import React, { createContext, useContext } from 'react';
import * as UI from '@seihouse/ui';
import * as D from './defaults';
import type * as P from './contracts';
export type * from './contracts';

/** Stable host presentation slots. The defaults use only universal SEIHouse UI. */
export interface NarrativePresentation {
  NarrativePanel: React.ComponentType<P.NarrativePanelProps>;
  NarrativeButton: React.ComponentType<
    P.NarrativeButtonProps & React.RefAttributes<HTMLButtonElement>
  >;
  CreationButton: React.ComponentType<
    P.CreationButtonProps & React.RefAttributes<HTMLButtonElement>
  >;
  NarrativeTextBox: React.ComponentType<
    P.NarrativeTextBoxProps & React.RefAttributes<HTMLInputElement>
  >;
  NarrativeTextArea: React.ComponentType<
    P.NarrativeTextAreaProps & React.RefAttributes<HTMLTextAreaElement>
  >;
  NarrativeHeaderBadge: React.ComponentType<P.NarrativeHeaderBadgeProps>;
  NarrativeNavigationDrawer: React.ComponentType<P.NarrativeNavigationDrawerProps>;
  NarrativeNavigationDrawerPanel: React.ComponentType<P.NarrativeNavigationDrawerPanelProps>;
  NarrativeBottomNavigation: React.ComponentType<P.NarrativeBottomNavigationProps>;
  NarrativeDragonCycleIcon: React.ComponentType<P.NarrativeDragonCycleIconProps>;
  NarrativeSoundGlyph: React.ComponentType<P.NarrativeSoundGlyphProps>;
  AmbientEffect: React.ComponentType<P.AmbientEffectProps>;
  NarrativeCard: React.ComponentType<P.NarrativeCardProps>;
  NarrativeCardMedia: React.ComponentType<P.NarrativeCardMediaProps>;
  NarrativeCardContent: React.ComponentType<P.NarrativeCardContentProps>;
  NarrativeCardHeader: React.ComponentType<P.NarrativeCardHeaderProps>;
  NarrativeCardTitle: React.ComponentType<P.NarrativeCardTitleProps>;
  NarrativeCardDescription: React.ComponentType<P.NarrativeCardDescriptionProps>;
  NarrativeCardBody: React.ComponentType<P.NarrativeCardBodyProps>;
  NarrativeCardMetadata: React.ComponentType<P.NarrativeCardMetadataProps>;
  NarrativeCardActions: React.ComponentType<P.NarrativeCardActionsProps>;
  NarrativeCardFooter: React.ComponentType<P.NarrativeCardFooterProps>;
}
const defaults: NarrativePresentation = {
  NarrativePanel: D.Panel,
  NarrativeButton: D.Button,
  CreationButton: D.Button,
  NarrativeTextBox: D.TextBox,
  NarrativeTextArea: D.TextArea,
  NarrativeHeaderBadge: D.HeaderBadge,
  NarrativeNavigationDrawer: D.NavigationDrawer,
  NarrativeNavigationDrawerPanel: D.NavigationDrawerPanel,
  NarrativeBottomNavigation: UI.SEIBottomNavigation,
  NarrativeDragonCycleIcon: D.CycleIcon,
  NarrativeSoundGlyph: D.SoundGlyph,
  AmbientEffect: D.AmbientEffect,
  NarrativeCard: D.Card,
  NarrativeCardMedia: UI.SEICardMedia,
  NarrativeCardContent: UI.SEICardContent,
  NarrativeCardHeader: UI.SEICardHeader,
  NarrativeCardTitle: UI.SEICardTitle,
  NarrativeCardDescription: UI.SEICardDescription,
  NarrativeCardBody: UI.SEICardBody,
  NarrativeCardMetadata: UI.SEICardMetadata,
  NarrativeCardActions: UI.SEICardActions,
  NarrativeCardFooter: UI.SEICardFooter,
};
const PresentationContext = createContext<NarrativePresentation>(defaults);
export function NarrativePresentationProvider({
  components,
  children,
}: {
  components: Partial<NarrativePresentation>;
  children: React.ReactNode;
}) {
  const parent = useContext(PresentationContext);
  const value = React.useMemo(
    () => ({ ...parent, ...components }),
    [parent, components],
  );
  return (
    <PresentationContext.Provider value={value}>
      {children}
    </PresentationContext.Provider>
  );
}
export function NarrativePanel(props: P.NarrativePanelProps) {
  const Component = useContext(PresentationContext).NarrativePanel;
  return <Component {...props} />;
}
export function NarrativeButton(
  props: P.NarrativeButtonProps & React.RefAttributes<HTMLButtonElement>,
) {
  const Component = useContext(PresentationContext).NarrativeButton;
  return <Component {...props} />;
}
export function CreationButton(
  props: P.CreationButtonProps & React.RefAttributes<HTMLButtonElement>,
) {
  const Component = useContext(PresentationContext).CreationButton;
  return <Component {...props} />;
}
export function NarrativeTextBox(
  props: P.NarrativeTextBoxProps & React.RefAttributes<HTMLInputElement>,
) {
  const Component = useContext(PresentationContext).NarrativeTextBox;
  return <Component {...props} />;
}
export function NarrativeTextArea(
  props: P.NarrativeTextAreaProps & React.RefAttributes<HTMLTextAreaElement>,
) {
  const Component = useContext(PresentationContext).NarrativeTextArea;
  return <Component {...props} />;
}
export function NarrativeHeaderBadge(props: P.NarrativeHeaderBadgeProps) {
  const Component = useContext(PresentationContext).NarrativeHeaderBadge;
  return <Component {...props} />;
}
export function NarrativeNavigationDrawer(
  props: P.NarrativeNavigationDrawerProps,
) {
  const Component = useContext(PresentationContext).NarrativeNavigationDrawer;
  return <Component {...props} />;
}
export function NarrativeNavigationDrawerPanel(
  props: P.NarrativeNavigationDrawerPanelProps,
) {
  const Component =
    useContext(PresentationContext).NarrativeNavigationDrawerPanel;
  return <Component {...props} />;
}
export function NarrativeBottomNavigation(
  props: P.NarrativeBottomNavigationProps,
) {
  const Component = useContext(PresentationContext).NarrativeBottomNavigation;
  return <Component {...props} />;
}
export function NarrativeDragonCycleIcon(
  props: P.NarrativeDragonCycleIconProps,
) {
  const Component = useContext(PresentationContext).NarrativeDragonCycleIcon;
  return <Component {...props} />;
}
export function NarrativeSoundGlyph(props: P.NarrativeSoundGlyphProps) {
  const Component = useContext(PresentationContext).NarrativeSoundGlyph;
  return <Component {...props} />;
}
export function AmbientEffect(props: P.AmbientEffectProps) {
  const Component = useContext(PresentationContext).AmbientEffect;
  return <Component {...props} />;
}
export function NarrativeCard(props: P.NarrativeCardProps) {
  const Component = useContext(PresentationContext).NarrativeCard;
  return <Component {...props} />;
}
export function NarrativeCardMedia(props: P.NarrativeCardMediaProps) {
  const Component = useContext(PresentationContext).NarrativeCardMedia;
  return <Component {...props} />;
}
export function NarrativeCardContent(props: P.NarrativeCardContentProps) {
  const Component = useContext(PresentationContext).NarrativeCardContent;
  return <Component {...props} />;
}
export function NarrativeCardHeader(props: P.NarrativeCardHeaderProps) {
  const Component = useContext(PresentationContext).NarrativeCardHeader;
  return <Component {...props} />;
}
export function NarrativeCardTitle(props: P.NarrativeCardTitleProps) {
  const Component = useContext(PresentationContext).NarrativeCardTitle;
  return <Component {...props} />;
}
export function NarrativeCardDescription(
  props: P.NarrativeCardDescriptionProps,
) {
  const Component = useContext(PresentationContext).NarrativeCardDescription;
  return <Component {...props} />;
}
export function NarrativeCardBody(props: P.NarrativeCardBodyProps) {
  const Component = useContext(PresentationContext).NarrativeCardBody;
  return <Component {...props} />;
}
export function NarrativeCardMetadata(props: P.NarrativeCardMetadataProps) {
  const Component = useContext(PresentationContext).NarrativeCardMetadata;
  return <Component {...props} />;
}
export function NarrativeCardActions(props: P.NarrativeCardActionsProps) {
  const Component = useContext(PresentationContext).NarrativeCardActions;
  return <Component {...props} />;
}
export function NarrativeCardFooter(props: P.NarrativeCardFooterProps) {
  const Component = useContext(PresentationContext).NarrativeCardFooter;
  return <Component {...props} />;
}
