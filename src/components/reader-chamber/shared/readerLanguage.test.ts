import { describe, expect, it } from 'vitest';
import {
  DEFAULT_READER_LANGUAGE_CHOICE,
  normalizeReaderLanguageChoice,
  resolveReaderLanguage,
} from './readerLanguage';

const story = { originalLanguage: 'ja' } as const;

describe('the Reader’s three reading-language choices', () => {
  it('reads the story’s own language in Original mode and asks for no translation', () => {
    const resolved = resolveReaderLanguage({ mode: 'original' }, {
      ...story,
      account: { defaultReadingLanguage: 'en' },
    });

    expect(resolved).toEqual({ language: 'ja', mode: 'original', translationRequired: false });
  });

  it('resolves Account Default through Default Reading Language, Interface Language, then English', () => {
    const account = (value: Record<string, unknown>) =>
      resolveReaderLanguage({ mode: 'account' }, { ...story, account: value }).language;

    expect(account({ defaultReadingLanguage: 'ko', interfaceLanguage: 'vi' })).toBe('ko');
    expect(account({ interfaceLanguage: 'vi' })).toBe('vi');
    expect(account({})).toBe('en');
  });

  it('resolves a Specific Language override regardless of the account', () => {
    const resolved = resolveReaderLanguage({ mode: 'specific', language: 'th' }, {
      ...story,
      account: { defaultReadingLanguage: 'ko' },
    });

    expect(resolved).toEqual({ language: 'th', mode: 'specific', translationRequired: true });
  });

  it('never requests a translation when a mode happens to resolve to the original language', () => {
    // Account Default that already equals the story's own language is canon.
    expect(resolveReaderLanguage({ mode: 'account' }, {
      ...story,
      account: { defaultReadingLanguage: 'ja' },
    }).translationRequired).toBe(false);

    expect(resolveReaderLanguage({ mode: 'specific', language: 'ja' }, story).translationRequired).toBe(false);
  });
});

describe('an account default change only moves stories that follow it', () => {
  const before = { defaultReadingLanguage: 'ko' };
  const after = { defaultReadingLanguage: 'vi' };

  it('moves a story left on Account Default', () => {
    expect(resolveReaderLanguage({ mode: 'account' }, { ...story, account: before }).language).toBe('ko');
    expect(resolveReaderLanguage({ mode: 'account' }, { ...story, account: after }).language).toBe('vi');
  });

  it('leaves Original and Specific stories exactly where their reader put them', () => {
    for (const account of [before, after]) {
      expect(resolveReaderLanguage({ mode: 'original' }, { ...story, account }).language).toBe('ja');
      expect(resolveReaderLanguage({ mode: 'specific', language: 'th' }, { ...story, account }).language).toBe('th');
    }
  });
});

describe('reading an untrusted saved choice', () => {
  it('defaults an unsaved or unreadable choice to Account Default', () => {
    expect(normalizeReaderLanguageChoice(undefined)).toEqual(DEFAULT_READER_LANGUAGE_CHOICE);
    expect(normalizeReaderLanguageChoice('ja')).toEqual(DEFAULT_READER_LANGUAGE_CHOICE);
    expect(normalizeReaderLanguageChoice({ mode: 'nonsense' })).toEqual(DEFAULT_READER_LANGUAGE_CHOICE);
  });

  it('applies the account default initially without changing story canon', () => {
    const resolved = resolveReaderLanguage(normalizeReaderLanguageChoice(undefined), {
      originalLanguage: 'ja',
      account: { defaultReadingLanguage: 'ko' },
    });

    expect(resolved).toEqual({ language: 'ko', mode: 'account', translationRequired: true });
    expect(story.originalLanguage).toBe('ja');
  });

  it('refuses a specific override that names an unsupported language', () => {
    expect(normalizeReaderLanguageChoice({ mode: 'specific', language: 'kl' }))
      .toEqual(DEFAULT_READER_LANGUAGE_CHOICE);
    expect(normalizeReaderLanguageChoice({ mode: 'specific', language: 'ko' }))
      .toEqual({ mode: 'specific', language: 'ko' });
  });

  it('falls back to English when the story records no supported original language', () => {
    expect(resolveReaderLanguage({ mode: 'original' }, { originalLanguage: undefined }).language).toBe('en');
  });
});
