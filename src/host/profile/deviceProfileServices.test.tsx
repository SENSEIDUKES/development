// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import type { UserProfileController, UserProfileServices } from '@seihouse/library/profile';
import { createMockStorySeedRecord } from '../../workshop/previews/story-seed/previewData';
import { allFamiliarOptions } from '../familiar/catalogue';
import { createLocalStorySeedRepository } from '../story-seed/localStorySeedRepository';
import { createDeviceProfileStore, type DeviceProfileStore } from './deviceProfile';
import { createDeviceProfileServices } from './deviceProfileServices';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const READER = { uid: 'reader', email: null, displayName: null, photoURL: null };
const memory = (): ReaderPreferenceStorage => {
  const values = new Map<string, string>();
  return { read: key => values.get(key) ?? null, write: (key, value) => { values.set(key, value); }, remove: key => { values.delete(key); } };
};

let container: HTMLDivElement;
let root: Root;
let store: DeviceProfileStore;
let services: UserProfileServices;
let controller: UserProfileController;

function Probe() {
  controller = services.useController({ currentUser: READER, stories: [], onLogout: () => undefined, onNavigateHome: () => undefined });
  return null;
}
const mount = async () => { await act(async () => root.render(<Probe />)); };
const run = async (action: () => unknown) => { await act(async () => { await action(); }); };

beforeEach(() => {
  window.localStorage.clear();
  store = createDeviceProfileStore({ storage: memory(), uid: 'reader' });
  services = createDeviceProfileServices({ store, familiars: allFamiliarOptions, notYetBuilt: { note: 'Not in the app yet.', features: ['portrait-generation', 'sync'] } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe('The Cave on the device\'s profile', () => {
  it('saves the reader\'s name and aura, and only those, from the identity form', async () => {
    await mount();
    expect(controller.profile).toMatchObject({ uid: 'reader', displayName: '' });
    await run(() => controller.setFormData(previous => ({ ...previous, displayName: 'Mara', displayNameColor: 'rank:foundation', uid: 'someone-else' })));
    await run(() => controller.handleSave());
    expect(store.read()).toMatchObject({ uid: 'reader', displayName: 'Mara', displayNameColor: 'rank:foundation' });
    expect(controller.profile?.displayName).toBe('Mara');
  });

  it('asks before a language change and reverts it after 30 seconds without an answer', async () => {
    vi.useFakeTimers();
    await mount();
    await run(() => controller.handleLanguageChangeDirect('interfaceLanguage', 'ja'));
    expect(controller.pendingLanguageChange).toMatchObject({ interfaceLanguage: 'ja', previousInterfaceLanguage: 'en' });
    expect(controller.countdown).toBe(30);
    await run(() => controller.confirmLanguageChange());
    expect(store.read().interfaceLanguage).toBe('ja');

    await run(() => controller.handleLanguageChangeDirect('defaultReadingLanguage', 'ko'));
    for (let second = 0; second <= 30; second += 1) await run(() => vi.advanceTimersByTime(1_000));
    expect(controller.pendingLanguageChange).toBeNull();
    expect(controller.formData.defaultReadingLanguage).toBe('en');
    expect(store.read().defaultReadingLanguage).toBe('en');
  });

  it('equips a Familiar from the catalogue and keeps its size in range, on the device', async () => {
    await mount();
    await run(() => controller.handleFamiliarChange?.('phoenix'));
    await run(() => controller.handleFamiliarSizeChange?.(9));
    expect(store.read()).toMatchObject({ familiarId: 'phoenix', familiarSize: 2 });
    await run(() => controller.handleFamiliarChange?.('not-a-familiar'));
    expect(controller.error).toBe('This Familiar is not available for selection.');
    expect(store.read().familiarId).toBe('phoenix');
  });

  it('saves the default Reading Mode a new Story Seed starts with', async () => {
    await mount();
    await run(() => controller.handleDefaultChapterWritingStyleChange('Easy Read'));
    expect(store.read().defaultChapterWritingStyle).toBe('Easy Read');
    expect(controller.formData.defaultChapterWritingStyle).toBe('Easy Read');
  });

  it('says portrait generation is not in the app yet, and passes every not-built piece to the Cave', async () => {
    await mount();
    expect(services.notYetBuilt?.features).toEqual(['portrait-generation', 'sync']);
    await run(() => controller.handleGeneratePortrait());
    expect(controller.portraitError).toBe('Not in the app yet.');
    expect(controller.generatedPortraitUrls).toEqual([]);
  });

  it('makes three portraits from the reader\'s photo, keeps the one chosen, and starts fresh next time', async () => {
    let urls = 0;
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:portrait-${++urls}`);
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const images = [1, 2, 3].map(n => new Blob([String(n)], { type: 'image/png' }));
    const make = vi.fn(async () => ({ images }));
    const keep = vi.fn(async (portrait: Blob) => `data:image/jpeg;base64,kept-${await portrait.text()}`);
    services = createDeviceProfileServices({ store, familiars: allFamiliarOptions, portraits: { make, keep } });
    await mount();
    await run(() => controller.setShowPortraitModal(true));
    // A photo first: without one nothing is asked for.
    await run(() => controller.handleGeneratePortrait());
    expect(controller.portraitError).toBe('Choose a photo first.');
    const photo = new File(['me'], 'me.jpg', { type: 'image/jpeg' });
    await run(() => controller.handleFileChange(photo));
    await run(() => controller.handleGeneratePortrait());
    expect(make).toHaveBeenCalledWith(photo);
    expect(controller.generatedPortraitUrls).toEqual(['blob:portrait-1', 'blob:portrait-2', 'blob:portrait-3']);
    expect(controller.portraitError).toBe('');
    await run(() => controller.setChosenPortrait(2));
    await run(() => controller.handleApplyPortrait());
    expect(keep).toHaveBeenCalledWith(images[2]);
    expect(store.read().avatarUrl).toBe('data:image/jpeg;base64,kept-3');
    expect(controller.showPortraitModal).toBe(false);
    expect(controller.generatedPortraitUrls).toEqual([]);
    expect(controller.portraitUploadFile).toBeNull();
    expect(revokeUrl).toHaveBeenCalledWith('blob:portrait-1');
    createUrl.mockRestore();
    revokeUrl.mockRestore();
  });

  it('lets go of portraits that arrive after the builder was closed: the next visit starts fresh', async () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:late');
    let finish: (value: { images: Blob[] }) => void = () => undefined;
    const make = vi.fn(() => new Promise<{ images: Blob[] }>(resolve => { finish = resolve; }));
    services = createDeviceProfileServices({ store, familiars: allFamiliarOptions, portraits: { make, keep: vi.fn() } });
    await mount();
    await run(() => controller.setShowPortraitModal(true));
    await run(() => controller.handleFileChange(new File(['me'], 'me.jpg', { type: 'image/jpeg' })));
    let pending: unknown;
    await run(() => { pending = controller.handleGeneratePortrait(); });
    await run(() => controller.setShowPortraitModal(false));
    await run(async () => { finish({ images: [new Blob(['1'])] }); await pending; });
    await run(() => controller.setShowPortraitModal(true));
    expect(controller.generatedPortraitUrls).toEqual([]);
    expect(createUrl).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('shows the portraits that were made and says why the others were not, or why none were', async () => {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:only');
    const make = vi.fn()
      .mockResolvedValueOnce({ images: [new Blob(['1'])], problem: '2 of 3 portraits could not be made.' })
      .mockResolvedValueOnce({ images: [], problem: 'The portrait could not be made. Try again, or try another photo.' });
    services = createDeviceProfileServices({ store, familiars: allFamiliarOptions, portraits: { make, keep: vi.fn() } });
    await mount();
    await run(() => controller.handleFileChange(new File(['me'], 'me.jpg', { type: 'image/jpeg' })));
    await run(() => controller.handleGeneratePortrait());
    expect(controller.generatedPortraitUrls).toEqual(['blob:only']);
    expect(controller.portraitError).toBe('2 of 3 portraits could not be made.');
    await run(() => controller.handleGeneratePortrait());
    // A failed retry keeps the portraits already made.
    expect(controller.generatedPortraitUrls).toEqual(['blob:only']);
    expect(controller.portraitError).toBe('The portrait could not be made. Try again, or try another photo.');
    vi.restoreAllMocks();
  });

  it('lists the reader\'s own Story Seeds for the Stories page', async () => {
    const repository = createLocalStorySeedRepository({ storageKey: 'test-device-profile-seeds' });
    const record = createMockStorySeedRecord({ userId: 'reader' });
    await repository.importMany('reader', [{ seed: record.seed, blueprint: record.blueprint, originalLanguage: 'en' }]);
    const withSeeds = createDeviceProfileServices({ store, familiars: allFamiliarOptions, storySeeds: { repository, ownerId: 'reader' } });
    const seeds = await withSeeds.listStorySeeds();
    expect(seeds).toHaveLength(1);
    expect(seeds[0]).toEqual({ id: seeds[0].id, userId: 'reader', title: seeds[0].title, createdAt: seeds[0].createdAt, updatedAt: seeds[0].updatedAt });
    await expect(withSeeds.downloadStorySeed({ ...seeds[0], id: 'gone' })).rejects.toThrow('no longer on this device');
  });
});
