import type { CSSProperties, HTMLAttributes } from 'react';
import './sen-navigation-icon.css';

const ICON_ASSETS = {
  book: '/icons/user-profile/SENBook.svg',
  discovery: '/icons/user-profile/SENDiscovery.svg',
  energy: '/icons/user-profile/SENEnergy.svg',
  home: '/icons/user-profile/SENHome.svg',
  relic: '/icons/user-profile/SENRelic.svg',
  scroll: '/icons/user-profile/SENScroll.svg',
  store: '/icons/user-profile/SENStore.svg',
} as const;

export type SENNavigationIconName = keyof typeof ICON_ASSETS;

/** Official SEN navigation artwork, masked to the consuming surface's color. */
export function SENNavigationIcon({ name, size = 24, className = '', style, ...props }: {
  name: SENNavigationIconName;
  size?: number;
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>) {
  return <span {...props} aria-hidden={props['aria-hidden'] ?? true}
    className={`sen-navigation-icon ${className}`.trim()} data-sen-navigation-icon={name}
    style={{ ...style, width: size, height: size,
      '--sen-navigation-icon-mask': `url('${ICON_ASSETS[name]}')` } as CSSProperties} />;
}
