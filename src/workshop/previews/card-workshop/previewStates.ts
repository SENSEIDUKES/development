import type { CardWorkshopOverrides } from '../../../components/card-workshop/shared/types';

export const SYSTEM_KIND_OPTIONS = [
  { value: 'status', label: 'System Status' },
  { value: 'skill_acquired', label: 'Skill Acquired' },
  { value: 'level_up', label: 'Breakthrough / Level Up' },
  { value: 'quest', label: 'Quest Directive' },
  { value: 'appraisal', label: 'Item Appraisal' },
  { value: 'fate_result', label: 'Fate Result Panel' },
];

export const FATE_OUTCOME_OPTIONS: Array<'FATE AVERTED' | 'FATE SCARRED' | 'DOOM MANIFESTED'> = [
  'FATE AVERTED',
  'FATE SCARRED',
  'DOOM MANIFESTED',
];

export const IMAGE_STATE_OPTIONS = [
  { value: 'existing', label: 'Existing image' },
  { value: 'manifest', label: 'Manifest / Awaken action' },
  { value: 'missing', label: 'Missing with no action' },
] as const;

export const INITIAL_CARD_WORKSHOP_OVERRIDES: CardWorkshopOverrides = {
  viewportMode: 'desktop',
  imageState: 'existing',
  codexEntryState: 'present',
  entityMention: 'reveal',
  portraitKind: 'non-human',
  isSenMode: true,
  isRevealVisible: true,
  selectedSystemKind: 'status',
  selectedFateOutcome: 'FATE SCARRED',
};
