/** Host presentation contracts owned by SEN. No branded implementation or dependency. */
import type React from 'react';
import type {
  AnchorHTMLAttributes,
  HTMLAttributes,
  MouseEvent,
  ReactNode,
  SVGAttributes,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import type {
  SEIButtonProps as UniversalButtonProps,
  SEIBottomNavigationItem,
  SEIBottomNavigationProps,
} from '@seihouse/ui';

export type NarrativeBottomNavigationItem = SEIBottomNavigationItem;

export type NarrativeBottomNavigationProps = Omit<
  SEIBottomNavigationProps,
  'unstyled' | 'children'
>;

type WithoutPresentation<T> = T extends unknown
  ? Omit<T, 'variant' | 'size' | 'fullWidth' | 'unstyled'>
  : never;
type SEIButtonProps = WithoutPresentation<UniversalButtonProps>;
export type NarrativeButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger';

export type NarrativeButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface NarrativeButtonOwnProps {
  variant?: NarrativeButtonVariant;
  size?: NarrativeButtonSize;
  fullWidth?: boolean;
}

export type NarrativeButtonProps = SEIButtonProps & NarrativeButtonOwnProps;

type NarrativeCardElement = 'article' | 'div' | 'section';

type NarrativeCardMediaElement = 'div' | 'figure';

type NarrativeCardTitleElement = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

type NarrativeCardDescriptionElement = 'p' | 'div' | 'blockquote';

export type NarrativeCardVariant = 'default' | 'callout';

export type NarrativeCardPadding = 'none' | 'sm' | 'md' | 'lg';

interface NarrativeCardRootContentProps {
  variant?: NarrativeCardVariant;
  padding?: NarrativeCardPadding;
  elevateOnHover?: boolean;
  accentColor?: string;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
  titleAs?: NarrativeCardTitleElement;
  description?: ReactNode;
  metadata?: ReactNode;
  media?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
}

type StaticNarrativeCardProps = NarrativeCardRootContentProps &
  Omit<
    HTMLAttributes<HTMLElement>,
    'children' | 'className' | 'onClick' | 'title'
  > & {
    as?: NarrativeCardElement;
    interactive?: false;
    href?: never;
    disabled?: never;
  };

type InteractiveButtonCardProps = NarrativeCardRootContentProps &
  Omit<
    HTMLAttributes<HTMLDivElement>,
    'children' | 'className' | 'onClick' | 'title'
  > & {
    interactive: true;
    href?: never;
    disabled?: boolean;
    onClick: (event: MouseEvent<HTMLDivElement>) => void;
  };

type InteractiveLinkCardProps = NarrativeCardRootContentProps &
  Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    'children' | 'className' | 'href' | 'title'
  > & {
    interactive: true;
    href: string;
    disabled?: boolean;
  };

export type NarrativeCardProps =
  | StaticNarrativeCardProps
  | InteractiveButtonCardProps
  | InteractiveLinkCardProps;

export interface NarrativeCardMediaProps extends HTMLAttributes<HTMLElement> {
  as?: NarrativeCardMediaElement;
}

export interface NarrativeCardContentProps extends HTMLAttributes<HTMLDivElement> {
  padding?: NarrativeCardPadding;
}

export interface NarrativeCardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: NarrativeCardTitleElement;
}

export interface NarrativeCardDescriptionProps extends HTMLAttributes<HTMLElement> {
  as?: NarrativeCardDescriptionElement;
}

export type NarrativeCardBodyProps = HTMLAttributes<HTMLDivElement>;

export type NarrativeCardMetadataProps = HTMLAttributes<HTMLDivElement>;

export type NarrativeCardActionsProps = HTMLAttributes<HTMLDivElement>;

export type NarrativeCardFooterProps = HTMLAttributes<HTMLDivElement>;

export interface NarrativeCardHeaderProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'title'
> {
  eyebrow?: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
  titleAs?: NarrativeCardTitleElement;
  description?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
  iconClassName?: string;
}

export interface NarrativeDragonCycleIconProps extends SVGAttributes<SVGSVGElement> {
  size?: number;
  className?: string;
  title?: string;
  titleId?: string;
  decorative?: boolean;
}

export interface NarrativeHeaderBadgeProps {
  title: string;
  subtitle?: string;
  emblemSrc?: string;
  emblemAlt?: string;
  emblemHref?: string;
  emblemLinkLabel?: string;
  /**
   * `'app-header'` asks the host badge for the compact single-row identity that
   * fits inside application chrome. Hosts without a compact form may ignore it.
   */
  mode?: 'default' | 'app-header';
}

export type NarrativeNavigationDrawerAccent = 'portal' | 'gold';

export interface NarrativeNavigationDrawerItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  accent?: NarrativeNavigationDrawerAccent;
  required?: boolean;
  trailing?: React.ReactNode;
  onSelect?: (id: string) => void;
}

export interface NarrativeNavigationDrawerSection {
  id: string;
  label?: string;
  tagline?: string;
  icon?: React.ReactNode;
  items: NarrativeNavigationDrawerItem[];
  footer?: React.ReactNode;
}

export interface NarrativeNavigationDrawerProfile {
  name: string;
  detail?: string;
  eyebrow?: string;
  emblem?: React.ReactNode;
}

export interface NarrativeNavigationDrawerPanelProps {
  'aria-label': string;
  sections: NarrativeNavigationDrawerSection[];
  profile?: NarrativeNavigationDrawerProfile;
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
}

export interface NarrativeNavigationDrawerProps extends NarrativeNavigationDrawerPanelProps {
  open: boolean;
  onClose: () => void;
  mobileOnly?: boolean;
}

export type NarrativePanelVariant = 'default' | 'callout' | 'footer';

export type NarrativePanelPadding = 'none' | 'sm' | 'md' | 'lg';

type NarrativePanelElement =
  | 'div'
  | 'section'
  | 'article'
  | 'aside'
  | 'header'
  | 'footer';

export interface NarrativePanelProps extends HTMLAttributes<HTMLElement> {
  as?: NarrativePanelElement;
  variant?: NarrativePanelVariant;
  padding?: NarrativePanelPadding;
}

export interface NarrativeSoundGlyphProps extends SVGAttributes<SVGSVGElement> {
  size?: number;
  title?: string;
  titleId?: string;
  decorative?: boolean;
}

export interface NarrativeTextAreaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange' | 'size'
> {
  id?: string;
  label?: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  helpText?: ReactNode;
  error?: string;
  rightElement?: ReactNode;
  icon?: LucideIcon;
  invalid?: boolean;
  size?: 'comfortable' | 'compact';
  variant?: 'glass';
  children?: ReactNode;
}

export type NarrativeTextBoxType =
  | 'text'
  | 'email'
  | 'password'
  | 'search'
  | 'tel'
  | 'url'
  | 'number';

export interface NarrativeTextBoxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'size' | 'type' | 'children'
> {
  id?: string;
  label?: ReactNode;
  value?: string | number;
  onChange?: (value: string) => void;
  helpText?: ReactNode;
  error?: string;
  rightElement?: ReactNode;
  icon?: LucideIcon;
  trailingElement?: ReactNode;
  invalid?: boolean;
  size?: 'comfortable' | 'compact';
  variant?: 'glass';
  type?: NarrativeTextBoxType;
}

export interface CreationButtonOwnProps {
  size?: NarrativeButtonSize;
  fullWidth?: boolean;
}

export type CreationButtonProps = SEIButtonProps & CreationButtonOwnProps;

export interface AmbientEffectProps {
  accent?: string;
  foregroundSelector?: string;
  foregroundPadding?: number;
  speedScale?: number;
  dispersion?: number;
}
