// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  installAudioMediaStubs,
  renderWithDevAudio,
} from '../../../test-utils/renderWithDevAudio';
import { createReaderCodexPreviewStory } from '../../../workshop/previews/reader-codex/previewData';
import { resetMockState } from '../../reader-chamber/shared/stubs';
import ReaderCodex from './ReaderCodex';
import { CodexSheetOverlay } from './CodexSheetOverlay';
import type {
  ReaderCodexStoryPatch,
  StoryMemory,
  StoryWorld,
  UpdateStoryFields,
} from '../shared/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const button = (label: string) => {
  const buttons = [...container.querySelectorAll<HTMLButtonElement>('button')];
  return buttons.find((candidate) => (
    candidate.getAttribute('aria-label') === label
    || candidate.textContent?.trim() === label
  )) ?? buttons.find((candidate) => candidate.textContent?.includes(label));
};

const click = async (label: string) => {
  const target = button(label);
  expect(target, `Expected button "${label}" to render`).toBeTruthy();
  await act(async () => target!.click());
};

const setControlValue = async (
  control: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) => {
  const prototype = control instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  expect(setter).toBeTruthy();

  await act(async () => {
    setter!.call(control, value);
    control.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

interface CodexHarnessProps {
  onMemoryUpdate?: (memory: StoryMemory) => void;
  onStoryPatch?: (patch: ReaderCodexStoryPatch) => void;
  initialMemory?: StoryMemory;
}

function CodexHarness({ onMemoryUpdate, onStoryPatch, initialMemory }: CodexHarnessProps) {
  const [story, setStory] = useState<StoryWorld>(() => {
    const preview = createReaderCodexPreviewStory();
    return initialMemory ? { ...preview, memory: initialMemory } : preview;
  });

  const onUpdateMemory = (memory: StoryMemory) => {
    onMemoryUpdate?.(memory);
    setStory((current) => ({ ...current, memory }));
  };

  const updateStoryFields: UpdateStoryFields = async (_storyId, updates) => {
    setStory((current) => {
      const patch = typeof updates === 'function' ? updates(current) : updates;
      onStoryPatch?.(patch);
      return { ...current, ...patch };
    });
  };

  return renderWithDevAudio(
    <ReaderCodex
      memory={story.memory ?? {}}
      arcs={story.arcs}
      onUpdateMemory={onUpdateMemory}
      mcName={story.mcName}
      onJumpToChapter={() => undefined}
      onSwitchTab={() => undefined}
      activeStory={story}
      updateStoryFields={updateStoryFields}
    />,
  );
}

interface OverlayHarnessProps {
  onClose: () => void;
  onJumpToChapter: (chapterNumber: number) => void;
}

function OverlayHarness({ onClose, onJumpToChapter }: OverlayHarnessProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [story, setStory] = useState<StoryWorld>(() => createReaderCodexPreviewStory());
  const updateStoryFields: UpdateStoryFields = async (_storyId, updates) => {
    setStory((current) => ({
      ...current,
      ...(typeof updates === 'function' ? updates(current) : updates),
    }));
  };

  return renderWithDevAudio(
    <CodexSheetOverlay
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setIsOpen(false);
      }}
      activeStory={story}
      onUpdateMemory={(memory) => setStory((current) => ({ ...current, memory }))}
      updateStoryFields={updateStoryFields}
      onJumpToChapter={onJumpToChapter}
    />,
  );
}

beforeEach(() => {
  resetMockState();
  // The Codex overlay renders Reader Codex voice cards through the shared
  // audio session; install the JSDOM media stubs so the package's lifecycle
  // hooks can run without "Not implemented" noise.
  installAudioMediaStubs();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => null),
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('ReaderCodex', () => {
  it('keeps the established Codex sections available alongside the Development Bestiary tab', async () => {
    act(() => root.render(<CodexHarness />));

    expect(container.querySelector('#codex-collage-panel')).toBeTruthy();
    expect(container.querySelector('#codex-characters-and-locations')).toBeTruthy();
    expect(container.querySelector('#codex-sects-and-factions')).toBeTruthy();
    expect(container.querySelector('#codex-timeline')).toBeTruthy();
    expect(container.textContent).toContain('Aetherial Chronicle Collage');
    expect(container.textContent).toContain('Visual Story Recaps');

    await click('Bestiary');
    expect(container.querySelector('#codex-bestiary')).toBeTruthy();
    expect(container.textContent).toContain('No species have been encountered yet.');

    await click('Portraits');

    await click('Karma');
    expect(container.querySelector('#codex-relationships')).toBeTruthy();
    expect(container.querySelector('#codex-karma-ledger')).toBeTruthy();
    expect(container.textContent).toContain('Karma Web');
    expect(container.textContent).toContain('Active Custom Bonds Ledger');
    expect(container.textContent).toContain('Karmic Threads & Plot Lines');

    await click('Power Rankings');
    expect(container.querySelector('#codex-power-system-leadboard')).toBeTruthy();
    expect(container.querySelector('#codex-ability-ledger')).toBeTruthy();
    expect(container.querySelector('#codex-progression-dashboards')).toBeTruthy();
    expect(container.textContent).toContain('Power Overview');
    expect(container.textContent).toContain('Oath of Embers');
    expect(container.textContent).toContain('Cultivation Analytics');

    await click('Artifacts');
    expect(container.querySelector('#codex-divine-artifacts')).toBeTruthy();
    expect(container.textContent).toContain('The Azure Ring');
    expect(container.textContent).toContain('Forge Artifact');

    await click('Fate');
    expect(container.textContent).toContain('Manifest Sovereign');
    expect(container.textContent).toContain('Formulate Domain');
    expect(container.textContent).toContain('Establish Sect');
    expect(container.textContent).toContain('Alter Dao Rules');

    await click('Lore');
    expect(container.querySelector('#codex-glossary-lookup')).toBeTruthy();
    expect(container.textContent).toContain('Qi (\u6c14)');
    expect(container.textContent).toContain('Channel Story Lore');
  });

  it('keeps human and non-human Portraits separate while rendering linked Bestiary species data', async () => {
    const initialMemory: StoryMemory = {
      characters: [{
        id: 'reader-codex-rin',
        name: 'Rin',
        role: 'Oath-reader',
        status: 'alive',
        relationshipToMC: 'Self',
        description: 'A human witness who reads the scars left by broken oaths.',
        portraitKind: 'human',
      }, {
        id: 'reader-codex-lei',
        name: 'Lei',
        role: 'Recurring sky guide',
        status: 'alive',
        relationshipToMC: 'Trusted companion',
        description: 'A young thunder dragon with a persistent role in the journey.',
        portraitKind: 'non-human',
        speciesId: 'reader-codex-thunder-dragons',
      }],
      bestiary: [{
        id: 'reader-codex-thunder-dragons',
        name: 'Thunder Dragons',
        description: 'Storm-born drakes that carry living lightning beneath their scales.',
        classification: 'Celestial dragon',
        traits: ['Storm flight', 'Lightning breath'],
        threatLevel: 'High',
        signatureSound: 'A rolling sky-crack',
        firstEncounteredChapter: 2,
        appearanceChapters: [2, 4],
        notableIndividualIds: ['reader-codex-lei'],
      }],
    };

    act(() => root.render(<CodexHarness initialMemory={initialMemory} />));

    expect(container.textContent).toContain('Human Portraits');
    expect(container.textContent).toContain('Non-Human Portraits');
    expect(container.textContent).toContain('Rin');
    expect(container.textContent).toContain('Lei');

    await click('Bestiary');

    expect(container.querySelector('#codex-bestiary')).toBeTruthy();
    expect(container.textContent).toContain('Thunder Dragons');
    expect(container.textContent).toContain('Celestial dragon');
    expect(container.textContent).toContain('Storm flight');
    expect(container.textContent).toContain('A rolling sky-crack');
    expect(container.textContent).toContain('Lei');
    const bestiaryPanel = container.querySelector('#codex-bestiary')!;
    expect(bestiaryPanel.querySelector('button[aria-label*="Manifest"]')).toBeFalsy();
    expect(bestiaryPanel.textContent).not.toMatch(/Awaken (Portrait|Evolution)/);
  });

  it('keeps Factions informational with no image-generation or Manifest action', () => {
    const initialMemory: StoryMemory = {
      factions: [{
        id: 'reader-codex-ninth-house',
        name: 'The Ninth House of Oaths',
        alignment: 'Neutral',
        description: 'An oath-bound judicial faction.',
        status: 'Active',
        imageUrl: '/legacy-faction-art.png',
      }],
    };

    act(() => root.render(<CodexHarness initialMemory={initialMemory} />));

    const factionPanel = container.querySelector('#codex-sects-and-factions')!;
    expect(factionPanel.textContent).toContain('The Ninth House of Oaths');
    expect(factionPanel.querySelector('button[aria-label*="Manifest"]')).toBeFalsy();
    expect(factionPanel.textContent).not.toMatch(/Awaken (Portrait|Evolution)/);
  });

  it('keeps Deep Memory and author-controlled memory updates functional', async () => {
    const memoryUpdates = vi.fn<(memory: StoryMemory) => void>();
    act(() => root.render(<CodexHarness onMemoryUpdate={memoryUpdates} />));

    expect(container.textContent).not.toContain('Vermilion Debt Fox');
    await click('Deep Memory');
    expect(container.textContent).toContain('Vermilion Debt Fox');

    expect(container.textContent).toContain('Continuity Alerts (1)');
    await click('Clear Alerts');
    expect(memoryUpdates).toHaveBeenCalled();
    expect(memoryUpdates.mock.lastCall?.[0].memoryWarnings).toEqual([]);
    expect(container.textContent).not.toContain('Continuity Alerts');

    await click('Fate');
    const ruleControl = container.querySelector<HTMLTextAreaElement>(
      'textarea[placeholder^="E.g. No one can fly"]',
    );
    expect(ruleControl).toBeTruthy();
    await setControlValue(ruleControl!, 'Witnessed promises cannot be erased.');
    await click('Manifest Reality');

    expect(memoryUpdates.mock.lastCall?.[0].worldRules).toContain(
      'Witnessed promises cannot be erased.',
    );
    expect(ruleControl!.value).toBe('');
  });

  it('keeps dormant linked Portraits out of the Bestiary until Deep Memory is enabled', async () => {
    const initialMemory: StoryMemory = {
      characters: [{
        id: 'reader-codex-hidden-lei',
        name: 'Lei',
        role: 'Dormant storm guide',
        status: 'alive',
        relationshipToMC: 'Unknown',
        description: 'A dragon who has not returned to the current memory.',
        isBeast: true,
        relevanceState: 'dormant',
        speciesId: 'reader-codex-hidden-thunder-dragons',
      }],
      bestiary: [{
        id: 'reader-codex-hidden-thunder-dragons',
        name: 'Thunder Dragons',
        description: 'Storm-born drakes that carry living lightning beneath their scales.',
        classification: 'Celestial dragon',
        traits: [],
        threatLevel: 'High',
        firstEncounteredChapter: 2,
        appearanceChapters: [2],
        notableIndividualIds: ['reader-codex-hidden-lei'],
      }],
    };

    act(() => root.render(<CodexHarness initialMemory={initialMemory} />));
    await click('Bestiary');

    expect(container.textContent).toContain('Thunder Dragons');
    expect(container.textContent).not.toContain('Lei');
    expect(container.textContent).toContain('Linked Portraits are hidden until Deep Memory is enabled.');

    await click('Deep Memory');
    expect(container.textContent).toContain('Lei');
  });
});

describe('CodexSheetOverlay', () => {
  it('closes through the Reader Chamber sheet control', async () => {
    const onClose = vi.fn();
    act(() => root.render(
      <OverlayHarness onClose={onClose} onJumpToChapter={() => undefined} />,
    ));

    expect(container.querySelector('[role="dialog"][aria-label="Codex"]')).toBeTruthy();
    expect(container.textContent).toContain('Ashes of the Ninth Meridian');
    await click('Close Codex Sheet');

    expect(onClose).toHaveBeenCalledTimes(1);
    await act(async () => {
      await new Promise(resolve => window.setTimeout(resolve, 500));
    });
    expect(container.querySelector('[role="dialog"][aria-label="Codex"]')).toBeFalsy();
  });

  it('jumps to a Chronicle chapter and closes the sheet', async () => {
    const onClose = vi.fn();
    const onJumpToChapter = vi.fn();
    act(() => root.render(
      <OverlayHarness onClose={onClose} onJumpToChapter={onJumpToChapter} />,
    ));

    await click('Read Scene Text for Chapter 1: The Oath of Embers');

    expect(onJumpToChapter).toHaveBeenCalledWith(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    await act(async () => {
      await new Promise(resolve => window.setTimeout(resolve, 500));
    });
    expect(container.querySelector('[role="dialog"][aria-label="Codex"]')).toBeFalsy();
  });
});
