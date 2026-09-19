import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getSenTextDirection, resolveReadingLanguageCode } from '@seihouse/sen/contracts';

const readerChamberSources = ['development', 'reference'].map(fork => ({
  fork,
  source: readFileSync(new URL(`../${fork}/ReaderChamber.tsx`, import.meta.url), 'utf8'),
}));

const readerViewportSources = ['development', 'reference'].map(fork => ({
  fork,
  source: readFileSync(new URL(`../${fork}/ReaderViewport.tsx`, import.meta.url), 'utf8'),
}));

describe('Reader Chamber reading language', () => {
  it('applies the account fallback order the shared contract defines', () => {
    expect(resolveReadingLanguageCode({ defaultReadingLanguage: 'ja', interfaceLanguage: 'ko' })).toBe('ja');
    expect(resolveReadingLanguageCode({ interfaceLanguage: 'ko' })).toBe('ko');
    expect(resolveReadingLanguageCode({})).toBe('en');
  });

  it.each(readerChamberSources)('resolves $fork reading language through the shared contract only', ({ source }) => {
    expect(source).toContain('resolveReadingLanguageCode');
    expect(source).toContain('defaultReadingLanguage');
    expect(source).toContain('interfaceLanguage');
    // The per-file language-name-to-code mapper this replaced must not return.
    expect(source).not.toContain('getLocaleFromLanguageName');
  });

  it.each(readerViewportSources)('takes $fork text direction from the shared registry', ({ source }) => {
    expect(source).toContain('getSenTextDirection');
    expect(source).not.toContain('getReadingDirection');
  });

  it('keeps direction ownership in the registry', () => {
    expect(getSenTextDirection('en')).toBe('ltr');
    expect(getSenTextDirection('ja')).toBe('ltr');
  });
});
