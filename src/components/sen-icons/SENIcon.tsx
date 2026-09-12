import type { CSSProperties, HTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import senExitUrl from './assets/header/SENExit.svg?url';
import senHelpUrl from './assets/header/SENHelp.svg?url';
import senManifestingUrl from './assets/header/SENManifesting.svg?url';
import senProfileUrl from './assets/header/SENProfile.svg?url';
import senProfileFemaleUrl from './assets/header/SENProfileFemale.svg?url';
import senQiUrl from './assets/header/SENQi.svg?url';
import senQiYinYangUrl from './assets/header/SENQiYinYang.svg?url';
import senSearchUrl from './assets/header/SENSearch.svg?url';
import senSettingsUrl from './assets/header/SENSettings.svg?url';
import senBookUrl from './assets/navigation/SENBook.svg?url';
import senDiscoveryUrl from './assets/navigation/SENDiscovery.svg?url';
import senEnergyUrl from './assets/navigation/SENEnergy.svg?url';
import senHomeUrl from './assets/navigation/SENHome.svg?url';
import senRelicUrl from './assets/navigation/SENRelic.svg?url';
import senStoriesUrl from './assets/navigation/SENScroll.svg?url';
import senStoreUrl from './assets/navigation/SENStore.svg?url';
import senAbilityUrl from './assets/story-seed/SENAbility.svg?url';
import senAllyFactionUrl from './assets/story-seed/SENAllyFaction.svg?url';
import senArcUrl from './assets/story-seed/SENArc.svg?url';
import senBankUrl from './assets/story-seed/SENBank.svg?url';
import senCharactersUrl from './assets/story-seed/SENCharacters.svg?url';
import senEnemyFactionUrl from './assets/story-seed/SENEnemyFaction.svg?url';
import senPowerSystemUrl from './assets/story-seed/SENPowerSystem.svg?url';
import senStoryUrl from './assets/story-seed/SENScroll.svg?url';
import senStyleChineseUrl from './assets/story-seed/SENStyleChinese.svg?url';
import senStyleJapaneseUrl from './assets/story-seed/SENStyleJapanese.svg?url';
import senStyleKoreanUrl from './assets/story-seed/SENStyleKorean.svg?url';
import senWorldIdentityUrl from './assets/story-seed/SENWorldIdentity.svg?url';
import './sen-icon.css';

const SEN_ICON_ASSETS = {
  'header-exit': senExitUrl,
  'header-help': senHelpUrl,
  'header-manifesting': senManifestingUrl,
  'header-profile': senProfileUrl,
  'header-profile-female': senProfileFemaleUrl,
  'header-qi': senQiUrl,
  'header-qi-yin-yang': senQiYinYangUrl,
  'header-search': senSearchUrl,
  'header-settings': senSettingsUrl,
  'navigation-book': senBookUrl,
  'navigation-discovery': senDiscoveryUrl,
  'navigation-energy': senEnergyUrl,
  'navigation-home': senHomeUrl,
  'navigation-relic': senRelicUrl,
  'navigation-stories': senStoriesUrl,
  'navigation-store': senStoreUrl,
  'story-ability': senAbilityUrl,
  'story-ally-faction': senAllyFactionUrl,
  'story-arc': senArcUrl,
  'story-bank': senBankUrl,
  'story-characters': senCharactersUrl,
  'story-enemy-faction': senEnemyFactionUrl,
  'story-power-system': senPowerSystemUrl,
  'story-scroll': senStoryUrl,
  'story-style-chinese': senStyleChineseUrl,
  'story-style-japanese': senStyleJapaneseUrl,
  'story-style-korean': senStyleKoreanUrl,
  'story-world-identity': senWorldIdentityUrl,
} as const;

export type SENIconName = keyof typeof SEN_ICON_ASSETS;
export type SENGlobalIconName = 'exit' | 'manifesting' | 'profile' | 'profile-female' | 'qi' | 'qi-yin-yang' | 'settings';
export type SENNavigationIconName = 'book' | 'discovery' | 'energy' | 'home' | 'relic' | 'scroll' | 'store';
export type StorySeedIconName = 'ability' | 'ally-faction' | 'arc' | 'bank' | 'characters' | 'enemy-faction'
  | 'power-system' | 'scroll' | 'style-chinese' | 'style-japanese' | 'style-korean' | 'world' | 'world-identity';

const GLOBAL_ICON_NAMES: Record<SENGlobalIconName, SENIconName> = {
  exit: 'header-exit', manifesting: 'header-manifesting', profile: 'header-profile',
  'profile-female': 'header-profile-female', qi: 'header-qi', 'qi-yin-yang': 'header-qi-yin-yang',
  settings: 'header-settings',
};
const NAVIGATION_ICON_NAMES: Record<SENNavigationIconName, SENIconName> = {
  book: 'navigation-book', discovery: 'navigation-discovery', energy: 'navigation-energy',
  home: 'navigation-home', relic: 'navigation-relic', scroll: 'navigation-stories', store: 'navigation-store',
};
const STORY_SEED_ICON_NAMES: Record<StorySeedIconName, SENIconName> = {
  ability: 'story-ability', 'ally-faction': 'story-ally-faction', arc: 'story-arc', bank: 'story-bank',
  characters: 'story-characters', 'enemy-faction': 'story-enemy-faction', 'power-system': 'story-power-system',
  scroll: 'story-scroll', 'style-chinese': 'story-style-chinese', 'style-japanese': 'story-style-japanese',
  'style-korean': 'story-style-korean', world: 'navigation-discovery', 'world-identity': 'story-world-identity',
};

export interface SENIconProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  name: SENIconName;
  size?: number | string;
}

/** Source-owned official SEN artwork that follows the consuming surface's color. */
export function SENIcon({ name, size = 24, className = '', style, ...props }: SENIconProps) {
  return <span {...props} aria-hidden={props['aria-hidden'] ?? true}
    className={`sen-icon ${className}`.trim()} data-sen-icon={name}
    style={{ ...style, width: size, height: size,
      '--sen-icon-mask': `url("${SEN_ICON_ASSETS[name]}")` } as CSSProperties} />;
}

/** Compatibility renderers keep established call sites and test selectors stable. */
export function SENGlobalIcon({ name, ...props }: Omit<SENIconProps, 'name'> & { name: SENGlobalIconName }) {
  return <SENIcon {...props} name={GLOBAL_ICON_NAMES[name]} data-sen-global-icon={name} />;
}

export function SENNavigationIcon({ name, ...props }: Omit<SENIconProps, 'name'> & { name: SENNavigationIconName }) {
  return <SENIcon {...props} name={NAVIGATION_ICON_NAMES[name]} data-sen-navigation-icon={name} />;
}

export function SENStorySeedIcon({ name, ...props }: Omit<SENIconProps, 'name'> & { name: StorySeedIconName }) {
  return <SENIcon {...props} name={STORY_SEED_ICON_NAMES[name]} data-sen-story-seed-icon={name} />;
}

const asLucideIcon = (name: SENIconName, legacyAttribute?: Record<string, string>): LucideIcon => (({ size = 24, className, style, ...props }) => (
  <SENIcon name={name} size={size} className={className} style={style}
    {...legacyAttribute}
    {...props as HTMLAttributes<HTMLSpanElement>} />
)) as LucideIcon;

const globalAdapter = (name: SENGlobalIconName) => asLucideIcon(GLOBAL_ICON_NAMES[name], { 'data-sen-global-icon': name });
const navigationAdapter = (name: SENNavigationIconName) => asLucideIcon(NAVIGATION_ICON_NAMES[name], { 'data-sen-navigation-icon': name });
const storyAdapter = (name: StorySeedIconName) => asLucideIcon(STORY_SEED_ICON_NAMES[name], { 'data-sen-story-seed-icon': name });

export const SENExitIcon = globalAdapter('exit');
export const SENHelpIcon = asLucideIcon('header-help');
export const SENManifestingIcon = globalAdapter('manifesting');
export const SENProfileIcon = globalAdapter('profile');
export const SENProfileFemaleIcon = globalAdapter('profile-female');
export const SENQiIcon = globalAdapter('qi');
export const SENQiYinYangIcon = globalAdapter('qi-yin-yang');
export const SENSearchIcon = asLucideIcon('header-search');
export const SENSettingsIcon = globalAdapter('settings');
export const SENBookIcon = navigationAdapter('book');
export const SENDiscoveryIcon = navigationAdapter('discovery');
export const SENEnergyIcon = navigationAdapter('energy');
export const SENHomeIcon = navigationAdapter('home');
export const SENRelicIcon = navigationAdapter('relic');
export const SENStoriesIcon = navigationAdapter('scroll');
export const SENStoreIcon = navigationAdapter('store');
export const SENAbilityIcon = storyAdapter('ability');
export const SENAllyFactionIcon = storyAdapter('ally-faction');
export const SENArcIcon = storyAdapter('arc');
export const SENBankIcon = storyAdapter('bank');
export const SENCharactersIcon = storyAdapter('characters');
export const SENEnemyFactionIcon = storyAdapter('enemy-faction');
export const SENPowerSystemIcon = storyAdapter('power-system');
export const SENStoryIcon = storyAdapter('scroll');
export const SENStyleChineseIcon = storyAdapter('style-chinese');
export const SENStyleJapaneseIcon = storyAdapter('style-japanese');
export const SENStyleKoreanIcon = storyAdapter('style-korean');
export const SENWorldIdentityIcon = storyAdapter('world-identity');
