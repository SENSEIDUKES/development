import type { CSSProperties, HTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import './sen-global-icon.css';

const GLOBAL_ICON_ASSETS = {
  exit: '/icons/header/SENExit.svg',
  manifesting: '/icons/header/SENManifesting.svg',
  profile: '/icons/header/SENProfile.svg',
  'profile-female': '/icons/header/SENProfileFemale.svg',
  qi: '/icons/header/SENQi.svg',
  'qi-yin-yang': '/icons/header/SENQiYinYang.svg',
  settings: '/icons/header/SENSettings.svg',
} as const;

export type SENGlobalIconName = keyof typeof GLOBAL_ICON_ASSETS;

export function SENGlobalIcon({ name, size = 24, className = '', style, ...props }: {
  name: SENGlobalIconName;
  size?: number | string;
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>) {
  return <span {...props} aria-hidden={props['aria-hidden'] ?? true}
    className={`sen-global-icon ${className}`.trim()} data-sen-global-icon={name}
    style={{ ...style, width: size, height: size,
      '--sen-global-icon-mask': `url('${GLOBAL_ICON_ASSETS[name]}')` } as CSSProperties} />;
}

const asLucideIcon = (name: SENGlobalIconName): LucideIcon => (({ size = 24, className, style, ...props }) => (
  <SENGlobalIcon name={name} size={size} className={className} style={style}
    {...props as HTMLAttributes<HTMLSpanElement>} />
)) as LucideIcon;

/** Compatible icon adapters for Library primitives that accept Lucide icons. */
export const SENExitIcon = asLucideIcon('exit');
export const SENManifestingIcon = asLucideIcon('manifesting');
export const SENProfileIcon = asLucideIcon('profile');
export const SENProfileFemaleIcon = asLucideIcon('profile-female');
export const SENQiIcon = asLucideIcon('qi');
export const SENQiYinYangIcon = asLucideIcon('qi-yin-yang');
export const SENSettingsIcon = asLucideIcon('settings');
