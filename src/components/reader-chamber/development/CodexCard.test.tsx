// @vitest-environment jsdom
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import React, { act, createRef } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from '../../../test-utils/createReaderRoot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ReaderChapter, type ReaderPreferences, type StoryBlock, type StoryWorld } from '@seihouse/sen/contracts';
import { resetMockState } from '../shared/stubs';
import { getColorCodeValue } from '@seihouse/sen/color-codes';
import { CodexCard } from '@seihouse/sen/cards';
import { ReaderViewport } from '@seihouse/sen/reader-chamber';

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

describe('Reader Codex and System routing', () => {
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

  /**
   * Mounts the Development ReaderViewport around one story block with inert
   * handlers, so a Codex reveal card can be inspected in its real host.
   */
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
        <LibraryPresentationProvider>{<ReaderViewport
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
          displayBlocks={chapter.blocks}
          displayTitle={chapter.title}
          displayLanguage="en"
          isShowingTranslation={false}
          translationNotice={null}
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
          showLegend={false}
          setShowLegend={vi.fn()}
          hasSystemBlocks={Boolean(block.system)}
          chapters={[chapter]}
        />}</LibraryPresentationProvider>,
      );
    });
  };

  /** Builds a paragraph block that reveals the named entity in the Reader. */
  const revealBlock = (name: string, type: 'character' | 'artifact' | 'location' | 'creature' | 'faction'): StoryBlock => ({
    id: `block-${type}-${name}`,
    type: 'paragraph',
    text: `${name} entered the scene.`,
    metadata: { entities: [{ name, type, mention: 'reveal' }] },
  });

  /** Builds a canonical Codex term fixture with a deterministic entry ID. */
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

    expect(container.textContent).toContain(`Category: ${type.charAt(0).toUpperCase() + type.slice(1)}`);
    expect(container.textContent).toContain(name);
    expect(container.querySelector(`img[alt="${name}"]`)).toBeTruthy();
  });

  it('keeps a valid visual entry without artwork on CodexCard with Manifest available', () => {
    renderReader(revealBlock('Oath Seal', 'artifact'), [codexTerm('Oath Seal', 'artifact')]);

    expect(container.textContent).toContain('Category: Artifact');
    expect(container.querySelector('button[aria-label="Manifest portrait for Oath Seal"]')).toBeTruthy();
  });

  it('places sibling entity reveals directly below the chapter heading without skipped levels', () => {
    const blocks = [revealBlock('Rin', 'character'), revealBlock('Oath Seal', 'artifact')];
    renderReader(blocks[0], [
      codexTerm('Rin', 'character', { imageUrl: '/human.png' }),
      codexTerm('Oath Seal', 'artifact'),
    ], { blocks });

    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    expect(headings.map(heading => [heading.tagName, heading.textContent])).toEqual([
      ['H1', baseChapter.title],
      ['H2', 'Rin'],
      ['H2', 'Oath Seal'],
    ]);
  });

  it.each(['character', 'Character', ' CHARACTER '])('announces a normalized category for %s', (type) => {
    act(() => root.render(<CodexCard revealTerm={{
      ...codexTerm('Rin', 'character', { imageUrl: '/rin.png' }), type,
    }} />));

    expect(container.querySelector('[data-slot="card-header"]')?.textContent).toBe('Category: Character');
  });

  it('opens the complete description from the card with keyboard focus and Escape return', () => {
    const description = `${'A long history of the Rain Court. '.repeat(25)}\n\nThe final oath remains unbroken.`;
    act(() => root.render(<CodexCard revealTerm={codexTerm('Oath Seal', 'artifact', { description })} />));
    const trigger = container.querySelector<HTMLElement>('[role="button"][aria-haspopup="dialog"]');
    expect(trigger?.textContent).toBe('Read more in Codex about Oath Seal');
    act(() => trigger!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.getAttribute('aria-label')).toBe('Oath Seal Codex details');
    expect(document.activeElement).toBe(dialog);
    const fullDescription = Array.from(dialog?.querySelectorAll('p') ?? []).find(p => p.textContent === description);
    expect(fullDescription).toBeTruthy();
    expect(fullDescription?.className).not.toContain('line-clamp');
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.activeElement).toBe(trigger);
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
  });

  it('recovers a failed stored portrait through Manifest, reports its identity and accepts replacement media', () => {
    const onManifestReveal = vi.fn();
    const report = vi.fn();
    container.addEventListener('sen:codex-portrait-error', report);
    const term = codexTerm('Rin', 'character', { imageUrl: '/revoked.png?private=secret', imageAssetId: 'asset-rin' });
    const render = () => act(() => root.render(<CodexCard revealTerm={term} onManifestReveal={onManifestReveal} />));
    render();
    act(() => container.querySelector('img[alt="Rin"]')!.dispatchEvent(new Event('error')));
    expect(container.querySelector('img[alt="Rin"]')).toBeNull();
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Portrait unavailable.');
    const seal = container.querySelector<HTMLButtonElement>('button[aria-label="Manifest portrait for Rin"]');
    act(() => seal!.click());
    expect(onManifestReveal).toHaveBeenCalledWith(term.entry, 'character');
    expect(report).toHaveBeenCalledTimes(1);
    expect((report.mock.calls[0][0] as CustomEvent).detail).toEqual({ entryId: term.entry.id, type: 'character', imageAssetId: 'asset-rin' });
    expect(JSON.stringify((report.mock.calls[0][0] as CustomEvent).detail)).not.toContain('secret');

    Object.assign(term.entry, { imageUrl: '/replacement.png' });
    render();
    expect(container.querySelector('img[alt="Rin"]')?.getAttribute('src')).toBe('/replacement.png');
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('button[aria-label="Manifest portrait for Rin"]')).toBeNull();
  });

  it('offers an image retry without a manifestation host and keeps broken media out of details', () => {
    const term = codexTerm('Rin', 'character', { imageUrl: '/unavailable.png', imageAssetId: 'asset-rin' });
    act(() => root.render(<CodexCard revealTerm={term} />));
    act(() => container.querySelector('img[alt="Rin"]')!.dispatchEvent(new Event('error')));
    expect(container.querySelector('button[aria-label="Manifest portrait for Rin"]')).toBeNull();
    const detailsTrigger = container.querySelector<HTMLElement>('[aria-haspopup="dialog"]');
    act(() => detailsTrigger!.click());
    expect(document.body.querySelector('[role="dialog"] img[src="/unavailable.png"]')).toBeNull();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    const retry = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Retry portrait');
    expect(retry).toBeTruthy();
    act(() => retry!.click());
    expect(container.querySelector('img[alt="Rin"]')?.getAttribute('src')).toBe('/unavailable.png');
    act(() => container.querySelector('img[alt="Rin"]')!.dispatchEvent(new Event('load')));
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('does not render an informational Bestiary species as a CodexCard', () => {
    renderReader(revealBlock('Shadow Void Stalker', 'creature'));

    expect(container.querySelector('[data-slot="card-content"]')).toBeFalsy();
    expect(container.textContent).not.toContain('Manifest portrait');
  });

  it('keeps Factions informational rather than creating a visual Codex Card', () => {
    const factionTerm = codexTerm('Ninth House', 'faction', { imageUrl: '/legacy-faction.png' });
    renderReader(revealBlock('Ninth House', 'faction'), [factionTerm]);
    expect(container.textContent).not.toContain('faction');
    expect(container.textContent).not.toContain('Manifest portrait');
    expect(container.querySelector('img[src="/legacy-faction.png"]')).toBeFalsy();
  });

  it('continues past informational reveals to the first resolved visual Codex entry', () => {
    const block = revealBlock('Ninth House', 'faction');
    block.metadata!.entities!.push({ name: 'Lei', type: 'character', mention: 'reveal' });

    renderReader(block, [
      codexTerm('Ninth House', 'faction'),
      codexTerm('Lei', 'character', { portraitKind: 'non-human', imageUrl: '/lei.png' }),
    ]);

    expect(container.textContent).toContain('Category: Character');
    expect(container.querySelector('img[alt="Lei"]')).toBeTruthy();
    expect(container.textContent).not.toContain('faction');
  });

  it('renders System and Fate content only through System Panels', () => {
    const systemBlock: StoryBlock = {
      id: 'system-only',
      type: 'paragraph',
      text: 'A ledger opened.',
      system: { kind: 'system_prompt', title: 'Meridian Status', rows: [{ label: 'Qi', value: '84%' }] },
    };
    renderReader(systemBlock);
    expect(container.textContent).toContain('Meridian Status');

    const fateBlock: StoryBlock = {
      id: 'fate-only',
      type: 'paragraph',
      text: 'The timeline scarred.',
      system: {
        kind: 'fate_system_prompt',
        title: 'Destiny Divergence',
        fateResult: {
          outcome: 'FATE SCARRED',
          timelineScar: 'The court remembers.',
          permanentCosts: ['The magistrate marks Rin.'],
        },
      },
    };
    renderReader(fateBlock);
    expect(container.textContent).toContain('FATE RESULT: FATE SCARRED');
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
        <LibraryPresentationProvider>{<CodexCard
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
        />}</LibraryPresentationProvider>,
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

  it('keeps Manifest callbacks and the Manifesting state through LibraryCard actions', () => {
    const entry = {
      id: 'codex-manifest-artifact',
      name: 'Oath Seal',
      description: 'An eligible Artifact without artwork.',
      manifestationImportance: visualImportance,
    };
    const onManifestReveal = vi.fn();

    act(() => {
      root.render(
        <LibraryPresentationProvider>{<CodexCard
          revealTerm={{ type: 'Artifact', entry }}
          onManifestReveal={onManifestReveal}
        />}</LibraryPresentationProvider>,
      );
    });

    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Manifest portrait for Oath Seal"]',
    );

    expect(container.querySelector('[data-slot="card-actions"]')?.className).toContain('!contents');
    expect(button).toBeTruthy();
    expect(Array.from(button!.children).every(child => child.getAttribute('aria-hidden') === 'true')).toBe(true);
    // Native button activation: a real click (what Enter/Space produce).
    act(() => {
      button?.click();
    });
    expect(onManifestReveal).toHaveBeenCalledWith(entry, 'Artifact');

    act(() => {
      root.render(
        <LibraryPresentationProvider>{<CodexCard
          revealTerm={{ type: 'Artifact', entry }}
          generatingRevealId={entry.id}
          onManifestReveal={onManifestReveal}
        />}</LibraryPresentationProvider>,
      );
    });

    expect(container.textContent).toContain('Manifesting...');
    // The pending state is announced through the swapped aria-label.
    expect(container.querySelector('button[aria-label="Manifest portrait for Oath Seal"]')).toBeFalsy();
    const manifestingButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Manifesting portrait for Oath Seal"]',
    );
    expect(manifestingButton?.disabled).toBe(true);
    expect(manifestingButton?.getAttribute('aria-busy')).toBe('true');
    expect(Array.from(manifestingButton!.children).every(child => child.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('wears the spectral glass with the entity ambient accent, mote field, and circular seal', () => {
    act(() => {
      root.render(
        <LibraryPresentationProvider>{<CodexCard
          revealTerm={{
            type: 'Artifact',
            entry: {
              id: 'codex-glass-artifact',
              name: 'Oath Seal',
              description: 'An eligible Artifact without artwork.',
              manifestationImportance: visualImportance,
            },
          }}
        />}</LibraryPresentationProvider>,
      );
    });

    const surface = container.querySelector<HTMLElement>('[data-accent="true"]');
    expect(surface?.getAttribute('data-color-code')).toBe('itemBasic');
    expect(surface?.style.getPropertyValue('--library-card-accent')).toBe(getColorCodeValue('itemBasic'));
    expect(surface?.className).toContain('group/reveal');
    expect(surface?.querySelector('[data-slot="codex-card-ambience"]')).toBeTruthy();

    const seal = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Manifest portrait for Oath Seal"]',
    );
    expect(seal?.className).toContain('rounded-full');
    const dragonClass = Array.from(
      seal?.querySelectorAll<HTMLSpanElement>('span[aria-hidden="true"]') ?? [],
    ).find(element => element.className.includes('[filter:drop-shadow('))?.className;
    expect(dragonClass).toContain('[filter:drop-shadow(');
    expect(dragonClass).toContain('group-hover/seal:[filter:drop-shadow(');
    expect(dragonClass).toContain('group-active/seal:[filter:drop-shadow(');
    // The portal boundary is the shared Library cycle glyph, kept decorative.
    expect(seal?.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
    expect(container.textContent).toContain('Portrait');
  });

  it('tints the glass with the character relationship accent', () => {
    act(() => {
      root.render(
        <LibraryPresentationProvider>{<CodexCard
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
        />}</LibraryPresentationProvider>,
      );
    });

    const surface = container.querySelector<HTMLElement>('[data-accent="true"]');
    expect(surface?.getAttribute('data-color-code')).toBe('ally');
    expect(surface?.style.getPropertyValue('--library-card-accent')).toBe(getColorCodeValue('ally'));
  });

  it('updates the reveal card Color Code when the current relationship changes', () => {
    const entry = {
      id: 'codex-dynamic-relationship',
      name: 'Aster',
      description: 'A watcher whose allegiance changes with the story.',
      relationshipToMC: 'ally',
      manifestationImportance: visualImportance,
    };
    const renderCard = () => {
      act(() => {
        root.render(
          <LibraryPresentationProvider>{<CodexCard
            revealTerm={{ type: 'character', entry }}
            activeStory={{ mcName: 'Rin', assignedRevealBackdrops: {} }}
          />}</LibraryPresentationProvider>,
        );
      });
    };

    renderCard();
    let surface = container.querySelector<HTMLElement>('[data-accent="true"]');
    expect(surface?.getAttribute('data-color-code')).toBe('ally');
    expect(surface?.style.getPropertyValue('--library-card-accent')).toBe(getColorCodeValue('ally'));

    entry.relationshipToMC = 'enemy';
    renderCard();
    surface = container.querySelector<HTMLElement>('[data-accent="true"]');
    expect(surface?.getAttribute('data-color-code')).toBe('enemy');
    expect(surface?.style.getPropertyValue('--library-card-accent')).toBe(getColorCodeValue('enemy'));

    entry.relationshipToMC = 'ally';
    renderCard();
    expect(container.querySelector<HTMLElement>('[data-accent="true"]')?.getAttribute('data-color-code')).toBe('ally');
  });
});
