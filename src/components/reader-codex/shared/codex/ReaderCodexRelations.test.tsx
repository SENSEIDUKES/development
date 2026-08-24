// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CodexProvider } from './CodexContext';
import { ReaderCodexRelations } from './ReaderCodexRelations';
import type { Character } from '../types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const relationshipCharacter = (relationshipToMC: string, status: Character['status'] = 'alive'): Character => ({
  id: 'character-aster',
  name: 'Aster',
  role: 'Rain Court Witness',
  status,
  relationshipToMC,
  description: 'A witness whose loyalty follows the current story state.',
});

describe('ReaderCodexRelations Color Codes', () => {
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
  });

  const renderRelations = (currentCharacter: Character, selectedSnapshot: Character) => {
    const value = {
      memory: { characters: [currentCharacter] },
      arcs: [],
      activeStory: { id: 'story-relationship-codes', currentChapterNumber: 1, relationships: [] },
      mcName: 'Rin',
      onUpdateMemory: vi.fn(),
      updateStoryFields: vi.fn(),
      pushNotification: vi.fn(),
      getPowerRankScore: () => ({ score: 0, title: 'Ordinary' }),
      handleAwakenCardImage: vi.fn(),
      handleRevertImage: vi.fn(),
      previews: {},
      setPreviews: vi.fn(),
      generatingId: null,
      openEntryContextEditor: vi.fn(),
    } as unknown as Parameters<typeof CodexProvider>[0]['value'];

    act(() => {
      root.render(
        <CodexProvider value={value}>
          <ReaderCodexRelations
            charsToRender={[currentCharacter]}
            selectedNodeChar={selectedSnapshot}
            setSelectedNodeChar={vi.fn()}
            setDeletePrompt={vi.fn()}
          />
        </CodexProvider>,
      );
    });
  };

  it('repaints graph edges, nodes, and the selected relationship from fresh character memory', () => {
    const selectedSnapshot = relationshipCharacter('Ally');
    renderRelations(relationshipCharacter('Ally'), selectedSnapshot);

    expect(container.querySelectorAll('g[data-color-code="ally"]').length).toBeGreaterThanOrEqual(2);
    const allyLabel = [...container.querySelectorAll<HTMLElement>('span[data-color-code]')]
      .find(element => element.textContent === 'Ally');
    expect(allyLabel?.dataset.colorCode).toBe('ally');
    expect(allyLabel?.style.color).toBe('var(--color-entity-friend)');

    // The parent intentionally keeps the old object snapshot selected. The
    // relation view must instead resolve it by id against updated story memory.
    renderRelations(relationshipCharacter('Enemy'), selectedSnapshot);

    expect(container.querySelectorAll('g[data-color-code="enemy"]').length).toBeGreaterThanOrEqual(2);
    const enemyLabel = [...container.querySelectorAll<HTMLElement>('span[data-color-code]')]
      .find(element => element.textContent === 'Enemy');
    expect(enemyLabel?.dataset.colorCode).toBe('enemy');
    expect(enemyLabel?.style.color).toBe('var(--color-entity-enemy)');

    renderRelations(relationshipCharacter('Ally'), selectedSnapshot);
    expect(container.querySelectorAll('g[data-color-code="ally"]').length).toBeGreaterThanOrEqual(2);
  });

  it('routes deceased graph markers and the selected status through the shared status resolver', () => {
    const selectedSnapshot = relationshipCharacter('Neutral', 'deceased');
    renderRelations(relationshipCharacter('Neutral', 'deceased'), selectedSnapshot);

    expect(container.querySelector('line[data-color-code="enemy"]')).toBeTruthy();
    const status = [...container.querySelectorAll<HTMLElement>('span[data-color-code]')]
      .find(element => element.textContent === 'deceased');
    expect(status?.dataset.colorCode).toBe('enemy');
  });
});
