import { describe, expect, it } from 'vitest';
import { SEN_LANGUAGES } from '@seihouse/sen/contracts';
import { STORY_STYLE_OPTIONS } from '../../components/story-seed/shared/storyStyle';
import { CATEGORY_COLORS, STORY_TAG_CATALOG } from '../../components/story-seed/shared/storyTagCatalog';
import { STORY_TAG_NICHES } from '../../components/story-seed/shared/storyTagNiches';
import { GENRE_PRESETS } from '../../components/story-seed/development/constants';
import { loadLanguagePack, translateInterfaceText } from './interfaceTranslation';
import type { NonEnglishSenLanguageCode, StoryVocabulary } from './types';

const vocabularies = import.meta.glob<{ default: StoryVocabulary }>('./vocabulary/*.ts', { eager: true });
const languages = SEN_LANGUAGES.map(language => language.code).filter((code): code is NonEnglishSenLanguageCode => code !== 'en');

/** Every story word the reader can meet, exactly as the catalogue writes it. */
const expected: Record<keyof StoryVocabulary, string[]> = {
  traditions: STORY_STYLE_OPTIONS.flatMap(option => [option.label, `${option.label} tradition`]),
  genres: [...GENRE_PRESETS.flatMap(genre => [genre.id, genre.name]), ...STORY_TAG_NICHES.flatMap(niche => [niche.id, niche.label])],
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
