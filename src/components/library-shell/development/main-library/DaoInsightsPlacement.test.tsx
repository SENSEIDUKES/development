// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MotionGlobalConfig } from 'motion/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { createEmptyStorySeedInput, type StorySeedInput } from '@seihouse/sen/story-seed';
import { MainLibraryHeader, type MainLibraryHeaderAdapter } from '../MainLibraryHeader';
import { DaoSparksButton } from '../DaoSparksButton';
import { CreatorSpace } from '../../../creator-space/development/CreatorSpace';
import { OriginWorkspace } from '../../../story-seed/development/workspaces/OriginWorkspace';
import { OriginSparksContext } from '../../../story-seed/development/workspaces/origin/OriginSparksContext';
import { fillOriginFromSpark } from '../../../story-seed/development/seedState';

vi.mock('@seihouse/library-ui', async importOriginal => ({ ...await importOriginal<typeof import('@seihouse/library-ui')>(), ParticleEffect: () => null }));
vi.mock('../../../../audio/playback', () => ({ useNarrativeAudio: () => ({
  isPlaying: false, currentTrackId: null, stop: vi.fn(),
}) }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const copyText = vi.fn(async (_text: string) => {});
beforeEach(() => {
  MotionGlobalConfig.skipAnimations = true;
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  copyText.mockClear();
  vi.stubGlobal('matchMedia', (query: string) => ({ media: query, matches: false,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
});
afterEach(() => {
  act(() => root.unmount()); container.remove(); document.body.innerHTML = '';
  MotionGlobalConfig.skipAnimations = false; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

const render = async (node: React.ReactNode) => {
  await act(async () => root.render(<LibraryPresentationProvider>{node}</LibraryPresentationProvider>));
};
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); }); };
const click = async (element: Element | null | undefined) => {
  expect(element).toBeTruthy();
  await act(async () => { (element as HTMLElement).click(); });
};
const trigger = () => document.querySelector<HTMLButtonElement>('button[aria-label="Sparks: story ideas"]');
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"][aria-label="Sparks"]');

const adapter = (screen = 'home'): MainLibraryHeaderAdapter => ({
  currentScreen: screen, setCurrentScreen: vi.fn(), activeStoryId: null, setActiveStoryId: vi.fn(),
  syncStatus: 'idle', lastSavedTime: null, currentUser: { email: 'sensei@example.test' },
  userProfile: { displayName: 'Sensei', premiumTier: 'immortal' }, stories: [],
  setIsSettingsOpen: vi.fn(), setIsCodexSheetOpen: vi.fn(), setIsShortcutsOpen: vi.fn(), copyText,
  requestDao: (async () => ({ ok: true, json: async () => ({ hasServerGemini: false }) })) as unknown as MainLibraryHeaderAdapter['requestDao'],
});

it('regression: Sparks is no longer in the header: Logo, Search and the Profile Portrait on every screen', async () => {
  for (const screen of ['home', 'detail', 'profile']) {
    await render(<MainLibraryHeader adapter={adapter(screen)} />);
    const header = container.querySelector('header')!;
    expect(header.querySelector('.dao-sparks-trigger')).toBeNull();
    expect(header.querySelector('[data-slot="app-header-center"]')).toBeNull();
    expect(Array.from(header.querySelectorAll('button'))
      .map(element => element.getAttribute('aria-label'))).toEqual(['Search for stories', 'Profile and preferences']);
    expect(header.querySelector('[data-slot="novel-expanded-logo"]')).not.toBeNull();
  }
});

it('sits beside the Creator Space title, and its panel keeps the host\'s clipboard writer', async () => {
  await render(<CreatorSpace worlds={{ status: 'ready', items: [] }} energy={{ status: 'loading', snapshot: null }} toolkit={[]}
    onCreate={vi.fn()} onContinueWorld={vi.fn()} onOpenWorld={vi.fn()} onOpenStudio={vi.fn()}
    sparks={<DaoSparksButton copyText={copyText} />} />);
  const title = container.querySelector('#creator-space-title')!;
  expect(title.parentElement!.contains(trigger())).toBe(true);
  await click(trigger());
  await settle();
  await click(dialog()!.querySelector('[aria-label="Copy spark"]'));
  expect(copyText).toHaveBeenCalledTimes(1);
  expect(copyText.mock.calls[0][0]).toContain('Genre:');
});

let current: StorySeedInput;
function Origin({ initial }: { initial: StorySeedInput }) {
  const [seed, setSeed] = useState(initial);
  current = seed;
  const sparks = <DaoSparksButton purpose="fill-seed" copyText={copyText}
    host={{ beginSpark: async spark => setSeed(fillOriginFromSpark(spark)) }} />;
  return <OriginSparksContext.Provider value={sparks}><OriginWorkspace seed={seed} updateSeed={setSeed} /></OriginSparksContext.Provider>;
}

it('sits in Story Seed\'s Origin heading, and a chosen spark fills the open seed\'s Origin', async () => {
  const empty = createEmptyStorySeedInput();
  const initial = { ...empty, story: { ...empty.story, required: { ...empty.story.required, premise: 'My own premise.' } } };
  await render(<Origin initial={initial} />);
  const heading = container.querySelector('#seed-workspace-origin-title')!;
  expect(heading.parentElement!.contains(trigger())).toBe(true);
  await click(trigger());
  await settle();
  await click(Array.from(dialog()!.querySelectorAll('button')).find(button => /Use this spark/.test(button.textContent ?? '')));
  await settle();
  expect(dialog()).toBeNull();
  expect(current.story.required.premise).not.toBe('My own premise.');
  expect(current.story.required.premise.length).toBeGreaterThan(0);
  expect(current.story.required.genre).not.toBe('');
  // A writer's own seed stays theirs: it is not marked as started from a spark.
  expect(current.story.optional.startedFrom).toBe(initial.story.optional.startedFrom);
});
