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

  it('keeps a valid accent across reloads, rejects invalid values and resets without changing identity', () => {
    const { storage } = memory();
    const store = createDeviceProfileStore({ storage, uid: 'reader' });
    store.save({ displayName: 'Mara', accentColor: '#A78BFA' });
    expect(createDeviceProfileStore({ storage, uid: 'reader' }).read().accentColor).toBe('#a78bfa');
    store.save({ accentColor: 'url(bad)' });
    expect(store.read().accentColor).toBe('#a78bfa');
    store.save({ accentColor: undefined });
    expect(createDeviceProfileStore({ storage, uid: 'reader' }).read()).toMatchObject({ displayName: 'Mara', accentColor: undefined });
    expect(createDeviceProfileStore({ storage: memory(JSON.stringify({ accentColor: '#oops' })).storage, uid: 'reader' }).read().accentColor).toBeUndefined();
  });

  it('keeps background tint across reload, ignores invalid changes and resets only the tint', () => {
    const { storage } = memory();
    const store = createDeviceProfileStore({ storage, uid: 'reader' });
    store.save({ accentColor: '#123456', displayName: 'Mara', backgroundTint: { color: '#FF69B4', strength: 75 } });
    expect(createDeviceProfileStore({ storage, uid: 'reader' }).read().backgroundTint).toEqual({ color: '#ff69b4', strength: 75 });
    store.save({ backgroundTint: { color: '#ff69b4', strength: Infinity } });
    expect(store.read().backgroundTint?.strength).toBe(75);
    store.save({ backgroundTint: undefined });
    expect(createDeviceProfileStore({ storage, uid: 'reader' }).read()).toMatchObject({ backgroundTint: undefined, accentColor: '#123456', displayName: 'Mara' });
    const damaged = JSON.stringify({ backgroundTint: { color: 'red', strength: 50 } });
    expect(createDeviceProfileStore({ storage: memory(damaged).storage, uid: 'reader' }).read().backgroundTint).toBeUndefined();
  });

  it('persists only catalog image IDs and leaves other appearance choices intact', () => {
    const { storage } = memory();
    const store = createDeviceProfileStore({ storage, uid: 'reader' });
    store.save({ accentColor: '#a78bfa', backgroundTint: { color: '#ff69b4', strength: 60 }, backgroundImageId: 'blood-moon' });
    expect(createDeviceProfileStore({ storage, uid: 'reader' }).read().backgroundImageId).toBe('blood-moon');
    store.save({ backgroundImageId: 'https://unknown.example/image.png' });
    expect(store.read().backgroundImageId).toBe('blood-moon');
    store.save({ backgroundImageId: 'home-background' });
    expect(store.read()).toMatchObject({ backgroundImageId: 'home-background', accentColor: '#a78bfa', backgroundTint: { color: '#ff69b4', strength: 60 } });
    expect(createDeviceProfileStore({ storage: memory(JSON.stringify({ backgroundImageId: 'bad' })).storage, uid: 'reader' }).read().backgroundImageId).toBeUndefined();
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
    expect(store.save({ displayName: 'Mara', backgroundTint: { color: '#00ff00', strength: 40 } }).displayName).toBe('Mara');
    expect(store.read().displayName).toBe('Mara');
    expect(store.read().backgroundTint).toEqual({ color: '#00ff00', strength: 40 });
  });
});
