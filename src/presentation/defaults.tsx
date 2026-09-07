import React, { useSyncExternalStore } from 'react';
import { RefreshCw, Volume2 } from 'lucide-react';
import * as UI from '@seihouse/ui';
import type * as P from './contracts';

/** Universal defaults adapt narrative props without carrying a product skin. */
export function Panel({ variant, ...props }: P.NarrativePanelProps) {
  return (
    <UI.SEIPanel
      {...props}
      variant={variant === 'callout' ? 'soft' : 'default'}
    />
  );
}
export const Button = React.forwardRef<
  HTMLButtonElement,
  P.NarrativeButtonProps
>(function Button({ variant, size, ...props }, ref) {
  return (
    <UI.SEIButton
      {...props}
      ref={ref}
      variant={
        variant === 'ghost'
          ? 'ghost'
          : variant === 'secondary'
            ? 'outline'
            : 'default'
      }
      size={size === 'icon' ? 'md' : size}
    />
  );
});
export function Card({ variant, ...props }: P.NarrativeCardProps) {
  return (
    <UI.SEICard
      {...props}
      variant={variant === 'callout' ? 'soft' : 'default'}
    />
  );
}
export const TextBox = React.forwardRef<
  HTMLInputElement,
  P.NarrativeTextBoxProps
>(function TextBox(
  {
    label,
    helpText,
    error,
    rightElement,
    trailingElement,
    variant: _variant,
    icon: Icon,
    onChange,
    invalid,
    ...props
  },
  ref,
) {
  return (
    <UI.SEIField
      label={label}
      htmlFor={props.id}
      helperText={helpText}
      error={error}
      required={props.required}
      disabled={props.disabled}
      size={props.size}
    >
      {({ controlId, describedBy }) => (
        <>
          <span>{rightElement}</span>
          <UI.SEIInput
            {...props}
            ref={ref}
            id={controlId}
            aria-describedby={
              [describedBy, props['aria-describedby']]
                .filter(Boolean)
                .join(' ') || undefined
            }
            invalid={invalid || Boolean(error)}
            iconLeft={Icon ? <Icon aria-hidden="true" /> : undefined}
            iconRight={trailingElement}
            onChange={(event) => onChange?.(event.target.value)}
          />
        </>
      )}
    </UI.SEIField>
  );
});
export const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  P.NarrativeTextAreaProps
>(function TextArea(
  {
    label,
    helpText,
    error,
    rightElement,
    variant: _variant,
    icon: Icon,
    onChange,
    invalid,
    children,
    ...props
  },
  ref,
) {
  return (
    <UI.SEIField
      label={label}
      htmlFor={props.id}
      helperText={helpText}
      error={error}
      required={props.required}
      disabled={props.disabled}
      size={props.size}
    >
      {({ controlId, describedBy }) => (
        <>
          <span>
            {rightElement}
            {props.maxLength && props.value !== undefined
              ? `${props.value.length}/${props.maxLength}`
              : null}
          </span>
          <div className="relative">
            {Icon ? <Icon aria-hidden="true" /> : null}
            <UI.SEITextarea
              {...props}
              ref={ref}
              id={controlId}
              aria-describedby={
                [describedBy, props['aria-describedby']]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              invalid={invalid || Boolean(error)}
              onChange={(event) => onChange?.(event.target.value)}
            />
            {children}
          </div>
        </>
      )}
    </UI.SEIField>
  );
});
export function HeaderBadge({
  title,
  subtitle,
  emblemSrc,
  emblemAlt = '',
  emblemHref,
  emblemLinkLabel,
}: P.NarrativeHeaderBadgeProps) {
  const emblem = emblemSrc ? (
    <img src={emblemSrc} alt={emblemAlt} width={48} height={48} />
  ) : null;
  return (
    <header>
      {emblemHref ? (
        <a href={emblemHref} aria-label={emblemLinkLabel}>
          {emblem}
        </a>
      ) : (
        emblem
      )}
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </header>
  );
}
export function NavigationDrawerPanel({
  sections,
  profile,
  onClose,
  closeLabel = 'Close menu',
  className,
  'aria-label': label,
}: P.NarrativeNavigationDrawerPanelProps) {
  return (
    <nav aria-label={label} className={className}>
      {profile ? (
        <header>
          {profile.emblem}
          {profile.eyebrow}
          <strong>{profile.name}</strong>
          {profile.detail}
        </header>
      ) : null}
      {onClose ? (
        <UI.SEIButton onClick={onClose}>{closeLabel}</UI.SEIButton>
      ) : null}
      {sections.map((section) => (
        <section key={section.id}>
          {section.label ? <h2>{section.label}</h2> : null}
          {section.tagline}
          <ul>
            {section.items.map((item) => (
              <li key={item.id}>
                <UI.SEIButton
                  aria-current={item.active ? 'page' : undefined}
                  onClick={() => item.onSelect?.(item.id)}
                >
                  {item.icon}
                  {item.label}
                  {item.required ? <span aria-label="required"> *</span> : null}
                  {item.trailing}
                </UI.SEIButton>
              </li>
            ))}
          </ul>
          {section.footer}
        </section>
      ))}
    </nav>
  );
}
const subscribeViewport = (callback: () => void) => {
  const query = window.matchMedia('(min-width: 1024px)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
export function NavigationDrawer({
  open,
  onClose,
  mobileOnly,
  ...props
}: P.NarrativeNavigationDrawerProps) {
  const desktop = useSyncExternalStore(
    subscribeViewport,
    () => window.matchMedia('(min-width: 1024px)').matches,
    () => false,
  );
  return (
    <UI.SEIDrawer
      open={open && !(mobileOnly && desktop)}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <UI.SEIDrawerContent aria-label={props['aria-label']}>
        <NavigationDrawerPanel {...props} onClose={onClose} />
      </UI.SEIDrawerContent>
    </UI.SEIDrawer>
  );
}
function Glyph(
  {
    title,
    titleId,
    decorative,
    size = 24,
    ...props
  }: P.NarrativeDragonCycleIconProps,
  Icon: typeof RefreshCw,
) {
  const hidden = decorative ?? !(title || props['aria-label'] || props['aria-labelledby']);
  return (
    <Icon
      {...props}
      size={size}
      aria-hidden={hidden || undefined}
      role={hidden ? undefined : 'img'}
      aria-label={hidden ? undefined : (props['aria-label'] ?? title)}
      aria-labelledby={hidden ? undefined : (props['aria-labelledby'] ?? (title ? titleId : undefined))}
    >
      {title ? <title id={titleId}>{title}</title> : null}
    </Icon>
  );
}
export const CycleIcon = (props: P.NarrativeDragonCycleIconProps) =>
  Glyph(props, RefreshCw);
export const SoundGlyph = (props: P.NarrativeSoundGlyphProps) =>
  Glyph(props, Volume2);
/** Ambient decoration is optional; the host owns any particle engine and art. */
export const AmbientEffect = (_props: P.AmbientEffectProps) => null;
