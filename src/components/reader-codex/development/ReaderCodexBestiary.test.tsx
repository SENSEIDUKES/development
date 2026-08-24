// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Character, CreatureSpecies } from '../shared/types';
import { ReaderCodexBestiary } from './ReaderCodexBestiary';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const species: CreatureSpecies = {
  id: 'species-sable-wolf',
  name: 'Sable Wolf',
  description: 'A patient predator.',
  classification: 'Spirit Beast',
  traits: [],
  threatLevel: 'High',
  firstEncounteredChapter: 1,
  appearanceChapters: [1],
  notableIndividualIds: ['character-aster'],
};

const character = (relationshipToMC: string): Character => ({
  id: 'character-aster',
  name: 'Aster',
  role: 'Sable Wolf envoy',
  status: 'alive',
  relationshipToMC,
  description: 'A notable individual whose relationship can change.',
  portraitKind: 'non-human',
});

describe('ReaderCodexBestiary Color Codes', () => {
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

  const renderBestiary = (individual: Character, mcName = 'Rin') => {
    act(() => {
      root.render(
        <ReaderCodexBestiary
          bestiary={[species]}
          characters={[individual]}
          mcName={mcName}
        />,
      );
    });
  };

  it('keeps threat labels on the shared warning-orange code and repaints named individuals from live relationship data', () => {
    renderBestiary(character('Ally'));

    const threat = [...container.querySelectorAll<HTMLElement>('span[data-color-code]')]
      .find(element => element.textContent === 'High');
    const ally = [...container.querySelectorAll<HTMLElement>('span[data-color-code]')]
      .find(element => element.textContent === 'Aster');
    expect(threat?.dataset.colorCode).toBe('itemGreat');
    expect(threat?.style.color).toBe('var(--color-item-great)');
    expect(ally?.dataset.colorCode).toBe('ally');
    expect(ally?.style.color).toBe('var(--color-entity-friend)');

    renderBestiary(character('Enemy'));
    const enemy = [...container.querySelectorAll<HTMLElement>('span[data-color-code]')]
      .find(element => element.textContent === 'Aster');
    expect(enemy?.dataset.colorCode).toBe('enemy');
    expect(enemy?.style.color).toBe('var(--color-entity-enemy)');
  });

  it('uses the current main-character name when that identity is available', () => {
    renderBestiary({ ...character('Enemy'), name: 'Rin' });

    const individual = [...container.querySelectorAll<HTMLElement>('span[data-color-code]')]
      .find(element => element.textContent === 'Rin');
    expect(individual?.dataset.colorCode).toBe('mainCharacter');
    expect(individual?.style.color).toBe('var(--color-entity-mc)');
  });
});
