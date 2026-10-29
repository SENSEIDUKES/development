import { describe, expect, it } from 'vitest';
import { parseRoute, routeSearch, type NovelExpandedRoute } from './routes';

describe('NovelExpanded addresses', () => {
  it('retains mediums in catalogue and Lore addresses and ignores unknown mediums', () => {
    for (const medium of ['novel', 'manga', 'game', 'video'] as const) {
      for (const route of [
        { page: 'discover', medium },
        { page: 'discover', section: 'creators', medium },
        { page: 'discover', section: 'codex', medium },
        { page: 'discover', lore: 'nascent-soul', query: 'Origin Infant', category: 'realms', medium },
      ] satisfies NovelExpandedRoute[]) expect(parseRoute(routeSearch(route))).toEqual(route);
    }
    expect(parseRoute('?page=discover&section=codex&medium=unknown')).toEqual({ page: 'discover', section: 'codex' });
  });
  it('retains Discover destinations on reload and treats Lore addresses as the encyclopedia', () => {
    for (const section of ['creators', 'codex'] as const) {
      const route = { page: 'discover', section } as const;
      expect(parseRoute(routeSearch(route))).toEqual(route);
    }
    expect(parseRoute('?page=discover&section=unknown')).toEqual({ page: 'discover' });
    expect(parseRoute('?page=discover&section=creators&lore=nascent-soul')).toEqual({ page: 'discover', lore: 'nascent-soul' });
  });
  it('keeps encyclopedia articles and their search context inside Discover across reloads', () => {
    for (const route of [
      { page: 'discover', lore: 'index' },
      { page: 'discover', lore: 'nascent-soul', query: '元婴 & Origin Infant', category: 'realms' },
      { page: 'discover', lore: 'unknown' },
    ] satisfies NovelExpandedRoute[]) expect(parseRoute(routeSearch(route))).toEqual(route);
    expect(parseRoute('?page=discover&lore=&q=ignored')).toEqual({ page: 'discover' });
  });
  it('gives each of the four pages its own address and reads it back', () => {
    const pages: NovelExpandedRoute[] = [
      { page: 'home' },
      { page: 'discover' },
      { page: 'create' },
      { page: 'story', storyId: 'hst_1' },
      { page: 'read', storyId: 'hst_1' },
      { page: 'blueprint', storyId: 'hst_1' },
    ];
    expect(pages.map(routeSearch)).toEqual(['', '?page=discover', '?page=create', '?story=hst_1', '?story=hst_1&read=1', '?story=hst_1&blueprint=1']);
    for (const page of pages) expect(parseRoute(routeSearch(page))).toEqual(page);
  });

  it('gives the Profile its address, with the Cave\'s own page when there is one', () => {
    const pages: NovelExpandedRoute[] = [{ page: 'profile' }, { page: 'profile', cave: '/settings' }, { page: 'profile', cave: '/home/familiar' }];
    expect(pages.map(routeSearch)).toEqual(['?page=profile', '?page=profile&cave=%2Fsettings', '?page=profile&cave=%2Fhome%2Ffamiliar']);
    for (const page of pages) expect(parseRoute(routeSearch(page))).toEqual(page);
    // The Cave writes its page into the same address as it moves.
    expect(parseRoute('?page=profile&cave=/rewards')).toEqual({ page: 'profile', cave: '/rewards' });
  });

  it('opens a saved Story Seed in Create by its id', () => {
    const route: NovelExpandedRoute = { page: 'story-seed', seedId: 'seed-1' };
    expect(routeSearch(route)).toBe('?page=story-seed&seed=seed-1');
    expect(parseRoute(routeSearch(route))).toEqual(route);
    expect(parseRoute('?page=story-seed&seed=')).toEqual({ page: 'story-seed' });
  });

  it('keeps an id that needs escaping intact', () => {
    const route: NovelExpandedRoute = { page: 'read', storyId: 'hst a&b' };
    expect(parseRoute(routeSearch(route))).toEqual(route);
  });

  it('reads anything else as Home', () => {
    for (const search of ['?page=unknown', '?read=1', '?story=', '?preview=harness-generation']) {
      expect(parseRoute(search)).toEqual({ page: 'home' });
    }
  });
});
