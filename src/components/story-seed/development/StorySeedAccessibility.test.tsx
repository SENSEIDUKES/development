// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBlueprintDraftFromSeed,
  createEmptyStorySeedInput,
  STORY_SEED_SCHEMA_VERSION,
} from '../shared/storySeedSchema';
import {
  resetMockState,
  setMockState,
  useAppStore,
} from '../shared/stubs';
import {
  resetStorySeedRepository,
  setStorySeedRepository,
  type StorySeedRecord,
  type StorySeedRepository,
} from '../shared/storySeedRepository';
import { BlueprintReview } from './BlueprintReview';
import CreationModal from './CreationModal';
import { StoryBank } from './StoryBank';
import { StorySeedHeader } from './StorySeedHeader';
import { StorySeedHelpMenu } from './StorySeedHelpMenu';
import { StorySeedMobileNavigation } from './StorySeedMobileNavigation';
import { StorySeedSettings } from './StorySeedSettings';
import { useStoryBankRecords } from './useStoryBankRecords';
import { ArcWorkspace } from './workspaces/ArcWorkspace';
import { OriginGenrePicker } from './workspaces/origin/OriginGenrePicker';
import { OriginPremiseAndTags } from './workspaces/origin/OriginPremiseAndTags';
import { OriginStyleSelector } from './workspaces/origin/OriginStyleSelector';

vi.mock('../../../audio/DevAudioPlayback', () => ({
  useDevAudioPlayback: () => ({
    currentSource: null,
    currentTrackId: null,
    isMuted: false,
    isPlaying: false,
    volume: 1,
    load: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
    setVolume: vi.fn(),
    stop: vi.fn(),
    subscribeToTrackChange: vi.fn(() => () => undefined),
    subscribeToQueueEnd: vi.fn(() => () => undefined),
    toggleMute: vi.fn(),
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  resetMockState();
  resetStorySeedRepository();
  vi.restoreAllMocks();
});

const buttonNamed = (name: string) => Array.from(
  container.querySelectorAll<HTMLButtonElement>('button'),
).find(button => button.textContent?.trim() === name);

const keyboardEvent = (key: string, shiftKey = false) => new KeyboardEvent('keydown', {
  key,
  shiftKey,
  bubbles: true,
  cancelable: true,
});

const sampleRecord = (id = 'seed-1'): StorySeedRecord => {
  const seed = createEmptyStorySeedInput();
  seed.story.required.premise = 'A cultivator returns to a fallen sect.';
  seed.world.optional.worldIdentity.title = 'Fallen Sect';
  return {
    schemaVersion: STORY_SEED_SCHEMA_VERSION,
    id,
    userId: 'creator-1',
    title: 'Fallen Sect',
    createdAt: '2026-08-18T00:00:00.000Z',
    updatedAt: '2026-08-18T00:00:00.000Z',
    seed,
  };
};

describe('Story Seed keyboard and mobile navigation', () => {
  it('traps desktop Settings focus and restores it to the trigger on Escape', () => {
    act(() => root.render(
      <StorySeedHeader
        seed={createEmptyStorySeedInput()}
        updateSeed={vi.fn()}
        isGenerating={false}
        savedFeedback={false}
        showStoryBank={false}
        onSaveDraft={vi.fn()}
        onToggleStoryBank={vi.fn()}
        onOpenHelp={vi.fn()}
      />,
    ));

    const trigger = buttonNamed('Settings');
    expect(trigger).toBeTruthy();
    act(() => trigger!.click());

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = Array.from(dialog!.querySelectorAll<HTMLButtonElement>('button'));
    expect(dialog).toBeTruthy();
    expect(dialog?.contains(document.activeElement)).toBe(true);

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    last.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })));
    expect(document.activeElement).toBe(first);

    first.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })));
    expect(document.activeElement).toBe(last);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    })));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps Tab native in Premise and presents suggestions as explicit buttons', () => {
    const onPremiseChange = vi.fn();
    const updateSeed = vi.fn();
    act(() => root.render(
      <OriginPremiseAndTags
        premise=""
        storyTags={[]}
        onPremiseChange={onPremiseChange}
        updateSeed={updateSeed}
        genrePicker={<button type="button">Genre</button>}
      />,
    ));

    const textarea = container.querySelector<HTMLTextAreaElement>('#core-premise-input');
    const tab = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    act(() => textarea!.dispatchEvent(tab));
    expect(tab.defaultPrevented).toBe(false);
    expect(onPremiseChange).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('press Tab');

    act(() => root.render(
      <OriginPremiseAndTags
        premise="A reborn cultivator returns to the ruined sect."
        storyTags={[]}
        onPremiseChange={onPremiseChange}
        updateSeed={updateSeed}
        genrePicker={<button type="button">Genre</button>}
      />,
    ));
    expect(container.textContent).toContain('Add tag:');
    expect(container.textContent).not.toContain('Tab:');
    const suggestion = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('Add tag:'));
    expect(suggestion).toBeTruthy();
    expect(suggestion?.closest('.glass-field-wrap')).toBeNull();
  });

  it('adds Manifest to the labeled mobile navigation only when generation is ready', () => {
    const onManifest = vi.fn();
    const renderNavigation = (canManifest: boolean) => act(() => root.render(
      <StorySeedMobileNavigation
        seed={createEmptyStorySeedInput()}
        updateSeed={vi.fn()}
        activeSection="origin"
        showStoryBank={false}
        helpOpen={false}
        isGenerating={false}
        savedFeedback={false}
        canManifest={canManifest}
        onSelectSection={vi.fn()}
        onToggleStoryBank={vi.fn()}
        onOpenHelp={vi.fn()}
        onSaveDraft={vi.fn()}
        onManifest={onManifest}
      />,
    ));

    renderNavigation(false);
    let nav = container.querySelector<HTMLElement>('nav[aria-label="Story Seed navigation"]');
    let buttons = Array.from(nav!.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual([
      'Sections',
      'Story Bank',
      'Help',
      'Settings',
    ]);
    expect(container.textContent).not.toContain('Profile');

    renderNavigation(true);
    nav = container.querySelector<HTMLElement>('nav[aria-label="Story Seed navigation"]');
    buttons = Array.from(nav!.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual([
      'Sections',
      'Story Bank',
      'Help',
      'Settings',
      'Manifest',
    ]);
    expect(buttons.every(button => !button.querySelector('.sr-only'))).toBe(true);
    act(() => buttons[4].click());
    expect(onManifest).toHaveBeenCalledTimes(1);
  });

  it('announces why the primary Manifest action is disabled', () => {
    act(() => root.render(
      <CreationModal
        onStartStory={vi.fn()}
        onGenerateBlueprint={vi.fn()}
        isGenerating={false}
        error={null}
      />,
    ));

    const manifest = container.querySelector<HTMLButtonElement>('button[data-variant="manifest"]');
    expect(manifest?.disabled).toBe(true);
    expect(manifest?.getAttribute('aria-label')).toBe(
      'Manifest disabled — missing: Style, Genre, Premise',
    );
  });

  it('keeps custom radio groups to one Tab stop and selects with navigation keys', () => {
    const onStyleSelect = vi.fn();
    act(() => root.render(<OriginStyleSelector selectedStyle="chinese" onSelect={onStyleSelect} />));
    let radios = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    expect(radios.map(radio => radio.tabIndex)).toEqual([0, -1, -1]);
    radios[0].focus();
    act(() => radios[0].dispatchEvent(keyboardEvent('ArrowRight')));
    expect(document.activeElement).toBe(radios[1]);
    expect(onStyleSelect).toHaveBeenLastCalledWith('korean');
    act(() => radios[1].dispatchEvent(keyboardEvent('ArrowLeft')));
    expect(document.activeElement).toBe(radios[0]);
    expect(onStyleSelect).toHaveBeenLastCalledWith('chinese');
    radios[2].focus();
    act(() => radios[2].dispatchEvent(keyboardEvent('Home')));
    expect(document.activeElement).toBe(radios[0]);
    expect(onStyleSelect).toHaveBeenLastCalledWith('chinese');

    const onGenreChange = vi.fn();
    act(() => root.render(<OriginGenrePicker genre="" onChange={onGenreChange} />));
    act(() => buttonNamed('Pick a path')!.click());
    radios = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    expect(radios.filter(radio => radio.tabIndex === 0)).toHaveLength(1);
    radios[0].focus();
    act(() => radios[0].dispatchEvent(keyboardEvent('End')));
    expect(document.activeElement).toBe(radios[radios.length - 1]);
    expect(onGenreChange).toHaveBeenLastCalledWith('Mystery Cultivation');

    const arcUpdate = vi.fn();
    act(() => root.render(<ArcWorkspace seed={createEmptyStorySeedInput()} updateSeed={arcUpdate} />));
    radios = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="radiogroup"]')[0].querySelectorAll('[role="radio"]'));
    expect(radios.map(radio => radio.tabIndex)).toEqual([-1, 0, -1]);
    radios[1].focus();
    act(() => radios[1].dispatchEvent(keyboardEvent('ArrowDown')));
    expect(document.activeElement).toBe(radios[2]);
    expect(arcUpdate).toHaveBeenCalledTimes(1);

    const settingsSeed = createEmptyStorySeedInput();
    settingsSeed.story.optional.fateSurvival.enabled = true;
    const settingsUpdate = vi.fn();
    act(() => root.render(<StorySeedSettings seed={settingsSeed} updateSeed={settingsUpdate} />));
    radios = Array.from(container.querySelectorAll<HTMLButtonElement>('[aria-label="Fate Visibility"] [role="radio"]'));
    expect(radios.filter(radio => radio.tabIndex === 0)).toHaveLength(1);
    radios[0].focus();
    act(() => radios[0].dispatchEvent(keyboardEvent('ArrowRight')));
    expect(document.activeElement).toBe(radios[1]);
    expect(settingsUpdate).toHaveBeenCalledTimes(1);
  });

  it('traps Help focus and returns it to the control that opened the dialog', () => {
    const onClose = vi.fn();
    const renderHelp = (open: boolean) => act(() => root.render(
      <>
        <button type="button">Open Help</button>
        <StorySeedHelpMenu open={open} onClose={onClose} topics={[]} />
      </>,
    ));

    renderHelp(false);
    const trigger = buttonNamed('Open Help')!;
    trigger.focus();
    renderHelp(true);

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]')!;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled])',
    ));
    expect(dialog.contains(document.activeElement)).toBe(true);

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    last.focus();
    act(() => document.dispatchEvent(keyboardEvent('Tab')));
    expect(document.activeElement).toBe(first);
    first.focus();
    act(() => document.dispatchEvent(keyboardEvent('Tab', true)));
    expect(document.activeElement).toBe(last);

    act(() => document.dispatchEvent(keyboardEvent('Escape')));
    expect(onClose).toHaveBeenCalledTimes(1);
    renderHelp(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('announces a successful Blueprint copy and hides the decorative VERSA badge', async () => {
    resetMockState({ activeAgentId: 'versa' });
    const seed = createEmptyStorySeedInput();
    const blueprint = createBlueprintDraftFromSeed(seed);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    act(() => root.render(
      <BlueprintReview
        blueprint={blueprint}
        setBlueprint={vi.fn()}
        seed={seed}
        updateSeed={vi.fn()}
        onBack={vi.fn()}
        onStartStory={vi.fn()}
        onExportSeed={vi.fn()}
        isGenerating
      />,
    ));

    const versaBadge = container.querySelector<HTMLImageElement>('img');
    expect(versaBadge?.alt).toBe('');
    expect(versaBadge?.getAttribute('aria-hidden')).toBe('true');
    await act(async () => buttonNamed('Copy Blueprint')!.click());
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Blueprint copied.');
  });

  it('keeps loaded Story Bank records visible while a new owner is loading', () => {
    const record = sampleRecord();
    act(() => root.render(
      <StoryBank
        seeds={[record]}
        isLoading
        manifestedSeedIds={new Set()}
        isGenerating={false}
        onToggleImport={vi.fn()}
        importPanel={null}
        onExportAll={vi.fn()}
        onEditSeed={vi.fn()}
        onOpenBlueprint={vi.fn()}
        onUseSeed={vi.fn()}
        onExportSeed={vi.fn()}
        onManifest={vi.fn()}
      />,
    ));

    expect(container.textContent).toContain('Refreshing saved seeds…');
    expect(container.textContent).toContain(record.title);
    expect(container.textContent).not.toContain('No saved seeds yet');
  });

  it('retains the prior Story Bank result during a valid owner transition', async () => {
    const firstRecord = sampleRecord();
    let resolveFirst: ((records: StorySeedRecord[]) => void) | undefined;
    const repository: StorySeedRepository = {
      create: vi.fn(),
      update: vi.fn(),
      list: vi.fn((ownerId: string) => new Promise<StorySeedRecord[]>(resolve => {
        if (ownerId === 'owner-one') resolveFirst = resolve;
      })),
      importMany: vi.fn(),
    };
    setStorySeedRepository(repository);

    const RecordsHarness = () => {
      const [ownerId, setOwnerId] = useState('owner-one');
      const { records, isLoading } = useStoryBankRecords(ownerId);
      return (
        <>
          <button type="button" onClick={() => setOwnerId('owner-two')}>Switch owner</button>
          <output>{records.map(record => record.title).join(',')}</output>
          <span>{isLoading ? 'loading' : 'settled'}</span>
        </>
      );
    };

    act(() => root.render(<RecordsHarness />));
    await act(async () => {
      resolveFirst?.([firstRecord]);
      await Promise.resolve();
    });
    expect(container.textContent).toContain(firstRecord.title);
    expect(container.textContent).toContain('settled');

    act(() => buttonNamed('Switch owner')!.click());
    expect(container.textContent).toContain(firstRecord.title);
    expect(container.textContent).toContain('loading');
  });

  it('does not re-render a shallow store selection for unrelated state', () => {
    const renders = vi.fn();
    const StoreProbe = () => {
      useAppStore(state => ({
        activeAgentId: state.activeAgentId,
        currentUser: state.currentUser,
        stories: state.stories,
        equippedRelicTitle: state.routingConfig.storyMaker?.equippedRelicTitle ?? null,
      }));
      renders();
      return null;
    };

    act(() => root.render(<StoreProbe />));
    expect(renders).toHaveBeenCalledTimes(1);
    act(() => setMockState({ activeStoryId: 'unrelated-route-change' }));
    expect(renders).toHaveBeenCalledTimes(1);
    act(() => setMockState({ activeAgentId: 'versa' }));
    expect(renders).toHaveBeenCalledTimes(2);
  });
});
