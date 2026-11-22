import { describe, expect, it } from 'vitest';
import { SEN_LANGUAGES } from '@seihouse/sen/contracts';
import editorSource from '../../components/story-seed/development/workspaces/origin/OriginTagEditor.tsx?raw';
import { loadLanguagePack, translateInterfaceText } from './interfaceTranslation';
import type { NonEnglishSenLanguageCode } from './types';

const languages = SEN_LANGUAGES.map(language => language.code).filter((code): code is NonEnglishSenLanguageCode => code !== 'en');

/**
 * Every fixed English phrase on the Story Tags screen of Origin (the tag part,
 * its search box and its browse sheet), exactly as `OriginTagEditor` writes
 * them. The interface translates by matching these, so each language's pack
 * holds all of them. Phrases that carry a name or a number (Remove tag …,
 * Add “…” as your own tag, 3 / 12 chosen) are `formatters` instead. Add a
 * phrase here when the screen gains one.
 *
 * The interface matches exact text across the whole app, so a phrase here must
 * not be the exact English of something that means something else elsewhere:
 * the suggestions button reads "More tags", not "More", because the world
 * card's synopsis has its own "More".
 */
const TAG_SCREEN_PHRASES: readonly string[] = [
  'Tags',
  'Required — choose at least one. The writer reads your tags every chapter.',
  'Recommended: 4–8 tags.',
  'Clear all',
  'Your tags',
  'Search, describe, or add your own tag',
  'Search story tags',
  'Matching tags',
  'No tag matches that yet.',
  'Suggested',
  'for your synopsis and genre',
  'for your genre',
  'choose a genre or write a synopsis',
  'Show more tag suggestions',
  'More tags',
  'That is every suggestion. Tap More tags to see them again, or browse all tags.',
  'Choose a genre or write your synopsis, or browse all tags.',
  'Browse all tags',
  'by genre and family',
  'All story tags',
  'All tags',
  'Close tags',
  'Tag groups',
  'Done',
];

describe('Story Tags screen wording', () => {
  it('lists only wording the screen really has, and the screen has no other fixed wording to add', () => {
    for (const phrase of TAG_SCREEN_PHRASES) expect(editorSource, phrase).toContain(phrase);
    expect(new Set(TAG_SCREEN_PHRASES).size).toBe(TAG_SCREEN_PHRASES.length);
  });

  it.each(languages)('is translated into %s, names and numbers included', async code => {
    const pack = (await loadLanguagePack(code))!;
    const untranslated: string[] = [];
    for (const phrase of TAG_SCREEN_PHRASES) {
      const translated = pack.strings[phrase];
      expect(translated?.trim(), `${code}: ${phrase}`).toBeTruthy();
      if (translated === phrase) untranslated.push(phrase);
      expect(translateInterfaceText(phrase, code), `${code}: ${phrase}`).toBe(translated);
    }
    // A few short words are the same in some languages ("Tags", "Done"); a whole screen left in English is a miss.
    expect(untranslated.length, `${code} left in English: ${untranslated.join(' | ')}`).toBeLessThanOrEqual(3);

    expect(pack.formatters.removeTag('slow life')).toContain('slow life');
    expect(pack.formatters.addOwnTag('Bakery Wars')).toContain('Bakery Wars');
    expect(pack.formatters.tagsChosen('3', '12')).toMatch(/3.*12|12.*3/);
    expect(translateInterfaceText('Remove tag slow life', code)).toBe(pack.formatters.removeTag('slow life'));
    expect(translateInterfaceText('Add “Bakery Wars” as your own tag', code)).toBe(pack.formatters.addOwnTag('Bakery Wars'));
    expect(translateInterfaceText('3 / 12 chosen', code)).toBe(pack.formatters.tagsChosen('3', '12'));
  });
});
