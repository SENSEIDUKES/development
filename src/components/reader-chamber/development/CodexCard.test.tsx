// @vitest-environment jsdom
import React, { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ReaderChapter,
  ReaderPreferences,
  StoryBlock,
  StoryWorld,
} from '../shared/types';
import { resetMockState } from '../shared/stubs';
import { CodexCard } from './CodexCard';
import { ReaderViewport } from './ReaderViewport';

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

const visualImportance = {
  namedStatus: true,
  narrativeWeight: 'major',
  recurrence: true,
  plotRelevance: true,
};

const baseChapter: ReaderChapter = {
  number: 1,
  title: 'The First Witness',
  premise: 'Rin enters the rain court.',
  status: 'read',
  blocks: [],
};

const activeStory: StoryWorld = {
  id: 'story-part-three-card-routing',
  title: 'Rain Court',
  genre: 'Cultivation Fantasy',
  mcName: 'Rin',
  customPremise: 'A witness follows a storm dragon.',
  createdAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z',
  arcs: [{ title: 'The Broken Oath', chapters: [baseChapter], isCompleted: false }],
  currentChapterNumber: 1,
  assignedRevealBackdrops: {},
};

describe('Reader card routing', () => {
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

  const renderReader = (
    block: StoryBlock,
    codexTerms: any[] = [],
    chapterPatch: Partial<ReaderChapter> = {},
    immersion: { imagePopups: boolean } = { imagePopups: true },
  ) => {
    const chapter: ReaderChapter = {
      ...baseChapter,
      ...chapterPatch,
      blocks: chapterPatch.blocks ?? [block],
    };
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
          codexTerms={codexTerms}
          generatingRevealId={null}
          handleManifestReveal={vi.fn()}
          readerMode="sen"
          immersion={immersion}
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
          hasSystemBlocks={Boolean(block.system)}
          chapters={[chapter]}
        />,
      );
    });
  };

  const revealBlock = (name: string, type: 'character' | 'artifact' | 'location' | 'creature' | 'faction'): StoryBlock => ({
    id: `block-${type}-${name}`,
    type: 'paragraph',
    text: `${name} entered the scene.`,
    metadata: { entities: [{ name, type, mention: 'reveal' }] },
  });

  const codexTerm = (name: string, type: 'character' | 'artifact' | 'location' | 'faction', extra: Record<string, unknown> = {}) => ({
    term: name,
    type,
    isCanonicalName: true,
    entry: {
      id: `codex-${type}-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      description: `${name} is a durable Codex entry.`,
      manifestationImportance: visualImportance,
      ...extra,
    },
  });

  it.each([
    ['Human Portrait', 'Rin', 'character', { portraitKind: 'human', imageUrl: '/human.png' }],
    ['Non-Human Portrait', 'Lei', 'character', { portraitKind: 'non-human', imageUrl: '/lei.png' }],
    ['Artifact', 'Oath Seal', 'artifact', { imageUrl: '/artifact.png' }],
    ['Location', 'Rain Court', 'location', { imageUrl: '/location.png' }],
  ] as const)('routes %s reveal metadata to CodexCard', (_label, name, type, extra) => {
    renderReader(revealBlock(name, type), [codexTerm(name, type, extra)]);

    expect(container.textContent).toContain(`Reveal · ${type}`);
    expect(container.textContent).toContain(name);
    expect(container.querySelector(`img[alt="${name}"]`)).toBeTruthy();
  });

  it('keeps a valid visual entry without artwork on CodexCard with Manifest available', () => {
    renderReader(revealBlock('Oath Seal', 'artifact'), [codexTerm('Oath Seal', 'artifact')]);

    expect(container.textContent).toContain('Reveal · artifact');
    expect(container.querySelector('button[aria-label="Manifest portrait for Oath Seal"]')).toBeTruthy();
  });

  it('does not render an informational Bestiary species as a CodexCard', () => {
    renderReader(revealBlock('Shadow Void Stalker', 'creature'));

    expect(container.textContent).not.toContain('Reveal · creature');
    expect(container.textContent).not.toContain('Manifest portrait');
  });

  it('renders highlighted Bestiary species and random encounter beasts as WorldCards', () => {
    const species = revealBlock('Shadow Void Stalker', 'creature');
    species.worldCard = {
      entityType: 'creature',
      entityName: 'Shadow Void Stalker',
      displayTitle: 'Apex Abyss Beast',
      quote: 'It walks between breaths.',
    };
    renderReader(species);
    expect(container.textContent).toContain('Apex Abyss Beast');
    expect(container.textContent).not.toContain('Reveal · creature');

    const random = revealBlock('Ash-Maw Prowler', 'creature');
    random.worldCard = {
      entityType: 'creature',
      entityName: 'Ash-Maw Prowler',
      displayTitle: 'The Beast Beneath the Cinders',
    };
    renderReader(random);
    expect(container.textContent).toContain('The Beast Beneath the Cinders');
  });

  it('does not mount a WorldCard when SEN image popups are disabled', () => {
    const block = revealBlock('Ash-Maw Prowler', 'creature');
    block.worldCard = {
      entityType: 'creature',
      entityName: 'Ash-Maw Prowler',
      displayTitle: 'The Beast Beneath the Cinders',
    };

    renderReader(block, [], {}, { imagePopups: false });

    expect(container.textContent).not.toContain('The Beast Beneath the Cinders');
  });

  it('keeps Factions informational unless a highlight explicitly uses a WorldCard', () => {
    const factionTerm = codexTerm('Ninth House', 'faction', { imageUrl: '/legacy-faction.png' });
    renderReader(revealBlock('Ninth House', 'faction'), [factionTerm]);
    expect(container.textContent).not.toContain('Reveal · faction');
    expect(container.textContent).not.toContain('Manifest portrait');

    const highlighted = revealBlock('Ninth House', 'faction');
    highlighted.worldCard = {
      entityType: 'faction',
      entityName: 'Ninth House',
      displayTitle: 'Judicial Enforcement Syndicate',
    };
    renderReader(highlighted, [factionTerm]);
    expect(container.textContent).toContain('Judicial Enforcement Syndicate');
    expect(container.querySelector('img[src="/legacy-faction.png"]')).toBeFalsy();
  });

  it('continues past informational reveals to the first resolved visual Codex entry', () => {
    const block = revealBlock('Ninth House', 'faction');
    block.metadata!.entities!.push({ name: 'Lei', type: 'character', mention: 'reveal' });

    renderReader(block, [
      codexTerm('Ninth House', 'faction'),
      codexTerm('Lei', 'character', { portraitKind: 'non-human', imageUrl: '/lei.png' }),
    ]);

    expect(container.textContent).toContain('Reveal · character');
    expect(container.querySelector('img[alt="Lei"]')).toBeTruthy();
    expect(container.textContent).not.toContain('Reveal · faction');
  });

  it('renders System and Fate content only through System Panels', () => {
    const systemBlock: StoryBlock = {
      id: 'system-only',
      type: 'paragraph',
      text: 'A ledger opened.',
      system: { kind: 'status', title: 'Meridian Status', rows: [{ label: 'Qi', value: '84%' }] },
      worldCard: { entityType: 'system', entityName: 'System', displayTitle: 'Forbidden World Card' },
    };
    renderReader(systemBlock);
    expect(container.textContent).toContain('Meridian Status');
    expect(container.textContent).not.toContain('Forbidden World Card');

    const fateBlock: StoryBlock = {
      id: 'fate-only',
      type: 'paragraph',
      text: 'The timeline scarred.',
      system: {
        kind: 'fate_result',
        title: 'Destiny Divergence',
        fateResult: {
          outcome: 'FATE SCARRED',
          timelineScar: 'The court remembers.',
          permanentCosts: ['The magistrate marks Rin.'],
        },
      },
      worldCard: { entityType: 'fate_event', entityName: 'Fate', displayTitle: 'Forbidden Fate World Card' },
    };
    renderReader(fateBlock);
    expect(container.textContent).toContain('FATE RESULT: FATE SCARRED');
    expect(container.textContent).not.toContain('Forbidden Fate World Card');
  });

  it('suppresses a duplicate World signal when the same visual entity resolves to CodexCard', () => {
    const block = revealBlock('Lei', 'character');
    block.worldCard = {
      entityType: 'character',
      entityName: 'Lei',
      displayTitle: 'Duplicate Storm Sovereign',
    };
    renderReader(block, [codexTerm('Lei', 'character', { portraitKind: 'non-human', imageUrl: '/lei.png' })]);

    expect(container.textContent).toContain('Reveal · character');
    expect(container.textContent).not.toContain('Duplicate Storm Sovereign');
  });

  it('does not render or trigger an automatic Chapter Visual Memory', () => {
    renderReader(
      { id: 'plain', type: 'paragraph', text: 'The chapter ended in rain.' },
      [],
      {
        assetManifest: { heroImage: '/chapter-memory.png' },
        summary: 'A costly ending.',
      },
    );

    expect(container.querySelector('img[src="/chapter-memory.png"]')).toBeFalsy();
    expect(container.textContent).not.toContain('Memory of this event');
    expect(container.textContent).not.toContain('Distilling Visual Memory');
  });

  it('keeps long existing Codex reveals in the LibraryCard regions without adding a footer', () => {
    const name = 'The Most Revered and Unbroken Oathkeeper of the Rain Court';
    const description = 'A deliberately long Codex description that continues beyond the normal reveal length so the existing two-line Reader treatment remains the element that constrains it.';

    act(() => {
      root.render(
        <CodexCard
          revealTerm={{
            type: 'Artifact',
            entry: {
              id: 'codex-long-artifact',
              name,
              description,
              imageUrl: '/long-artifact.png',
              manifestationImportance: visualImportance,
            },
          }}
        />,
      );
    });

    const content = container.querySelector('[data-slot="card-content"]');
    const title = container.querySelector('[data-slot="card-title"]');
    const descriptionRegion = container.querySelector('[data-slot="card-description"]');

    expect(content?.parentElement?.className).toContain('group/reveal');
    expect(container.querySelector('[data-slot="card-media"] img[alt="The Most Revered and Unbroken Oathkeeper of the Rain Court"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="card-body"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="card-header"]')).toBeTruthy();
    expect(title?.textContent).toBe(name);
    expect(title?.className).toContain('font-display');
    expect(descriptionRegion?.textContent).toBe(description);
    expect(descriptionRegion?.className).toContain('!line-clamp-2');
    expect(container.querySelector('[data-slot="card-footer"]')).toBeFalsy();
  });

  it('keeps Manifest callbacks and the Summoning state through LibraryCard actions', () => {
    const entry = {
      id: 'codex-manifest-artifact',
      name: 'Oath Seal',
      description: 'An eligible Artifact without artwork.',
      manifestationImportance: visualImportance,
    };
    const onManifestReveal = vi.fn();

    act(() => {
      root.render(
        <CodexCard
          revealTerm={{ type: 'Artifact', entry }}
          onManifestReveal={onManifestReveal}
        />,
      );
    });

    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Manifest portrait for Oath Seal"]',
    );

    expect(container.querySelector('[data-slot="card-actions"]')?.className).toContain('!contents');
    expect(button).toBeTruthy();
    act(() => {
      button?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(onManifestReveal).toHaveBeenCalledWith(entry, 'Artifact');

    act(() => {
      root.render(
        <CodexCard
          revealTerm={{ type: 'Artifact', entry }}
          generatingRevealId={entry.id}
          onManifestReveal={onManifestReveal}
        />,
      );
    });

    expect(container.textContent).toContain('Summoning...');
    expect(container.querySelector<HTMLButtonElement>(
      'button[aria-label="Manifest portrait for Oath Seal"]',
    )?.disabled).toBe(true);
  });

  it('wears the spectral glass with the entity ambient accent, mote field, and circular seal', () => {
    act(() => {
      root.render(
        <CodexCard
          revealTerm={{
            type: 'Artifact',
            entry: {
              id: 'codex-glass-artifact',
              name: 'Oath Seal',
              description: 'An eligible Artifact without artwork.',
              manifestationImportance: visualImportance,
            },
          }}
        />,
      );
    });

    const surface = container.querySelector<HTMLElement>('[data-accent="true"]');
    expect(surface?.style.getPropertyValue('--library-card-accent')).toBe('#E5E7EB');
    expect(surface?.className).toContain('group/reveal');
    expect(surface?.querySelector('[data-slot="codex-card-ambience"]')).toBeTruthy();

    const seal = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Manifest portrait for Oath Seal"]',
    );
    expect(seal?.className).toContain('rounded-full');
    expect(container.textContent).toContain('Awaken Portrait');
  });

  it('tints the glass with the character relationship accent', () => {
    act(() => {
      root.render(
        <CodexCard
          revealTerm={{
            type: 'character',
            entry: {
              id: 'codex-glass-ally',
              name: 'Aster',
              description: 'A quiet courier.',
              relationshipToMC: 'ally',
              manifestationImportance: visualImportance,
            },
          }}
          activeStory={{ mcName: 'Rin', assignedRevealBackdrops: {} }}
        />,
      );
    });

    const surface = container.querySelector<HTMLElement>('[data-accent="true"]');
    expect(surface?.style.getPropertyValue('--library-card-accent')).toBe('#4ADE80');
  });
});
