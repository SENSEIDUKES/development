// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HarnessSkillManifest, HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import { installOfficialCapaSkillsInMemory } from '../../../host/generation/capa/officialCapaSkills';
import { installAudioMediaStubs, renderWithDevAudio } from '../../../test-utils/renderWithDevAudio';
import { AppReader, applyReaderAudioState } from './AppReader';
import { ReaderMixerProvider, type ReaderMixer } from '@seihouse/audio-player';
import { createHostReaderMixer } from '../../../host/reader/readerMixer';
import { readerScenes, type ReaderPage, type ReaderSceneId } from './readerScenes';
import { loadSampleStory, startSceneRun } from './sampleStory';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let sample: HarnessWorkspaceState;
let skills: HarnessSkillManifest[];
let container: HTMLDivElement;
let root: Root;
let audioMixer: ReaderMixer | undefined;

const memoryPreferences = (): ReaderPreferenceStorage => {
  const values = new Map<string, string>();
  return { read: key => values.get(key) ?? null, write: (key, value) => { values.set(key, value); }, remove: key => { values.delete(key); } };
};

beforeAll(async () => {
  sample = await loadSampleStory();
  skills = await installOfficialCapaSkillsInMemory(async definition =>
    new Uint8Array(await readFile(path.resolve(__dirname, '../../../host/generation/capa/official-capa', definition.archiveFile))));
});
beforeEach(() => {
  installAudioMediaStubs();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true, writable: true,
    value: vi.fn().mockImplementation((media: string) => ({
      matches: false, media, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })),
  });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); audioMixer?.dispose(); audioMixer = undefined; container.remove(); vi.unstubAllGlobals(); });

const flush = async (ms = 0) => { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); };
const waitFor = async (found: () => unknown, label: string) => {
  for (let tries = 0; tries < 100 && !found(); tries += 1) await flush(20);
  expect(found(), label).toBeTruthy();
};
const button = (label: string) => container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
const buttonByText = (text: string) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(candidate => candidate.textContent?.trim() === text);
const chapterTitle = (chapterNumber: number) => container.querySelector(`[data-chapter-number="${chapterNumber}"] h1`)?.textContent;

const render = async (sceneId: ReaderSceneId, page?: { id: ReaderPage; request: number }) => {
  const scene = readerScenes(8).find(candidate => candidate.id === sceneId)!;
  await act(async () => root.render(renderWithDevAudio(
    <AppReader run={startSceneRun(sample, scene, 40)} skills={skills} readerPreferences={memoryPreferences()} page={page} />,
  )));
  await flush();
};

describe('the Reader Chamber workspace: the app\'s Reader', { timeout: 30_000 }, () => {
  it('opens Sundered Heavens on Chapter 1 with all eight chapters to read', async () => {
    await render('first-chapter');
    await waitFor(() => chapterTitle(1), 'Chapter 1 on screen');
    expect(chapterTitle(1)).toBe('Rust and Fractures');
    expect(button('Next Chapter')).toBeTruthy();
    // The Familiar floats over the Reader: it is not kept in the top bar by default.
    expect(container.querySelector('[data-testid="reader-top-bar"] [aria-label="Show Quill actions"]')).toBeNull();
    expect(container.querySelectorAll('[data-chapter-number="1"] p[data-sen-text-block], [data-chapter-number="1"] [data-sen-text-block]').length).toBeGreaterThanOrEqual(50);
  });

  it('writes Chapter 8 behind the writing screen from its saved reply, then opens it', async () => {
    await render('write-next');
    await waitFor(() => chapterTitle(7), 'Chapter 7 on screen');
    expect(chapterTitle(7)).toBe('Shadow of the Crane Skyship');
    const write = button('Next Chapter: Write Chapter 8');
    expect(write).toBeTruthy();
    await act(async () => { write!.click(); });
    await flush();
    // VERSA's writing screen covers the Reader while the chapter is written.
    expect(container.querySelector('img[alt="VERSA"]')?.closest('.fixed')?.textContent).toContain('Chapter 8');
    await waitFor(() => chapterTitle(8), 'Chapter 8 on screen');
    expect(chapterTitle(8)).toBe('Ambush at the North Ridge Gate');
  });

  it('says what happens when the writer cannot help: there is no Chapter 9 to replay', async () => {
    await render('newest');
    await waitFor(() => chapterTitle(8), 'Chapter 8 on screen');
    expect(buttonByText('Rewrite this chapter')).toBeTruthy();
    await act(async () => { button('Next Chapter: Write Chapter 9')!.click(); });
    await waitFor(() => container.querySelector('[role="alert"]')?.textContent?.includes('no saved Chapter 9'), 'the writer\'s reason');
    expect(chapterTitle(8)).toBe('Ambush at the North Ridge Gate');
  });

  it('opens a Reader page through the Reader\'s own button', async () => {
    await render('middle', { id: 'codex', request: 1 });
    await waitFor(() => document.querySelector('[data-testid="reader-panel-codex"]'), 'the Codex panel');
    expect(document.querySelector('[data-testid="reader-panel-codex"] h2')!.textContent).toBe('Codex');
    // Sundered Heavens' record: its main character leads the Codex's characters.
    expect(document.querySelectorAll('[data-testid="codex-character"]').length).toBeGreaterThan(1);
    // Its declared sect speaks, and stays out of the characters.
    expect([...document.querySelectorAll('[data-testid="codex-character"]')].map(tile => tile.textContent)).not.toContainEqual(expect.stringContaining('Iron Crane Sect'));
    await act(async () => { [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(tab => tab.textContent?.startsWith('Factions'))!.click(); });
    expect(document.querySelector('[data-testid="codex-faction"]')!.textContent).toContain('Iron Crane Sect');
  });

  it('inspects the real audio note in on, muted and settings states', async () => {
    const run = startSceneRun(sample, readerScenes(8)[0], 40);
    const preferences = memoryPreferences();
    const mixer = createHostReaderMixer(preferences);
    audioMixer = mixer;
    const show = async (id: 'on' | 'muted' | 'settings', request: number) => {
      if (id !== 'settings') await act(async () => applyReaderAudioState(mixer, id));
      await act(async () => root.render(renderWithDevAudio(<ReaderMixerProvider mixer={mixer}><AppReader run={run} skills={skills} readerPreferences={preferences} audio={{ id, request }} /></ReaderMixerProvider>)));
    };
    await show('muted', 1);
    expect(mixer.getPreferences().masterEnabled).toBe(true);
    expect(button('Unmute story audio')).not.toBeNull();
    await show('on', 2);
    await waitFor(() => button('Mute story audio'), 'sound on note');
    await show('settings', 3);
    await waitFor(() => document.querySelector('[role="dialog"]'), 'Audio settings panel');
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Audio');
  });

  it('keeps what happened in the scene when the Reader opens again, as when the Workshop view changes', async () => {
    const run = startSceneRun(sample, readerScenes(8).find(candidate => candidate.id === 'write-next')!, 40);
    const show = () => act(async () => root.render(renderWithDevAudio(<AppReader run={run} skills={skills} readerPreferences={memoryPreferences()} />)));
    await show();
    await waitFor(() => button('Next Chapter: Write Chapter 8'), 'Write Chapter 8');
    await act(async () => { button('Next Chapter: Write Chapter 8')!.click(); });
    await waitFor(() => chapterTitle(8), 'Chapter 8 on screen');
    act(() => root.unmount());
    root = createRoot(container);
    await show();
    await waitFor(() => chapterTitle(8), 'Chapter 8 still there');
    expect(button('Next Chapter: Write Chapter 9')).toBeTruthy();
  });

  it('goes Back to World Info, whose Continue returns to the chapter being read', async () => {
    await render('middle');
    await waitFor(() => chapterTitle(4), 'Chapter 4 on screen');
    await act(async () => { buttonByText('Back')!.click(); });
    await waitFor(() => container.querySelector('[data-world-info-chapters="action"]'), 'World Info');
    const action = container.querySelector<HTMLButtonElement>('[data-world-info-chapters="action"]')!;
    expect(action.textContent).toBe('Continue');
    await act(async () => { action.click(); });
    await waitFor(() => chapterTitle(4), 'back on Chapter 4');
  });
});
