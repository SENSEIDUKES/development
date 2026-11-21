import { describe, expect, it } from 'vitest';
import { SEN_LANGUAGES } from '@seihouse/sen/contracts';
import { STORY_STYLE_OPTIONS } from '../../components/story-seed/shared/storyStyle';
import { CATEGORY_COLORS, STORY_TAG_CATALOG } from '../../components/story-seed/shared/storyTagCatalog';
import { STORY_TAG_NICHES } from '../../components/story-seed/shared/storyTagNiches';
import { GENRE_PRESETS, GENRE_SHELVES } from '../../components/story-seed/development/constants';
import { loadLanguagePack, translateInterfaceText } from './interfaceTranslation';
import type { NonEnglishSenLanguageCode, StoryVocabulary } from './types';

const vocabularies = import.meta.glob<{ default: StoryVocabulary }>('./vocabulary/*.ts', { eager: true });
const languages = SEN_LANGUAGES.map(language => language.code).filter((code): code is NonEnglishSenLanguageCode => code !== 'en');

/** Every story word the reader can meet, exactly as the catalogue writes it. */
const expected: Record<keyof StoryVocabulary, string[]> = {
  traditions: STORY_STYLE_OPTIONS.flatMap(option => [option.label, `${option.label} tradition`]),
  genres: [...GENRE_SHELVES.map(shelf => shelf.name), ...GENRE_PRESETS.flatMap(genre => [genre.id, genre.name]), ...STORY_TAG_NICHES.flatMap(niche => [niche.id, niche.label])],
  categories: Object.keys(CATEGORY_COLORS),
  tags: STORY_TAG_CATALOG.map(tag => tag.label),
};
const sorted = (words: Iterable<string>) => [...new Set(words)].sort();

describe('story vocabulary', () => {
  it('has one file for every language the interface speaks', () => {
    expect(sorted(Object.keys(vocabularies).map(path => path.replace(/^.*\/(.+)\.ts$/, '$1')))).toEqual(sorted(languages));
  });

  it.each(languages)('translates every tradition, genre, tag family and tag into %s', code => {
    const vocabulary = vocabularies[`./vocabulary/${code}.ts`].default;
    for (const section of Object.keys(expected) as (keyof StoryVocabulary)[]) {
      expect(sorted(Object.keys(vocabulary[section])), `${code} ${section}`).toEqual(sorted(expected[section]));
      for (const [english, translated] of Object.entries(vocabulary[section])) {
        expect(translated.trim(), `${code} ${section}: ${english}`).not.toBe('');
      }
    }
  });

  it('shows a tag and a genre in the reader\'s language once the language is loaded', async () => {
    await loadLanguagePack('ja');
    const japanese = vocabularies['./vocabulary/ja.ts'].default;
    expect(translateInterfaceText('beast taming', 'ja')).toBe(japanese.tags['beast taming']);
    expect(translateInterfaceText('Tower Climb', 'ja')).toBe(japanese.genres['Tower Climb']);
    expect(translateInterfaceText('Japanese tradition', 'ja')).toBe(japanese.traditions['Japanese tradition']);
  });
});


describe('Home, Create and Discover interface copy', () => {
  it.each(languages)('provides the new navigation and hero labels in %s', async code => {
    const pack = await loadLanguagePack(code);
    for (const label of ['Welcome to NovelExpanded', 'Create A World', 'Edit', 'Browse plugins', 'Import plugins', 'Studios', 'Open Studio', 'Events']) {
      expect(pack?.strings[label]?.trim(), `${code}: ${label}`).toBeTruthy();
    }
  });

  it('translates the exact Home and Create labels and preserves their English originals', async () => {
    await loadLanguagePack('ja');
    expect(translateInterfaceText('Welcome to NovelExpanded', 'ja')).toBe('NovelExpandedへようこそ');
    expect(translateInterfaceText('Create A World', 'ja')).toBe('世界を作る');
    expect(translateInterfaceText('Edit', 'ja')).toBe('編集');
    expect(translateInterfaceText('Events', 'ja')).toBe('イベント');
    expect(translateInterfaceText('Create A World', 'en')).toBe('Create A World');
  });
});
