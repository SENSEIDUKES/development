import { describe, expect, it } from 'vitest';
import { createLocalReaderPreferenceStorage } from './readerPreferenceStorage';

const memory = () => {
  const values = new Map<string, string>();
  return {
    values,
    storage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } },
  };
};

describe('createLocalReaderPreferenceStorage', () => {
  it('keeps each host\'s preferences under its own prefix', () => {
    const { values, storage } = memory();
    const app = createLocalReaderPreferenceStorage('novelexpanded-reader-', () => storage);
    const workshop = createLocalReaderPreferenceStorage('workshop.reader.', () => storage);
    app.write('read-aloud', '{"v":1}');
    expect(values.get('novelexpanded-reader-read-aloud')).toBe('{"v":1}');
    expect(workshop.read('read-aloud')).toBeNull();
    expect(app.read('read-aloud')).toBe('{"v":1}');
    app.remove('read-aloud');
    expect(values.size).toBe(0);
  });

  it('treats blocked or missing storage as empty and never throws', () => {
    const blocked = createLocalReaderPreferenceStorage('p-', () => { throw new Error('SecurityError'); });
    expect(blocked.read('read-aloud')).toBeNull();
    expect(() => blocked.write('read-aloud', 'x')).not.toThrow();
    expect(() => blocked.remove('read-aloud')).not.toThrow();
    const missing = createLocalReaderPreferenceStorage('p-', () => undefined);
    expect(missing.read('read-aloud')).toBeNull();
  });
});
