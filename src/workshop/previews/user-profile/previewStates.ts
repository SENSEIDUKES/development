/**
 * Workshop-only preview states for the User Profile replica.
 *
 * These are simulation scenarios, not product UI. Each one fixes the account
 * identity, the profile snapshot the mock services hand to the page, and what
 * the account already did in the development economy (see
 * `UserProfileWorkspace`). Every interaction inside a scenario then runs for
 * real against local state and that scenario's economy.
 */

export type UserProfilePreviewState =
  | 'signed-out'
  | 'new-cultivator'
  | 'developed-cultivator'
  | 'loading'
  | 'error'
  | 'owner-admin'
  | 'claim-failed'
  | 'claim-unresolved'
  | 'collected-today'
  | 'home-edge-cases';

export interface UserProfilePreviewStateOption {
  id: UserProfilePreviewState;
  label: string;
  description: string;
}

export const USER_PROFILE_PREVIEW_STATES: readonly UserProfilePreviewStateOption[] = [
  { id: 'claim-failed', label: 'Claim failure', description: 'The Dao Pillar server rejects today’s collection; nothing is deposited and the tile stays available to retry.' },
  { id: 'claim-unresolved', label: 'Uncertain claim', description: 'The collection lands on the server but the answer is lost; the calendar re-reads server truth and shows the day collected once, never twice.' },
  { id: 'collected-today', label: 'Collected today', description: 'A twelve-day run plus today already collected on the Dao Pillar calendar; the card and calendar show it without awarding again.' },
  { id: 'home-edge-cases', label: 'Home edge cases', description: 'Long display name and maximum rank (50,000 DAO XP carried into the DAO XP ledger), with the developed cultivator’s rewards and trained Familiar.' },
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
      'A freshly linked Reader: no portrait, no DAO XP, no QI, no scrolls or Relics, an untrained Familiar. Shows every empty state.',
  },
  {
    id: 'developed-cultivator',
    label: 'Developed cultivator',
    description:
      'A Leader (DAO XP from the ledger) with a portrait, QI to spend, two sealed Mystery Scrolls and one opened, a Fate Survival Relic, Quill trained to Awakened with its lightning title on, a 12-day Dao Pillar, stories and seeds. The Reference pane shows production’s retired Qi cores, attunement and offerings.',
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
