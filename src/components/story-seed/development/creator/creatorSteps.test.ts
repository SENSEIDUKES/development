import { describe, expect, it } from 'vitest';
import { createEmptyStorySeedInput } from '@seihouse/sen/story-seed';
import { SEED_SECTIONS } from '../seedSections';
import { patchStoryRequired } from '../seedState';
import { CREATOR_PAGE_ORDER, nextPage, previousPage, stepOfPage, stepStatus } from './creatorSteps';

describe('Story Seed creator steps', () => {
  it('walks every section in the section list, then Manifest', () => {
    expect(CREATOR_PAGE_ORDER).toEqual([...SEED_SECTIONS.map(section => section.id), 'manifest']);
    expect(nextPage('origin')).toBe('arc');
    expect(nextPage('arc')).toBe('world-identity');
    expect(nextPage('power-system')).toBe('manifest');
    expect(nextPage('manifest')).toBeNull();
    expect(previousPage('origin')).toBeNull();
    expect(previousPage('manifest')).toBe('power-system');
  });

  it('groups the eight World kinds under the World step', () => {
    const worldPages = CREATOR_PAGE_ORDER.filter(page => stepOfPage(page) === 'world');
    expect(worldPages).toEqual(SEED_SECTIONS.filter(section => section.family === 'world').map(section => section.id));
    expect(stepOfPage('origin')).toBe('origin');
    expect(stepOfPage('arc')).toBe('arc');
    expect(stepOfPage('manifest')).toBe('manifest');
  });

  it('marks Origin missing and Manifest not ready until the required inputs are in', () => {
    const empty = createEmptyStorySeedInput();
    expect(stepStatus('origin', empty)).toBe('missing');
    expect(stepStatus('manifest', empty)).toBe('empty');
    expect(stepStatus('world', empty)).toBe('empty');

    const ready = patchStoryRequired({ style: 'chinese', genre: 'Xianxia', premise: 'A courier crosses the sea.' })(empty);
    expect(stepStatus('origin', ready)).toBe('filled');
    expect(stepStatus('manifest', ready)).toBe('filled');
  });
});
