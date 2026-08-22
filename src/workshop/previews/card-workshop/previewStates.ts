import type { CardWorkshopOverrides } from '../../../components/card-workshop/shared/types';

export const SYSTEM_PROMPT_STYLE_OPTIONS = [
  { value: 'breakthrough', label: 'Cultivation Breakthrough' },
  { value: 'broken-promise', label: 'Broken Promise' },
  { value: 'target-scan', label: 'Target Scan' },
  { value: 'structured', label: 'Structured Mechanical' },
] as const;

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
  selectedFateOutcome: 'FATE SCARRED',
  systemPromptContentStyle: 'breakthrough',
};
