import { describe, expect, it } from 'vitest';
import { DEFAULT_SEN_LANGUAGE_CODE, SEN_LANGUAGES, getSenLanguageLabel, getSenTextDirection, isSenLanguageCode, normalizeSenLanguageCode, resolveReadingLanguageCode } from '@seihouse/sen/contracts';

describe('SEN language registry', () => {
  it('exposes one entry per supported language with a stable code, label, and direction', () => {
    expect(SEN_LANGUAGES.length).toBeGreaterThan(0);
    const codes = SEN_LANGUAGES.map(language => language.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const language of SEN_LANGUAGES) {
      expect(language.code.trim()).toBe(language.code);
      expect(language.label.trim()).not.toBe('');
      expect(['ltr', 'rtl']).toContain(language.direction);
    }
    expect(codes).toContain(DEFAULT_SEN_LANGUAGE_CODE);
  });

  it('recognizes supported codes and rejects display names and unsupported values', () => {
    expect(isSenLanguageCode('ja')).toBe(true);
    expect(isSenLanguageCode('zh-CN')).toBe(true);
    // Labels are presentation only and are never valid stored values.
    expect(isSenLanguageCode('Japanese (日本語)')).toBe(false);
    expect(isSenLanguageCode('English')).toBe(false);
    expect(isSenLanguageCode('kl')).toBe(false);
    expect(isSenLanguageCode(undefined)).toBe(false);
  });

  it('normalizes unsupported input to the explicit fallback instead of propagating it', () => {
    expect(normalizeSenLanguageCode('ko')).toBe('ko');
    expect(normalizeSenLanguageCode('English')).toBe(DEFAULT_SEN_LANGUAGE_CODE);
    expect(normalizeSenLanguageCode(null)).toBe(DEFAULT_SEN_LANGUAGE_CODE);
    expect(normalizeSenLanguageCode(undefined, 'ja')).toBe('ja');
  });

  it('owns label and text direction lookup for every supported code', () => {
    expect(getSenLanguageLabel('en')).toBe('English');
    expect(getSenLanguageLabel('ja')).toContain('Japanese');
    expect(getSenTextDirection('en')).toBe('ltr');
    expect(getSenTextDirection('unsupported')).toBe('ltr');
  });
});

describe('account reading language resolution', () => {
  it('prefers Default Reading Language, then Interface Language, then English', () => {
    expect(resolveReadingLanguageCode({ defaultReadingLanguage: 'ja', interfaceLanguage: 'es' })).toBe('ja');
    expect(resolveReadingLanguageCode({ interfaceLanguage: 'es' })).toBe('es');
    expect(resolveReadingLanguageCode({})).toBe('en');
  });

  it('falls through an unsupported value rather than displaying it', () => {
    expect(resolveReadingLanguageCode({ defaultReadingLanguage: 'Spanish', interfaceLanguage: 'ko' })).toBe('ko');
    expect(resolveReadingLanguageCode({ defaultReadingLanguage: 'Spanish' })).toBe('en');
  });
});
