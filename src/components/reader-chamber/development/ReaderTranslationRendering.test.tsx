// @vitest-environment jsdom
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import React, { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SenLanguageCode } from '../../../lib/language';
import type {
  ReaderChapter,
  ReaderPreferences,
  StoryBlock,
  StoryWorld,
} from '../shared/types';
import { resetMockState } from '../shared/stubs';
import {
  buildReaderFacingChapter,
  mergeReaderTranslation,
} from '../shared/translation/readerFacing';
import { validateReaderTranslationResponse } from '../shared/translation/validate';
import { ReaderViewport } from './ReaderViewport';

// World Cue controls mount a real playback adapter; the Reader's own audio
// stack is not what this file is testing.
vi.mock('../../../audio/DevAudioPlayback', () => ({
  useDevAudioPlayback: () => ({
    currentSource: null, currentTrackId: null, isMuted: false, isPlaying: false, volume: 1,
    load: vi.fn(), pause: vi.fn(), play: vi.fn(), setVolume: vi.fn(), stop: vi.fn(),
    subscribe: vi.fn(() => () => undefined),
    subscribeToTrackChange: vi.fn(() => () => undefined),
    subscribeToQueueEnd: vi.fn(() => () => undefined),
    toggleMute: vi.fn(),
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

const currentPrefs: ReaderPreferences = {
  fontSize: 'base',
  fontFamily: 'serif',
  lineHeight: 'relaxed',
  paragraphSpacing: 'normal',
};

const canonicalBlocks = (): StoryBlock[] => [
  {
    id: 'block-1',
    type: 'narration',
    text: 'The courier drew the Ashen Sword on the mountain stair.',
    metadata: { speakerName: 'Narrator', music: { mood: 'solemn', trackId: 'track-77' } },
  },
  {
    id: 'block-2',
    type: 'dialogue',
    text: 'The gate is closed.',
  },
];

const chapter = (): ReaderChapter => ({
  number: 1,
  title: 'The Closed Gate',
  premise: '',
  status: 'read',
  blocks: canonicalBlocks(),
  // A World Cue anchored to an exact phrase in the source language.
  audioMoments: [{
    id: 'world-cue:block-1:0:weapon-unsheathe',
    blockId: 'block-1',
    triggerPhrase: 'drew the Ashen Sword',
    occurrenceIndex: 0,
    sourceCategory: 'weapons',
    variation: 'unsheathe',
    semanticTags: ['sword', 'metal'],
    relatedEntity: { name: 'Ashen Sword', type: 'artifact' },
    cue: {
      publicUrl: 'https://celestialaudio.seihouse.org/DEFAULT/Weapons/Unsheathe/Sword_Unsheathe_1.mp3',
    },
  }],
});

const activeStory: StoryWorld = {
  id: 'story-reader-translation',
  title: 'Mountain Stair',
  genre: 'Cultivation Fantasy',
  mcName: 'Ye Chen',
  customPremise: 'A courier climbs.',
  originalLanguage: 'ja',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  arcs: [],
  currentChapterNumber: 1,
};

/** The Korean overlay a faithful model would return for this chapter. */
const koreanOverlay = () => {
  const source = buildReaderFacingChapter(chapter());
  return validateReaderTranslationResponse(JSON.stringify({
    title: '닫힌 문',
    blocks: source.blocks.map(block => ({ id: block.id, text: `[ko] ${block.text}` })),
  }), source);
};

describe('rendering canonical and translated chapters through the same Reader', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    resetMockState();
    globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  const renderViewport = (options: {
    displayBlocks: StoryBlock[] | undefined;
    displayTitle: string;
    displayLanguage: SenLanguageCode;
    isShowingTranslation: boolean;
    translationNotice?: string | null;
    isTranslating?: boolean;
  }) => {
    const selectedChapter = chapter();
    act(() => {
      root.render(
        <LibraryPresentationProvider><ReaderViewport
          readerRef={createRef<HTMLDivElement>()}
          isReaderFullscreen={false}
          handleTouchStart={vi.fn()}
          handleTouchMove={vi.fn()}
          handleTouchEnd={vi.fn()}
          handleTextClick={vi.fn()}
          isTranslating={options.isTranslating ?? false}
          preferredLang={options.displayLanguage}
          selectedChapter={selectedChapter}
          activeStory={activeStory}
          currentPowerStage="Mortal"
          selectedChapterNum={1}
          maxChapterNum={1}
          codexTerms={[]}
          generatingRevealId={null}
          handleManifestReveal={vi.fn()}
          readerMode="sen"
          immersion={{ imagePopups: true }}
          isPlayingText={false}
          isPausedText={false}
          currentNarratedBlockIndex={null}
          currentPrefs={currentPrefs}
          handleUpdatePreference={vi.fn()}
          activeBookmarks={[]}
          editingBookmarkParagraphIndex={null}
          setEditingBookmarkParagraphIndex={vi.fn()}
          bookmarkNoteText=""
          setBookmarkNoteText={vi.fn()}
          handleRemoveBookmark={vi.fn()}
          handleSaveBookmark={vi.fn()}
          displayBlocks={options.displayBlocks}
          displayTitle={options.displayTitle}
          displayLanguage={options.displayLanguage}
          isShowingTranslation={options.isShowingTranslation}
          translationNotice={options.translationNotice ?? null}
          renderHighlightedText={(text) => text}
          getFocusClass={() => ''}
          navigatePrev={vi.fn()}
          navigateNext={vi.fn()}
          handleSealClick={vi.fn()}
          isCheckingConsistency={false}
          isGenerating={false}
          handleGenerate={vi.fn()}
          handleGenerateNextFive={vi.fn()}
          activeAgentId={null}
          showFateCodex={false}
          setShowFateCodex={vi.fn()}
          showLegend={false}
          setShowLegend={vi.fn()}
          hasSystemBlocks={false}
          chapters={[selectedChapter]}
        /></LibraryPresentationProvider>,
      );
    });
  };

  const renderOriginal = () => renderViewport({
    displayBlocks: canonicalBlocks(),
    displayTitle: 'The Closed Gate',
    displayLanguage: 'ja',
    isShowingTranslation: false,
  });

  const renderTranslated = () => renderViewport({
    displayBlocks: mergeReaderTranslation(canonicalBlocks(), koreanOverlay().blocks),
    displayTitle: koreanOverlay().title,
    displayLanguage: 'ko',
    isShowingTranslation: true,
  });

  /**
   * A language switch is an AnimatePresence `wait` swap, so the outgoing pane
   * stays mounted until its exit animation runs — which never happens in
   * jsdom. Remounting isolates a single rendered state.
   */
  const remount = () => {
    act(() => root.unmount());
    container.remove();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  };

  const prose = () => container.querySelector<HTMLElement>('.reader-prose');
  // World Cue marks insert word joiners into the prose; they are invisible.
  const visibleText = () => (container.textContent ?? '').replace(/⁠/g, '');
  const blockIds = () => Array.from(container.querySelectorAll('[data-block-id]'))
    .map(element => element.getAttribute('data-block-id'));

  it('takes lang and direction from the story’s own language, not from English', () => {
    renderOriginal();

    expect(prose()?.getAttribute('lang')).toBe('ja');
    expect(prose()?.getAttribute('dir')).toBe('ltr');
    expect(visibleText()).toContain('The courier drew the Ashen Sword on the mountain stair.');
  });

  it('takes lang and direction from the translated language when one is shown', () => {
    renderTranslated();

    expect(prose()?.getAttribute('lang')).toBe('ko');
    expect(container.querySelector('h1')?.getAttribute('lang')).toBe('ko');
    expect(visibleText()).toContain('[ko] The courier drew the Ashen Sword on the mountain stair.');
    expect(visibleText()).toContain('닫힌 문');
  });

  it('renders both through the same block components, keeping IDs and order', () => {
    renderOriginal();
    const canonicalOrder = blockIds();

    remount();
    renderTranslated();

    expect(canonicalOrder).toEqual(['block-1', 'block-2']);
    expect(blockIds()).toEqual(canonicalOrder);
  });

  const worldCueAnchors = () => Array.from(
    container.querySelectorAll('[data-cue-phrase], [data-cue-annotation]'),
  ).map(element => element.getAttribute('data-cue-phrase') ?? element.getAttribute('data-cue-annotation'));

  it('plays source-language phrase-anchored World Cues only on the original chapter', () => {
    renderOriginal();
    // The cue is anchored to "mountain stair" at an exact position in the
    // source prose; the original chapter keeps it.
    expect(worldCueAnchors()).toContain('drew the Ashen Sword');

    remount();
    renderTranslated();

    // Those positions no longer exist after translation, so nothing is anchored.
    expect(worldCueAnchors()).toEqual([]);
    expect(visibleText()).toContain('[ko] The courier drew the Ashen Sword on the mountain stair.');
  });

  it('keeps the original chapter fully readable when a translation fails', () => {
    renderViewport({
      displayBlocks: canonicalBlocks(),
      displayTitle: 'The Closed Gate',
      displayLanguage: 'ja',
      isShowingTranslation: false,
      translationNotice: 'No Korean reading package is installed, so this chapter is shown in its original language.',
    });

    expect(visibleText()).toContain('The courier drew the Ashen Sword on the mountain stair.');
    expect(visibleText()).toContain('The gate is closed.');
    expect(visibleText()).toContain('No Korean reading package is installed');
    expect(prose()?.getAttribute('lang')).toBe('ja');
  });

  it('keeps the chapter on screen while a translation is being prepared', () => {
    renderViewport({
      displayBlocks: canonicalBlocks(),
      displayTitle: 'The Closed Gate',
      displayLanguage: 'ja',
      isShowingTranslation: false,
      isTranslating: true,
    });

    expect(visibleText()).toContain('The courier drew the Ashen Sword on the mountain stair.');
    expect(visibleText()).toContain('Preparing this chapter in your reading language');
  });
});
