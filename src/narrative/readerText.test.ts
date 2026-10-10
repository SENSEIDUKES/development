import { describe, expect, it } from 'vitest';
import {
  DEFAULT_READER_FONTS, DEFAULT_READER_TEXT_SETTINGS, READER_TEXT_SETTINGS_KEY, readReaderTextSettings, resolveReaderText, writeReaderTextSettings,
  type ReaderFonts, type ReaderPreferenceStorage,
} from '@seihouse/sen/reader-runtime';

const memory = (initial?: string) => {
  const values = new Map<string, string>(initial === undefined ? [] : [[READER_TEXT_SETTINGS_KEY, initial]]);
  const storage: ReaderPreferenceStorage = { read: key => values.get(key) ?? null, write: (key, value) => { values.set(key, value); }, remove: key => { values.delete(key); } };
  return { values, storage };
};

describe('Reader text settings', () => {
  it('start at the Reader\'s own size, spacing and weight, in the first fonts on offer', () => {
    expect(readReaderTextSettings()).toEqual(DEFAULT_READER_TEXT_SETTINGS);
    expect(resolveReaderText(DEFAULT_READER_TEXT_SETTINGS)).toEqual({
      font: DEFAULT_READER_FONTS.text[0], titleFont: DEFAULT_READER_FONTS.titles[0], fontSize: '1.075rem', lineHeight: 1.85, fontWeight: 400,
    });
  });

  it('are kept on the device and read back, and anything unreadable is the default', () => {
    const { storage, values } = memory();
    writeReaderTextSettings(storage, { font: 'sans', titleFont: 'display', size: 'largest', lineSpacing: 'relaxed', weight: 500 });
    expect(JSON.parse(values.get(READER_TEXT_SETTINGS_KEY)!)).toEqual({ v: 1, font: 'sans', titleFont: 'display', size: 'largest', lineSpacing: 'relaxed', weight: 500 });
    expect(readReaderTextSettings(storage)).toEqual({ font: 'sans', titleFont: 'display', size: 'largest', lineSpacing: 'relaxed', weight: 500 });

    expect(readReaderTextSettings(memory('not json').storage)).toEqual(DEFAULT_READER_TEXT_SETTINGS);
    expect(readReaderTextSettings(memory('[1]').storage)).toEqual(DEFAULT_READER_TEXT_SETTINGS);
    expect(readReaderTextSettings(memory(JSON.stringify({ font: ' ', size: 'huge', lineSpacing: 3, weight: 900 })).storage)).toEqual(DEFAULT_READER_TEXT_SETTINGS);
    // A storage that refuses to save changes nothing.
    expect(() => writeReaderTextSettings({ read: () => null, write: () => { throw new Error('full'); }, remove: () => undefined }, DEFAULT_READER_TEXT_SETTINGS)).not.toThrow();
  });

  it('fall back to the first font when a saved one is no longer offered', () => {
    const fonts: ReaderFonts = {
      text: [{ id: 'a', label: 'A', family: 'A' }, { id: 'b', label: 'B', family: 'B' }],
      titles: [{ id: 't', label: 'T', family: 'T' }],
    };
    expect(resolveReaderText({ ...DEFAULT_READER_TEXT_SETTINGS, font: 'b', titleFont: 'gone' }, fonts)).toMatchObject({ font: { id: 'b' }, titleFont: { id: 't' } });
    expect(resolveReaderText({ ...DEFAULT_READER_TEXT_SETTINGS, font: 'gone' }, fonts).font.id).toBe('a');
    expect(resolveReaderText(DEFAULT_READER_TEXT_SETTINGS, { text: [], titles: [] }).font).toEqual(DEFAULT_READER_FONTS.text[0]);
  });
});
