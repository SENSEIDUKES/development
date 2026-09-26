// @vitest-environment jsdom
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { act } from 'react';
import { type Root } from 'react-dom/client';
import { createRoot } from '../../../test-utils/createStoryCreationRoot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHAPTER_WRITING_STYLE_OPTIONS, SEN_LANGUAGES, type SenLanguageCode } from '@seihouse/sen/contracts';
import { buildBlueprintGenerationPayload, buildArcRoadmapExtensionPayload, createBlueprintDraftFromSeed, createEmptyStorySeedInput, normalizeStorySeedInput, reconcileStorySeedBlueprint, type StorySeedInput } from '@seihouse/sen/story-seed';
import { resetMockState } from '../shared/stubs';
import { createMockArcRoadmap } from '../../../workshop/previews/story-seed/previewData';
import { BlueprintReview, StorySeedSettings } from '@seihouse/library/story-seed';

let container: HTMLDivElement;
let root: Root;

const renderSettings = (seed: StorySeedInput, language: SenLanguageCode = 'en') => {
  const onLanguageChange = vi.fn();
  const updateSeed = vi.fn();
  const onReadingModeChange = vi.fn();
  act(() => root.render(
    <LibraryPresentationProvider>
      <StorySeedSettings
        seed={seed}
        updateSeed={updateSeed}
        storyLanguage={{ value: language, onChange: onLanguageChange }}
        onReadingModeChange={onReadingModeChange}
      />
    </LibraryPresentationProvider>,
  ));
  return { onLanguageChange, updateSeed, onReadingModeChange };
};

const languageSelect = () => container.querySelector<HTMLSelectElement>('#story-original-language')!;
const readingModeSelect = () => container.querySelector<HTMLSelectElement>('[data-testid="story-reading-mode"]')!;

const choose = (select: HTMLSelectElement, value: string) => act(() => {
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
});

describe('Story Seed Settings: Story Language and Reading Mode', () => {
  beforeEach(() => {
    resetMockState();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('offers every registry language as the Story Language, showing the seed’s own', () => {
    renderSettings(createEmptyStorySeedInput(), 'ja');
    const select = languageSelect();

    expect(container.textContent).toContain('Story Language');
    expect([...select.options].map(option => option.value)).toEqual(SEN_LANGUAGES.map(language => language.code));
    expect([...select.options].map(option => option.textContent)).toEqual(SEN_LANGUAGES.map(language => language.label));
    expect(select.value).toBe('ja');
  });

  it('reports a chosen Story Language as a stable code', () => {
    const { onLanguageChange } = renderSettings(createEmptyStorySeedInput());
    choose(languageSelect(), 'ko');
    expect(onLanguageChange).toHaveBeenCalledWith('ko');
  });

  it('offers production’s Reading Modes with Standard as the untouched default', () => {
    renderSettings(createEmptyStorySeedInput());
    const select = readingModeSelect();

    expect(container.textContent).toContain('Reading Mode');
    expect([...select.options].map(option => option.value)).toEqual([...CHAPTER_WRITING_STYLE_OPTIONS]);
    expect(select.value).toBe('Standard');
  });

  it('writes a chosen Reading Mode into the seed and tells the workspace it was chosen', () => {
    const seed = createEmptyStorySeedInput();
    const { updateSeed, onReadingModeChange } = renderSettings(seed);
    choose(readingModeSelect(), 'Easy Read');

    expect(onReadingModeChange).toHaveBeenCalledWith('Easy Read');
    const update = updateSeed.mock.calls[0][0] as (seed: StorySeedInput) => StorySeedInput;
    expect(update(seed).story.optional.chapterWritingStyle).toBe('Easy Read');
  });

  it('names no internal capability, slot, or skill', () => {
    renderSettings(createEmptyStorySeedInput(), 'ja');
    expect(container.textContent).not.toMatch(/CAPA|skill|slot|Translation|Accessibility|Harness/i);
  });

  it('confirms both settings read-only on the Blueprint Review before Manifest', () => {
    const seed = createEmptyStorySeedInput();
    seed.story.optional.chapterWritingStyle = 'Literal Reading';
    act(() => root.render(
      <LibraryPresentationProvider>
        <BlueprintReview
          blueprint={createBlueprintDraftFromSeed(seed)}
          setBlueprint={vi.fn()}
          seed={seed}
          updateSeed={vi.fn()}
          onBack={vi.fn()}
          onStartStory={vi.fn()}
          onExportSeed={vi.fn()}
          isGenerating={false}
          originalLanguage="ja"
        />
      </LibraryPresentationProvider>,
    ));

    expect(container.querySelector('#story-original-language')).toBeNull();
    expect(container.querySelector('[data-testid="blueprint-story-language"]')?.getAttribute('data-language')).toBe('ja');
    expect(container.querySelector('[data-testid="blueprint-reading-mode"]')?.textContent).toBe('Literal Reading');
  });
});

describe('Reading Mode stays out of world generation', () => {
  const completeSeed = () => {
    const seed = createEmptyStorySeedInput();
    seed.story.required = { premise: 'A courier crosses the sea.', genre: 'Xianxia', style: 'chinese', storyTags: ['sea'] };
    seed.story.optional.activeArcGoal = { id: 'arc-1-sea', text: 'Cross the sea.', chapters: 100 };
    seed.story.optional.chapterWritingStyle = 'Easy Read';
    return seed;
  };

  it('keeps the setting on the saved seed, including after a Blueprint writes back into it', () => {
    const seed = completeSeed();
    expect(normalizeStorySeedInput(seed).story.optional.chapterWritingStyle).toBe('Easy Read');
    const generated = { ...createBlueprintDraftFromSeed(seed), arcPlans: createMockArcRoadmap(2, seed.story.optional.activeArcGoal), estimatedArcs: 2 };
    expect(reconcileStorySeedBlueprint(seed, generated).seed.story.optional.chapterWritingStyle).toBe('Easy Read');
  });

  it('never sends it to the Blueprint model', () => {
    const payload = buildBlueprintGenerationPayload(completeSeed());
    expect('chapterWritingStyle' in payload.storySeed.story.optional).toBe(false);
    expect(JSON.stringify(payload)).not.toContain('Easy Read');
  });

  it('never sends it when arcs are added either', () => {
    const seed = completeSeed();
    const blueprint = { ...createBlueprintDraftFromSeed(seed), arcPlans: createMockArcRoadmap(2, seed.story.optional.activeArcGoal), estimatedArcs: 2 };
    const payload = buildArcRoadmapExtensionPayload(seed, blueprint, 3);
    expect('chapterWritingStyle' in payload.storySeed.story.optional).toBe(false);
    expect(JSON.stringify(payload.storySeed)).not.toContain('Easy Read');
  });
});
