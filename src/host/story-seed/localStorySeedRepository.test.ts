// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyStorySeedInput } from '@seihouse/sen/story-seed';
import { createLocalStorySeedRepository } from './localStorySeedRepository';

const seed = (premise: string) => {
  const input = createEmptyStorySeedInput();
  input.story.required.premise = premise;
  return input;
};

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

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

  it('clears outdated seeds, and says so plainly when browser storage refuses the clearing', async () => {
    window.localStorage.setItem('app-seeds', JSON.stringify([{ schemaVersion: 0, id: 'old-seed' }]));
    const repository = createLocalStorySeedRepository({ storageKey: 'app-seeds' });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    await expect(repository.list('reader')).rejects.toThrow('Outdated Story Seeds could not be cleared. Check browser storage access and try again.');

    setItem.mockRestore();
    expect(await repository.list('reader')).toEqual([]);
    expect(window.localStorage.getItem('app-seeds')).toBe('[]');
  });

  it('still calls damaged data unreadable', async () => {
    window.localStorage.setItem('app-seeds', '{not json');
    const repository = createLocalStorySeedRepository({ storageKey: 'app-seeds' });
    await expect(repository.list('reader')).rejects.toThrow('Saved Story Seed data is unreadable.');
  });
});
