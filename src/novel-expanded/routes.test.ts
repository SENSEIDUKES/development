import { describe, expect, it } from 'vitest';
import { parseRoute, routeSearch, type NovelExpandedRoute } from './routes';

describe('NovelExpanded addresses', () => {
  it('gives each of the four pages its own address and reads it back', () => {
    const pages: NovelExpandedRoute[] = [
      { page: 'home' },
      { page: 'create' },
      { page: 'story', storyId: 'hst_1' },
      { page: 'read', storyId: 'hst_1' },
    ];
    expect(pages.map(routeSearch)).toEqual(['', '?page=create', '?story=hst_1', '?story=hst_1&read=1']);
    for (const page of pages) expect(parseRoute(routeSearch(page))).toEqual(page);
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
