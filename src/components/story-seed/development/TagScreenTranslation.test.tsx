// @vitest-environment jsdom
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import { act, useState } from 'react';
import { type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from '../../../test-utils/createStoryCreationRoot';
import { createEmptyStorySeedInput } from '@seihouse/sen/story-seed';
import { loadLanguagePack, useInterfaceLanguageTranslation } from '../../../library/language/interfaceTranslation';
import { OriginPremiseAndTags } from './workspaces/origin/OriginPremiseAndTags';

vi.mock('../../../audio/playback', () => {
  const playback = () => ({
    currentSource: null, currentTrackId: null, isMuted: false, isPlaying: false, volume: 1,
    load: vi.fn(), pause: vi.fn(), play: vi.fn(), setVolume: vi.fn(), stop: vi.fn(),
    subscribeToTrackChange: vi.fn(() => () => undefined), subscribeToQueueEnd: vi.fn(() => () => undefined), toggleMute: vi.fn(),
  });
  return { useNarrativeAudio: playback, useOptionalNarrativeAudio: playback };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Story Tags screen in another language', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = '';
  });

  it.each(['ja', 'ar', 'es'] as const)('shows its own wording, names and numbers included, in %s', async code => {
    const pack = (await loadLanguagePack(code))!;
    let seed = createEmptyStorySeedInput();
    const Harness = () => {
      const [current, setSeed] = useState(seed);
      seed = current;
      useInterfaceLanguageTranslation(code);
      return <OriginPremiseAndTags premise="" genre="Kingdom Building" storyTags={current.story.required.storyTags} onPremiseChange={() => {}} updateSeed={setSeed} beforeTags={null} />;
    };
    await act(async () => { root.render(<LibraryPresentationProvider><Harness /></LibraryPresentationProvider>); });
    const text = () => container.textContent ?? '';
    const attribute = (selector: string, name: string) => document.querySelector(selector)?.getAttribute(name);

    expect(text()).toContain(pack.strings['Required — choose at least one. The writer reads your tags every chapter.']);
    expect(text()).toContain(pack.strings['Suggested']);
    expect(text()).toContain(pack.strings['for your genre']);
    expect(text()).toContain(pack.strings['Browse all tags']);
    expect(text()).toContain(pack.strings['by genre and family']);
    expect(attribute('#celestial-tag-search-input', 'placeholder')).toBe(pack.strings['Search, describe, or add your own tag']);
    expect(attribute('#celestial-tag-search-input', 'aria-label')).toBe(pack.strings['Search story tags']);
    expect(attribute('button[aria-label="' + pack.strings['Show more tag suggestions'] + '"]', 'aria-label')).toBe(pack.strings['Show more tag suggestions']);

    // A chosen tag's remove button speaks in the language, with the tag's own name.
    const suggestion = container.querySelector<HTMLButtonElement>('#style-suggested-tags button')!;
    await act(async () => { suggestion.click(); });
    const chosen = seed.story.required.storyTags[0];
    expect(document.querySelector(`[aria-label="${pack.formatters.removeTag(pack.strings[chosen] ?? chosen)}"], [aria-label="${pack.formatters.removeTag(chosen)}"]`)).not.toBeNull();

    // The browse sheet: its title, groups, count and Done.
    await act(async () => { container.querySelector<HTMLButtonElement>('#origin-tag-browse')!.click(); });
    const sheet = document.querySelector<HTMLElement>('#origin-tag-browser')!;
    expect(sheet.getAttribute('aria-label')).toBe(pack.strings['All story tags']);
    expect(sheet.textContent).toContain(pack.strings['All tags']);
    expect(sheet.textContent).toContain(pack.strings['Done']);
    expect(sheet.textContent).toContain(pack.formatters.tagsChosen('1', '12'));
    expect(sheet.querySelector('#tag-categories')?.getAttribute('aria-label')).toBe(pack.strings['Tag groups']);
  });
});
