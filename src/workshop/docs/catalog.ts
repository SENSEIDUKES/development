/**
 * The NovelExpanded Docs page's view of the catalog: the Workshop route, and
 * the SEN lookup bound to NovelExpanded's own words.
 *
 * The words live in `@seihouse/library/docs`, and the shape and the reading in
 * `@seihouse/sen/docs-knowledge`. This file owns only what is the Workshop's:
 * the preview URL a topic is reached at.
 */
import { novelExpandedDocs } from '@seihouse/library/docs';
import {
  docsTopicsOf,
  findDocsTopic as findInCatalog,
  searchDocs as searchCatalog,
  type DocsCategory,
  type DocsTopic,
} from '@seihouse/sen/docs-knowledge';

export type { DocsCategory, DocsTopic };

export const docsCategories = novelExpandedDocs;
export const docsTopics = docsTopicsOf(novelExpandedDocs);

export function findDocsTopic(id: string) {
  return findInCatalog(novelExpandedDocs, id);
}

export function searchDocs(query: string) {
  return searchCatalog(novelExpandedDocs, query);
}

export function docsHref(id = 'overview') {
  return `?preview=novel-expanded-docs${id === 'overview' ? '' : `&doc=${encodeURIComponent(id)}`}`;
}
