import type { StorySeedInput } from '../../../components/story-seed/shared/storySeedSchema';

export const shellStates = {
  'main-library': ['linked', 'guest', 'syncing', 'offline', 'profile', 'active-story', 'long-name', 'missing-profile', 'dao-local', 'dao-error'],
  'story-seed': ['empty', 'filled', 'long-title', 'saved', 'generating', 'versa', 'error'],
} as const;
export type ShellSource = keyof typeof shellStates;
export function makeSeed(state: string): StorySeedInput {
  return {
    creator: {},
    story: {
      required: { storyTags: [], premise: state === 'empty' ? '' : 'A fallen disciple remembers seven doomed timelines and has one chance to change fate.', genre: state === 'empty' ? '' : 'Xianxia', style: state === 'empty' ? '' : 'chinese' },
      optional: { intendedForMatureAudiences: false, fateSurvival: { enabled: false, visibility: 'partial', pressure: 'immortal' }, plotAndTropeSettings: { faceSlap: 'medium', plotArmor: 'medium', recognition: 'medium' } },
    },
    world: { required: {}, optional: { worldIdentity: {}, worldFoundations: {} } },
  };
}
