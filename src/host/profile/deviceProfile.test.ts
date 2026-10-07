import { describe, expect, it, vi } from 'vitest';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import { defaultFamiliar } from '../familiar/catalogue';
import { createDeviceProfileStore, DEVICE_PROFILE_KEY } from './deviceProfile';

const memory = (initial?: string) => {
  const values = new Map<string, string>(initial === undefined ? [] : [[DEVICE_PROFILE_KEY, initial]]);
  const storage: ReaderPreferenceStorage = { read: key => values.get(key) ?? null, write: (key, value) => { values.set(key, value); }, remove: key => { values.delete(key); } };
  return { values, storage };
};
const clock = (iso: string) => () => new Date(iso);

describe('The reader\'s profile on this device', () => {
  it('opens a new reader\'s record with the default Familiar, saved at once so its first day stays put', () => {
    const { values, storage } = memory();
    const record = createDeviceProfileStore({ storage, uid: 'reader', now: clock('2026-10-07T10:00:00.000Z') }).read();
    expect(record).toMatchObject({
      uid: 'reader', role: 'user', displayName: '', familiarId: defaultFamiliar.definition.id,
      interfaceLanguage: 'en', defaultReadingLanguage: 'en', joinedDate: '2026-10-07T10:00:00.000Z',
    });
    expect(JSON.parse(values.get(DEVICE_PROFILE_KEY)!)).toMatchObject({ joinedDate: '2026-10-07T10:00:00.000Z' });
    // The next visit reads the same record back.
    expect(createDeviceProfileStore({ storage, uid: 'reader', now: clock('2026-10-09T10:00:00.000Z') }).read().joinedDate).toBe('2026-10-07T10:00:00.000Z');
  });

  it('saves what the reader changes, tells every surface, and keeps it for the next visit', () => {
    const { storage } = memory();
    const store = createDeviceProfileStore({ storage, uid: 'reader', now: clock('2026-10-07T10:00:00.000Z') });
    const listener = vi.fn();
    store.subscribe(listener);
    const saved = store.save({ displayName: 'Mara', familiarId: 'phoenix', familiarSize: 1.4, defaultChapterWritingStyle: 'Easy Read' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.read()).toBe(saved);
    expect(createDeviceProfileStore({ storage, uid: 'reader' }).read()).toMatchObject({
      displayName: 'Mara', familiarId: 'phoenix', familiarSize: 1.4, defaultChapterWritingStyle: 'Easy Read',
    });
  });

  it('never lets a save change who the reader is or what authority they have', () => {
    const { storage } = memory();
    const store = createDeviceProfileStore({ storage, uid: 'reader' });
    store.save({ uid: 'someone-else', role: 'owner', displayName: 'Mara' });
    expect(store.read()).toMatchObject({ uid: 'reader', role: 'user', displayName: 'Mara' });
  });

  it('reads a damaged record as a new reader\'s, and a hand-edited one as this device\'s reader', () => {
    expect(createDeviceProfileStore({ storage: memory('{not json').storage, uid: 'reader' }).read()).toMatchObject({ uid: 'reader', displayName: '' });
    const tampered = JSON.stringify({ uid: 'someone-else', role: 'owner', displayName: 7, interfaceLanguage: 'xx', familiarSize: 'big', activeStories: 'no' });
    expect(createDeviceProfileStore({ storage: memory(tampered).storage, uid: 'reader' }).read()).toMatchObject({
      uid: 'reader', role: 'user', displayName: '', interfaceLanguage: 'en', familiarSize: undefined, activeStories: [],
    });
  });

  it('holds the record for the visit when the device refuses to keep it', () => {
    const storage: ReaderPreferenceStorage = {
      read: () => { throw new Error('blocked'); },
      write: () => { throw new Error('full'); },
      remove: () => undefined,
    };
    const store = createDeviceProfileStore({ storage, uid: 'reader' });
    expect(store.save({ displayName: 'Mara' }).displayName).toBe('Mara');
    expect(store.read().displayName).toBe('Mara');
  });
});
