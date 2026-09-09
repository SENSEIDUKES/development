import { scenarios } from '../story-seed/previewStates';
import { USER_PROFILE_PREVIEW_STATES } from '../user-profile/previewStates';
export const headerStates = {
  'header-states': ['context-present', 'context-absent', 'long-context'],
  'main-library': ['linked', 'library', 'discover', 'sects', 'tiers', 'reader', 'guest', 'syncing', 'offline', 'profile', 'active-story', 'long-name', 'missing-profile', 'dao-local', 'dao-error'],
  'story-seed': ['filled-intake', ...scenarios.map(scenario => scenario.id).filter(id => id !== 'filled-intake')],
  'cultivator-cave': ['developed-cultivator', ...USER_PROFILE_PREVIEW_STATES.map(state => state.id).filter(id => id !== 'developed-cultivator')],
} as const;
export type HeaderConfiguration = keyof typeof headerStates;
