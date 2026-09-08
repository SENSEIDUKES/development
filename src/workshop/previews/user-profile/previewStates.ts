/**
 * Workshop-only preview states for the User Profile replica.
 *
 * These are simulation scenarios, not product UI. Each one fixes the account
 * identity and the profile snapshot the mock services hand to the page; every
 * interaction inside a scenario (editing, check-in, attunement, portrait
 * generation, admin edits) then runs for real against local state.
 */

export type UserProfilePreviewState =
  | 'signed-out'
  | 'new-cultivator'
  | 'developed-cultivator'
  | 'loading'
  | 'error'
  | 'owner-admin';

export interface UserProfilePreviewStateOption {
  id: UserProfilePreviewState;
  label: string;
  description: string;
}

export const USER_PROFILE_PREVIEW_STATES: readonly UserProfilePreviewStateOption[] = [
  {
    id: 'signed-out',
    label: 'Spirit Unlinked',
    description:
      'No account and cloud mode on — the "Link Spirit Realm" screen. Linking signs the mock account in.',
  },
  {
    id: 'new-cultivator',
    label: 'New cultivator',
    description:
      'A freshly linked Reader: no portrait, no relics, no streak, no status effects. Shows every empty state.',
  },
  {
    id: 'developed-cultivator',
    label: 'Developed cultivator',
    description:
      'A Leader with a portrait, all three Qi cores, an attuned relic, active status effects, a 12-day Dao Pillar, relics awaiting offering, stories and seeds.',
  },
  {
    id: 'loading',
    label: 'Loading',
    description:
      'The profile snapshot never resolves. Shows the page skeleton state while the account is linked but empty.',
  },
  {
    id: 'error',
    label: 'Error',
    description:
      'The profile snapshot fails. Shows the page-level error band, plus admin, seed, and portrait failure paths.',
  },
  {
    id: 'owner-admin',
    label: 'Owner / Admin',
    description:
      'Owner role: adds the Akashic Switchboard tab with the mock account and story registries and working role/tier edits.',
  },
] as const;

export const DEFAULT_USER_PROFILE_PREVIEW_STATE: UserProfilePreviewState = 'developed-cultivator';
