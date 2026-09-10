import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import './library-tier-badge.css';

/**
 * How often the surface sheen crosses the capsule.
 *
 * - `occasional` — one restrained sweep every few seconds, paused for
 *   reduced-motion users, who receive the static lit material instead.
 * - `none` — the static material only.
 */
export type LibraryTierBadgeSheen = 'occasional' | 'none';

export interface LibraryTierBadgeProps extends ComponentPropsWithoutRef<'span'> {
  /** The subscription-tier name. Any length is wrapped safely inside the capsule. */
  children: ReactNode;
  sheen?: LibraryTierBadgeSheen;
}

/**
 * The compact subscription-tier capsule: a pale champagne interior with dark
 * lettering under a layered gold / portal / violet rim, a soft halo, and an
 * inner surface highlight. Premium through material, lighting, and depth
 * only — no icons, particles, or ornament.
 *
 * Non-interactive by design: it renders a plain `span`, never a control, and
 * carries no hover or pressed state. Self-contained (React and the host's
 * font tokens only) so it can move into `@seihouse/library-ui` unchanged.
 */
export function LibraryTierBadge({ children, className, sheen = 'occasional', ...props }: LibraryTierBadgeProps) {
  return (
    <span
      {...props}
      className={['library-tier-badge', className].filter(Boolean).join(' ')}
      data-slot="library-tier-badge"
      data-sheen={sheen}
    >
      <span className="library-tier-badge__label">{children}</span>
    </span>
  );
}
