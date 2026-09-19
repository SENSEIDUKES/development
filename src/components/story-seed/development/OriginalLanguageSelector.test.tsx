// @vitest-environment jsdom
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { act } from 'react';
import { type Root } from 'react-dom/client';
import { createRoot } from '../../../test-utils/createStoryCreationRoot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SEN_LANGUAGES } from '../../../lib/language';
import { createBlueprintDraftFromSeed, createEmptyStorySeedInput } from '../shared/storySeedSchema';
import { resetMockState } from '../shared/stubs';
import { BlueprintReview } from './BlueprintReview';

let container: HTMLDivElement;
let root: Root;

const renderReview = (originalLanguage: 'en' | 'ja', onOriginalLanguageChange = vi.fn()) => {
  const seed = createEmptyStorySeedInput();
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
        originalLanguage={originalLanguage}
        onOriginalLanguageChange={onOriginalLanguageChange}
      />
    </LibraryPresentationProvider>,
  ));
  return { onOriginalLanguageChange };
};

const languageSelect = () => container.querySelector<HTMLSelectElement>('#story-original-language')!;

describe('Story Seed Original Language selector', () => {
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

  it('is visible where the story is manifested, offering every registry language', () => {
    renderReview('en');
    const select = languageSelect();

    expect(select).not.toBeNull();
    expect(container.textContent).toContain('Original Language');
    expect([...select.options].map(option => option.value)).toEqual(SEN_LANGUAGES.map(language => language.code));
    expect([...select.options].map(option => option.textContent)).toEqual(SEN_LANGUAGES.map(language => language.label));
  });

  it('shows the initialized language rather than defaulting the control to English', () => {
    renderReview('ja');

    expect(languageSelect().value).toBe('ja');
  });

  it('reports a chosen language as a stable code', () => {
    const { onOriginalLanguageChange } = renderReview('en');
    const select = languageSelect();

    act(() => {
      select.value = 'ko';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onOriginalLanguageChange).toHaveBeenCalledWith('ko');
  });
});
