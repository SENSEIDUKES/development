// @vitest-environment jsdom
import React, { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReaderChapter, ReaderPreferences, StoryWorld } from '../shared/types';
import { resetMockState } from '../shared/stubs';
import { ReaderViewport } from './ReaderViewport';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

const chapter: ReaderChapter = {
  number: 1,
  title: 'The First Witness',
  premise: 'Lei enters the rain court.',
  status: 'read',
  blocks: [
    {
      id: 'block-reveal-lei',
      type: 'narrative',
      text: 'Lei descended through the storm.',
      metadata: {
        entities: [{ name: 'Lei', type: 'character', mention: 'reveal' }],
      },
    },
  ],
};

const activeStory: StoryWorld = {
  id: 'story-card-workshop-reader-path',
  title: 'Rain Court',
  genre: 'Cultivation Fantasy',
  mcName: 'Rin',
  customPremise: 'A witness follows a storm dragon.',
  createdAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z',
  arcs: [{ title: 'The Broken Oath', chapters: [chapter], isCompleted: false }],
  currentChapterNumber: 1,
  assignedRevealBackdrops: {
    'codex-char-lei': '/card-workshop/reveal-backdrop.svg',
  },
};

const currentPrefs: ReaderPreferences = {
  fontSize: 'base',
  fontFamily: 'serif',
  lineHeight: 'relaxed',
  paragraphSpacing: 'normal',
};

describe('CodexRevealCard Reader extraction', () => {
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

  it('keeps first-reveal rendering wired through the real ReaderViewport path', () => {
    act(() => {
      root.render(
        <ReaderViewport
          readerRef={createRef<HTMLDivElement>()}
          isReaderFullscreen={false}
          handleTouchStart={vi.fn()}
          handleTouchMove={vi.fn()}
          handleTouchEnd={vi.fn()}
          handleTextClick={vi.fn()}
          isTranslating={false}
          preferredLang="en"
          selectedChapter={chapter}
          activeStory={activeStory}
          currentPowerStage="Mortal"
          selectedChapterNum={1}
          maxChapterNum={1}
          codexTerms={[
            {
              term: 'Lei',
              type: 'character',
              isCanonicalName: true,
              entry: {
                id: 'codex-char-lei',
                name: 'Lei',
                description: 'A young thunder dragon carrying a living storm.',
                imageUrl: '/card-workshop/creature-portrait.svg',
                portraitKind: 'non-human',
              },
            },
          ]}
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
          activeTranslationContent={null}
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
          chapters={[chapter]}
        />,
      );
    });

    expect(container.textContent).toContain('Reveal · character');
    expect(container.textContent).toContain('Lei');
    expect(container.querySelector('img[alt="Lei"]')?.getAttribute('src')).toBe(
      '/card-workshop/creature-portrait.svg',
    );
  });
});
