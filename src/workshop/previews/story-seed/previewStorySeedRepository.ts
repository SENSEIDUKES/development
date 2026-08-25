import type { StorySeedRecord, StorySeedRepository } from '@seihouse/sen/story-seed';

type StoryBankRepositoryState = 'loading' | 'error';

const unsupported = async (): Promise<never> => {
  throw new Error('This preview repository only simulates Story Bank loading.');
};

/** Deterministic adapters for states the synchronous Workshop store cannot show. */
export const createStoryBankPreviewRepository = (
  state: StoryBankRepositoryState,
): StorySeedRepository => ({
  create: unsupported,
  update: unsupported,
  importMany: unsupported,
  list: state === 'loading'
    ? async () => new Promise<StorySeedRecord[]>(() => undefined)
    : async () => {
        throw new Error('Your saved Story Seeds could not be loaded. Please try again.');
      },
});
