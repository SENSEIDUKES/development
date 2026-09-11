import type { CSSProperties, HTMLAttributes } from 'react';
import './sen-story-seed-icon.css';

export type StorySeedIconName =
  | 'ability'
  | 'ally-faction'
  | 'arc'
  | 'bank'
  | 'characters'
  | 'enemy-faction'
  | 'power-system'
  | 'scroll'
  | 'style-chinese'
  | 'style-japanese'
  | 'style-korean'
  | 'world'
  | 'world-identity';

const STORY_SEED_ICON_MASKS: Record<StorySeedIconName, string> = {
  ability: '/icons/story-seed/SENAbility.svg',
  'ally-faction': '/icons/story-seed/SENAllyFaction.svg',
  arc: '/icons/story-seed/SENArc.svg',
  bank: '/icons/story-seed/SENBank.svg',
  characters: '/icons/story-seed/SENCharacters.svg',
  'enemy-faction': '/icons/story-seed/SENEnemyFaction.svg',
  'power-system': '/icons/story-seed/SENPowerSystem.svg',
  scroll: '/icons/story-seed/SENScroll.svg',
  'style-chinese': '/icons/story-seed/SENStyleChinese.svg',
  'style-japanese': '/icons/story-seed/SENStyleJapanese.svg',
  'style-korean': '/icons/story-seed/SENStyleKorean.svg',
  world: '/icons/user-profile/SENDiscovery.svg',
  'world-identity': '/icons/story-seed/SENWorldIdentity.svg',
};

interface SENStorySeedIconProps extends HTMLAttributes<HTMLSpanElement> {
  name: StorySeedIconName;
  size?: number;
}

/** Official Story Seed mark, rendered as a mask so it follows its host's color. */
export function SENStorySeedIcon({
  name,
  size = 20,
  className,
  style,
  ...props
}: SENStorySeedIconProps) {
  return (
    <span
      {...props}
      className={['sen-story-seed-icon', className].filter(Boolean).join(' ')}
      data-sen-story-seed-icon={name}
      style={{
        '--sen-story-seed-icon-mask': `url("${STORY_SEED_ICON_MASKS[name]}")`,
        width: size,
        height: size,
        ...style,
      } as CSSProperties}
    />
  );
}
