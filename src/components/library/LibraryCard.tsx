import { Children, Fragment, isValidElement } from 'react';
import type {
  AnchorHTMLAttributes,
  CSSProperties,
  ElementType,
  HTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from 'react';

import { cn } from './cn';
import { SPECTRAL_EDGE } from './LibraryPanel';

/**
 * LibraryCard — the official Celestial Library card.
 *
 * Ported from the SEIHouse UI repo's `SEICard`
 * (`UI/packages/seihouse-ui/src/primitives/sei-card.tsx` +
 * `seiCardVariants` in `UI/packages/seihouse-ui/src/styles/variants.ts`),
 * source commit `53fb8934e7b126807194654c9af10a504b4db6e8` on UI `main`
 * (inspected 2026-08-15). The original composes `tailwind-variants` and the
 * SEIHouse `--sh-*` theme variables, which this repository does not carry;
 * this port keeps the same component shape — the static / interactive-link /
 * interactive-button contract, the composable regions, the convenience
 * content props, `cn` composition, and the `data-slot` hooks — on plain
 * class maps and the Library theme tokens, following the LibraryPanel port.
 *
 * The skin is the LibraryPanel glass at card scale: translucent black-blue
 * depth with a top-light falloff, backdrop blur that lightens on small
 * screens, the strengthened inner rim lighting and portal/gold rim glow, and
 * the shared masked 1px spectral edge. A card is not a panel: `LibraryPanel`
 * remains the section container; `LibraryCard` is the composable item
 * primitive (media / content / header / title / description / body /
 * metadata / actions / footer) that future Library cards build on.
 *
 * Accent identity: pass `accentColor` with an entity-category or Relic-rarity
 * color. It drives the top accent hairline (painted on `after:` — `before:`
 * belongs to the spectral edge), the icon well, and the hover border/glow
 * through the `--library-card-accent*` custom properties.
 *
 * Variants are deliberately minimal:
 * - `default` — the main glass card.
 * - `callout` — the quieter gold-tinted inset glass for guidance / notice
 *   cards.
 *
 * Use `elevateOnHover` for a visual-only hover treatment. To make a whole
 * card actionable, set `interactive` and supply either `href` (a native
 * link) or `onClick` (a keyboard-operable button role; Enter and Space both
 * activate it, and disabled cards are removed from the tab order). Do not
 * place interactive descendants inside an interactive card.
 *
 * Usage:
 *   <LibraryCard title="…" description="…" footer="…" />
 *   <LibraryCard interactive href="/library/relics/compass" accentColor="#F59E0B" … />
 *   <LibraryCard padding="none" accentColor="var(--color-entity-mc)">
 *     <LibraryCardMedia as="figure">…</LibraryCardMedia>
 *     <LibraryCardContent padding="md">…</LibraryCardContent>
 *   </LibraryCard>
 */

type LibraryCardElement = 'article' | 'div' | 'section';
type LibraryCardMediaElement = 'div' | 'figure';
type LibraryCardTitleElement = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type LibraryCardDescriptionElement = 'p' | 'div' | 'blockquote';

export type LibraryCardVariant = 'default' | 'callout';
export type LibraryCardPadding = 'none' | 'sm' | 'md' | 'lg';

interface LibraryCardRootContentProps {
  variant?: LibraryCardVariant;
  padding?: LibraryCardPadding;
  /** Visual-only hover lift; interactive cards are always elevated. */
  elevateOnHover?: boolean;
  /** Optional visual identity color for category- or rarity-driven cards. */
  accentColor?: string;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
  titleAs?: LibraryCardTitleElement;
  description?: ReactNode;
  metadata?: ReactNode;
  media?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
}

type StaticLibraryCardProps = LibraryCardRootContentProps &
  Omit<HTMLAttributes<HTMLElement>, 'children' | 'className' | 'onClick' | 'title'> & {
    as?: LibraryCardElement;
    /** Keep this false for static cards; use elevateOnHover for visual feedback. */
    interactive?: false;
    href?: never;
    disabled?: never;
  };

type InteractiveButtonCardProps = LibraryCardRootContentProps &
  Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className' | 'onClick' | 'title'> & {
    /**
     * Enables the button-card contract. Provide an action; Enter and Space both
     * activate it, and disabled cards are removed from the tab order.
     */
    interactive: true;
    href?: never;
    disabled?: boolean;
    onClick: (event: MouseEvent<HTMLDivElement>) => void;
  };

type InteractiveLinkCardProps = LibraryCardRootContentProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'className' | 'href' | 'title'> & {
    /** Enables the link-card contract. */
    interactive: true;
    href: string;
    disabled?: boolean;
  };

/**
 * A semantic card surface.
 *
 * Use elevateOnHover for a visual-only hover treatment. To make a whole card
 * actionable, set interactive and supply either href (a native link) or
 * onClick (a keyboard-operable button role). Do not place interactive
 * descendants inside an interactive card.
 */
export type LibraryCardProps =
  | StaticLibraryCardProps
  | InteractiveButtonCardProps
  | InteractiveLinkCardProps;

/**
 * The canonical Library focus ring (shared with LibraryButton and the
 * navigation skins) — a portal-blue ring over the void page.
 */
const FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-portal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black';

const INTERACTIVE_STATES = cn(
  'cursor-pointer active:translate-y-0',
  'aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-45',
  'motion-reduce:active:translate-y-0',
  FOCUS_RING,
);

/**
 * The accent hairline: a thin identity line across the top edge that wakes
 * when `accentColor` is set. It lives on `after:` because `before:` already
 * carries the spectral edge ring (see LibraryPanel).
 */
const ACCENT_STATES = cn(
  "after:pointer-events-none after:absolute after:inset-x-[10%] after:top-0 after:z-[1] after:h-px after:content-['']",
  'after:bg-[var(--library-card-accent)] after:opacity-0 after:transition-opacity',
  'data-[accent=true]:after:opacity-80',
);

const ELEVATE_STATES = [
  'hover:-translate-y-1',
  'hover:border-[var(--library-card-accent-border,rgba(4,172,255,0.32))]',
  'hover:shadow-[0_30px_84px_rgba(0,0,0,0.34),0_0_34px_var(--library-card-accent-glow,transparent)]',
  'motion-reduce:hover:translate-y-0',
].join(' ');

const BASE = [
  // flex-col lets stretched cards (equal-height grid rows) keep media on top
  // and grow the content region so trailing actions/footers can anchor with
  // mt-auto instead of pooling dead space at the bottom (kept from SEICard).
  // min-w-0 + overflow-hidden contain long content inside flex/grid tracks.
  // Shape (radius / border / shadow) lives in the variants, same pattern as
  // LibraryPanel.
  'group relative flex min-w-0 flex-col overflow-hidden',
  'text-neutral-200',
  // transform is in the transition list for the hover lift; reduced motion
  // disables the transition and the lift (motion-reduce rules on the states).
  'transition-[background,border-color,box-shadow,color,opacity,transform] duration-200 ease-out',
  'motion-reduce:transition-none',
].join(' ');

const VARIANTS: Record<LibraryCardVariant, string> = {
  /**
   * The main Celestial Library glass card — the LibraryPanel `default`
   * glass recipe at card scale: crisp luminous border, cool top-light
   * falloff over dark depth, opaque-enough base behind a
   * supports-[backdrop-filter] guard, lighter blur on small screens where
   * high-DPR mobile GPUs pay the most for backdrop sampling, strengthened
   * inner rim lighting, the portal/gold rim glow, and the shared masked 1px
   * spectral edge.
   */
  default: [
    'rounded-[1.35rem] border border-[rgba(190,216,255,0.26)]',
    '[background-image:radial-gradient(130%_100%_at_50%_0%,rgba(130,180,255,0.09),transparent_52%),linear-gradient(168deg,rgba(205,225,255,0.09),rgba(255,255,255,0.02)_40%,rgba(3,6,12,0.14))]',
    'bg-[rgba(8,12,20,0.95)] supports-[backdrop-filter]:bg-[rgba(8,12,20,0.60)]',
    'backdrop-blur-sm backdrop-saturate-150 sm:backdrop-blur-xl',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-1px_0_rgba(150,195,255,0.07),inset_0_0_0_1px_rgba(255,255,255,0.045),0_2px_10px_rgba(0,0,0,0.5),0_28px_80px_rgba(0,0,0,0.55),0_0_52px_rgba(4,172,255,0.12),0_0_110px_rgba(212,175,55,0.06)]',
    SPECTRAL_EDGE,
  ].join(' '),

  /** Quieter gold-tinted inset glass for guidance / notice cards. */
  callout: [
    'rounded-[1.35rem] border border-gold-accent/25',
    '[background-image:linear-gradient(180deg,rgba(212,175,55,0.075),rgba(212,175,55,0.028))]',
    'bg-[rgba(12,12,16,0.72)]',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_28px_rgba(212,175,55,0.05)]',
  ].join(' '),
};

// Responsive spacing follows the LibraryPanel rhythm (kept responsive rather
// than SEICard's fixed p-4/p-5/p-6 so cards track the panel they sit in).
const PADDING: Record<LibraryCardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

const CONTENT_PADDING: Record<LibraryCardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

const MEDIA_INSET: Record<LibraryCardPadding, string> = {
  none: '',
  sm: '-m-4 mb-4',
  md: '-m-5 mb-5 sm:-m-6 sm:mb-6',
  lg: '-m-6 mb-6 sm:-m-8 sm:mb-8',
};

function hasRenderableContent(value: ReactNode): boolean {
  return Children.toArray(value).some((child) => {
    if (typeof child === 'string') {
      return child.trim().length > 0;
    }

    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) {
      return hasRenderableContent(child.props.children);
    }

    return true;
  });
}

export interface LibraryCardMediaProps extends HTMLAttributes<HTMLElement> {
  as?: LibraryCardMediaElement;
}

/** Artwork, a generated-image state, a sigil, an icon treatment, or any custom media. */
export function LibraryCardMedia({ as = 'div', className, ...props }: LibraryCardMediaProps) {
  const Component = as as ElementType;

  return (
    <Component
      data-slot="card-media"
      className={cn('relative min-w-0 shrink-0 overflow-hidden', className)}
      {...props}
    />
  );
}

export interface LibraryCardContentProps extends HTMLAttributes<HTMLDivElement> {
  padding?: LibraryCardPadding;
}

/** Spacing owner for composed cards that use `LibraryCard padding="none"`. */
export function LibraryCardContent({
  className,
  padding = 'none',
  ...props
}: LibraryCardContentProps) {
  return (
    <div
      data-slot="card-content"
      className={cn('flex min-w-0 flex-1 flex-col gap-4', CONTENT_PADDING[padding], className)}
      {...props}
    />
  );
}

export interface LibraryCardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: LibraryCardTitleElement;
}

export function LibraryCardTitle({ as = 'h3', className, ...props }: LibraryCardTitleProps) {
  const Component = as as ElementType;

  return (
    <Component
      data-slot="card-title"
      className={cn(
        'min-w-0 wrap-anywhere text-lg font-semibold leading-tight tracking-[-0.03em] text-current',
        className,
      )}
      {...props}
    />
  );
}

export interface LibraryCardDescriptionProps extends HTMLAttributes<HTMLElement> {
  as?: LibraryCardDescriptionElement;
}

/** Description or lore copy; use `as="blockquote"` when the content is a quotation. */
export function LibraryCardDescription({
  as = 'p',
  className,
  ...props
}: LibraryCardDescriptionProps) {
  const Component = as as ElementType;

  return (
    <Component
      data-slot="card-description"
      // neutral-400 keeps muted body copy at >= 4.5:1 on the dark glass.
      className={cn('wrap-anywhere text-sm leading-relaxed text-neutral-400', className)}
      {...props}
    />
  );
}

export type LibraryCardBodyProps = HTMLAttributes<HTMLDivElement>;

export function LibraryCardBody({ className, ...props }: LibraryCardBodyProps) {
  return <div data-slot="card-body" className={cn('min-w-0 space-y-3', className)} {...props} />;
}

export type LibraryCardMetadataProps = HTMLAttributes<HTMLDivElement>;

export function LibraryCardMetadata({ className, ...props }: LibraryCardMetadataProps) {
  return (
    <div
      data-slot="card-metadata"
      // neutral-450 is the dimmest tone that still holds >= 4.5:1 on the
      // dark glass; the neutral-500 field-helper tone is too quiet here.
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 wrap-anywhere text-xs text-neutral-450',
        className,
      )}
      {...props}
    />
  );
}

export type LibraryCardActionsProps = HTMLAttributes<HTMLDivElement>;

export function LibraryCardActions({ className, ...props }: LibraryCardActionsProps) {
  return (
    <div
      data-slot="card-actions"
      className={cn('flex min-w-0 flex-wrap items-center gap-2', className)}
      {...props}
    />
  );
}

export type LibraryCardFooterProps = HTMLAttributes<HTMLDivElement>;

export function LibraryCardFooter({ className, ...props }: LibraryCardFooterProps) {
  return (
    <div
      data-slot="card-footer"
      // mt-auto anchors the footer at the bottom of equal-height cards; the
      // divider matches the LibraryPanel footer strip's luminous tone.
      className={cn(
        'mt-auto border-t border-[rgba(190,216,255,0.22)] pt-4 wrap-anywhere text-sm text-neutral-450',
        className,
      )}
      {...props}
    />
  );
}

export interface LibraryCardHeaderProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'title'
> {
  eyebrow?: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
  titleAs?: LibraryCardTitleElement;
  description?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
  iconClassName?: string;
}

/**
 * Flexible identity/header region for category, icon, title, lore, metadata,
 * and compact controls. Product cards can omit it and compose the lower-level
 * regions directly when their ceremony or layout needs a different order.
 */
export function LibraryCardHeader({
  eyebrow,
  icon,
  title,
  titleAs,
  description,
  metadata,
  actions,
  iconClassName,
  className,
  ...props
}: LibraryCardHeaderProps) {
  // Walk each populated slot once per render. The nullish guards keep omitted
  // slots from reaching Children.toArray, matching the finalized SEICard.
  const hasEyebrow = eyebrow != null && hasRenderableContent(eyebrow);
  const hasMetadata = metadata != null && hasRenderableContent(metadata);
  const hasTitle = title != null && hasRenderableContent(title);
  const hasActions = actions != null && hasRenderableContent(actions);
  const hasIcon = icon != null && hasRenderableContent(icon);
  const hasDescription = description != null && hasRenderableContent(description);
  const hasTopline = hasEyebrow || hasMetadata;
  const hasTitleRow = hasTitle || hasActions;

  return (
    <div
      data-slot="card-header"
      className={cn('flex min-w-0 items-start gap-3', className)}
      {...props}
    >
      {hasIcon ? (
        <div
          data-slot="card-icon"
          className={cn(
            'flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border',
            'border-[var(--library-card-accent-border,rgba(190,216,255,0.22))] bg-white/[0.045]',
            'text-[var(--library-card-accent,var(--color-neutral-400))]',
            iconClassName,
          )}
        >
          {icon}
        </div>
      ) : null}

      <div className="min-w-0 flex-1 space-y-4">
        {hasTopline ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {hasEyebrow ? (
              <div className="wrap-anywhere text-xs font-bold uppercase tracking-[0.16em] text-neutral-450">
                {eyebrow}
              </div>
            ) : null}
            {hasMetadata ? (
              <LibraryCardMetadata className="text-sm">{metadata}</LibraryCardMetadata>
            ) : null}
          </div>
        ) : null}

        {hasTitleRow ? (
          <div className="flex min-w-0 items-start justify-between gap-4">
            {hasTitle ? (
              <LibraryCardTitle as={titleAs}>{title}</LibraryCardTitle>
            ) : null}
            {hasActions ? (
              <LibraryCardActions className="shrink-0">{actions}</LibraryCardActions>
            ) : null}
          </div>
        ) : null}

        {hasDescription ? (
          <LibraryCardDescription>{description}</LibraryCardDescription>
        ) : null}
      </div>
    </div>
  );
}

interface CardContentProps {
  eyebrow?: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
  titleAs?: LibraryCardTitleElement;
  description?: ReactNode;
  metadata?: ReactNode;
  media?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  contentClassName?: string;
  padding?: LibraryCardPadding;
}

function CardContent({
  eyebrow,
  icon,
  title,
  titleAs,
  description,
  metadata,
  media,
  actions,
  footer,
  children,
  contentClassName,
  padding,
}: CardContentProps) {
  const resolvedPadding = padding ?? 'md';

  return (
    <>
      {hasRenderableContent(media) ? (
        <LibraryCardMedia className={MEDIA_INSET[resolvedPadding]}>{media}</LibraryCardMedia>
      ) : null}
      <LibraryCardContent className={contentClassName}>
        {hasRenderableContent(eyebrow) ||
        hasRenderableContent(icon) ||
        hasRenderableContent(title) ||
        hasRenderableContent(description) ||
        hasRenderableContent(metadata) ||
        hasRenderableContent(actions) ? (
          <LibraryCardHeader
            eyebrow={eyebrow}
            icon={icon}
            title={title}
            titleAs={titleAs}
            description={description}
            metadata={metadata}
            actions={actions}
          />
        ) : null}

        {children}

        {hasRenderableContent(footer) ? <LibraryCardFooter>{footer}</LibraryCardFooter> : null}
      </LibraryCardContent>
    </>
  );
}

function getCardClassName(
  { className, variant, padding, elevateOnHover }: LibraryCardRootContentProps,
  interactive = false,
) {
  return cn(
    BASE,
    VARIANTS[variant ?? 'default'],
    PADDING[padding ?? 'md'],
    interactive || elevateOnHover ? ELEVATE_STATES : undefined,
    ACCENT_STATES,
    interactive ? INTERACTIVE_STATES : undefined,
    className,
  );
}

type LibraryCardAccentStyle = CSSProperties & {
  '--library-card-accent'?: string;
  '--library-card-accent-border'?: string;
  '--library-card-accent-glow'?: string;
};

function getCardStyle(style: CSSProperties | undefined, accentColor: string | undefined) {
  if (!accentColor) return style;

  return {
    ...style,
    '--library-card-accent': accentColor,
    '--library-card-accent-border': `color-mix(in srgb, ${accentColor} 38%, transparent)`,
    '--library-card-accent-glow': `color-mix(in srgb, ${accentColor} 18%, transparent)`,
  } as LibraryCardAccentStyle;
}

function getCardContent({
  eyebrow,
  icon,
  title,
  titleAs,
  description,
  metadata,
  media,
  actions,
  footer,
  children,
  contentClassName,
  padding,
}: LibraryCardRootContentProps) {
  return (
    <CardContent
      eyebrow={eyebrow}
      icon={icon}
      title={title}
      titleAs={titleAs}
      description={description}
      metadata={metadata}
      media={media}
      actions={actions}
      footer={footer}
      contentClassName={contentClassName}
      padding={padding}
    >
      {children}
    </CardContent>
  );
}

function StaticCard({
  as = 'article',
  className,
  contentClassName,
  variant,
  padding,
  elevateOnHover,
  accentColor,
  eyebrow,
  icon,
  title,
  titleAs,
  description,
  metadata,
  media,
  actions,
  footer,
  children,
  style,
  interactive: _interactive,
  ...rootProps
}: StaticLibraryCardProps) {
  const Component = as as ElementType;

  return (
    <Component
      {...rootProps}
      data-accent={accentColor ? 'true' : undefined}
      style={getCardStyle(style, accentColor)}
      className={getCardClassName({ className, variant, padding, elevateOnHover })}
    >
      {getCardContent({
        eyebrow,
        icon,
        title,
        titleAs,
        description,
        metadata,
        media,
        actions,
        footer,
        children,
        contentClassName,
        padding,
      })}
    </Component>
  );
}

function InteractiveLinkCard({
  className,
  contentClassName,
  variant,
  padding,
  elevateOnHover,
  accentColor,
  eyebrow,
  icon,
  title,
  titleAs,
  description,
  metadata,
  media,
  actions,
  footer,
  children,
  disabled,
  href,
  onClick,
  style,
  interactive: _interactive,
  ...linkProps
}: InteractiveLinkCardProps) {
  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <a
      {...linkProps}
      data-accent={accentColor ? 'true' : undefined}
      style={getCardStyle(style, accentColor)}
      href={disabled ? undefined : href}
      onClick={handleLinkClick}
      role={disabled ? 'link' : linkProps.role}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : linkProps.tabIndex}
      className={getCardClassName({ className, variant, padding, elevateOnHover }, true)}
    >
      {getCardContent({
        eyebrow,
        icon,
        title,
        titleAs,
        description,
        metadata,
        media,
        actions,
        footer,
        children,
        contentClassName,
        padding,
      })}
    </a>
  );
}

function InteractiveButtonCard({
  className,
  contentClassName,
  variant,
  padding,
  elevateOnHover,
  accentColor,
  eyebrow,
  icon,
  title,
  titleAs,
  description,
  metadata,
  media,
  actions,
  footer,
  children,
  disabled,
  onClick,
  onKeyDown,
  style,
  interactive: _interactive,
  ...buttonProps
}: InteractiveButtonCardProps) {
  const handleButtonKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    onKeyDown?.(event);
    if (event.defaultPrevented || (event.key !== 'Enter' && event.key !== ' ')) return;

    event.preventDefault();
    event.currentTarget.click();
  };

  return (
    <div
      {...buttonProps}
      data-accent={accentColor ? 'true' : undefined}
      style={getCardStyle(style, accentColor)}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleButtonKeyDown}
      className={getCardClassName({ className, variant, padding, elevateOnHover }, true)}
    >
      {getCardContent({
        eyebrow,
        icon,
        title,
        titleAs,
        description,
        metadata,
        media,
        actions,
        footer,
        children,
        contentClassName,
        padding,
      })}
    </div>
  );
}

function isInteractiveLinkCard(
  props: InteractiveButtonCardProps | InteractiveLinkCardProps,
): props is InteractiveLinkCardProps {
  return 'href' in props && typeof props.href === 'string';
}

export function LibraryCard(props: LibraryCardProps) {
  if (props.interactive) {
    return isInteractiveLinkCard(props) ? (
      <InteractiveLinkCard {...props} />
    ) : (
      <InteractiveButtonCard {...props} />
    );
  }

  return <StaticCard {...props} />;
}
