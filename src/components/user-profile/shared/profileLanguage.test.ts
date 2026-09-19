import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SEN_LANGUAGES, isSenLanguageCode } from '@seihouse/sen/contracts';
import { type UserProfile } from '@seihouse/library/profile';

const SOURCE_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

/** The single file allowed to name a retired field, to document its removal. */
const REMOVAL_NOTE = join('story-seed', 'shared', 'storyAdministrativeMetadata.ts');

/** Contract sources only: a test may still name a retired field to prove it is gone. */
const sourceFiles = (directory: string): string[] => readdirSync(directory).flatMap(entry => {
  const path = join(directory, entry);
  if (statSync(path).isDirectory()) return sourceFiles(path);
  return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
});

describe('Profile language contract', () => {
  it('names the two distinct account language responsibilities', () => {
    const profile: Pick<UserProfile, 'interfaceLanguage' | 'defaultReadingLanguage'> = {
      interfaceLanguage: 'en',
      defaultReadingLanguage: 'ja',
    };

    expect(profile.interfaceLanguage).not.toBe(profile.defaultReadingLanguage);
    expect(isSenLanguageCode(profile.interfaceLanguage)).toBe(true);
    expect(isSenLanguageCode(profile.defaultReadingLanguage)).toBe(true);
  });

  it('offers every registry language through one shared option list', () => {
    const panel = readFileSync(
      new URL('../development/UserProfileSettingsPanel.tsx', import.meta.url),
      'utf8',
    );

    expect(panel).toContain('SEN_LANGUAGES');
    expect(panel).toContain('interfaceLanguage');
    expect(panel).toContain('defaultReadingLanguage');
    // The panel's own hardcoded option list must not come back.
    expect(panel).not.toContain('const LANGUAGE_OPTIONS');
    expect(SEN_LANGUAGES.some(language => language.code === 'en')).toBe(true);
  });
});

describe('retired language fields', () => {
  it('no longer appear in any active development contract', () => {
    const offenders = sourceFiles(SOURCE_ROOT).flatMap(path => {
      const source = readFileSync(path, 'utf8');
      return ['preferredLanguage', 'defaultTranslationLanguage', 'currentLanguage']
        .filter(name => source.includes(name) && !path.endsWith(REMOVAL_NOTE))
        .map(name => `${path}: ${name}`);
    });

    expect(offenders).toEqual([]);
  });
});
