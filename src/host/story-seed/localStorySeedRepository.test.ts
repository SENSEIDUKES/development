// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyStorySeedInput } from '@seihouse/sen/story-seed';
import { createLocalStorySeedRepository } from './localStorySeedRepository';

const seed = (premise: string) => {
  const input = createEmptyStorySeedInput();
  input.story.required.premise = premise;
  return input;
};

beforeEach(() => window.localStorage.clear());

describe('Local Story Seeds', () => {
  it('keeps each host\'s seeds under its own key, so one host can never reset another\'s', async () => {
    const workshop = createLocalStorySeedRepository({ storageKey: 'workshop-seeds' });
    const app = createLocalStorySeedRepository({ storageKey: 'app-seeds' });
    await workshop.create('reader', seed('A courier returns to the drowned city.'), undefined, 'en');
    await app.create('reader', seed('A prince has seven chapters to live.'), undefined, 'en');

    expect((await workshop.list('reader')).map(record => record.seed.story.required.premise)).toEqual(['A courier returns to the drowned city.']);
    expect((await app.list('reader')).map(record => record.seed.story.required.premise)).toEqual(['A prince has seven chapters to live.']);

    workshop.reset();
    expect(await workshop.list('reader')).toEqual([]);
    expect(await app.list('reader')).toHaveLength(1);
  });

  it('reads the same seeds back in a later visit', async () => {
    const first = createLocalStorySeedRepository({ storageKey: 'app-seeds' });
    const saved = await first.create('reader', seed('A prince has seven chapters to live.'), undefined, 'ja');
    const later = createLocalStorySeedRepository({ storageKey: 'app-seeds' });
    expect(await later.list('reader')).toEqual([saved]);
  });
});
