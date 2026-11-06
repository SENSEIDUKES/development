import { describe, expect, it } from 'vitest';
import { STORY_SEED_EDITOR_TAB_KEYS, createEmptyStorySeedInput } from '@seihouse/sen/story-seed';
import { SEED_SECTIONS } from '../seedSections';
import { patchStoryRequired } from '../seedState';
import { creatorPositions, tabKey, CREATOR_PAGE_ORDER, nextPage, previousPage, partComplete, pageComplete, stepOfPage, stepStatus, tabsToConfirm } from './creatorSteps';

describe('Story Seed creator steps', () => {
  it('uses the persistence contract tab keys', () => {
    expect(creatorPositions(true).filter(position => position.page !== 'manifest').map(tabKey).sort()).toEqual([...STORY_SEED_EDITOR_TAB_KEYS].sort());
  });
  it('walks Origin, every World section, Arc, then Create', () => {
    expect(CREATOR_PAGE_ORDER).toEqual(['origin', ...SEED_SECTIONS.filter(section => section.family === 'world').map(section => section.id), 'arc', 'manifest']);
    expect(nextPage('origin')).toBe('world-identity');
    expect(nextPage('arc')).toBe('manifest');
    expect(nextPage('power-system')).toBe('arc');
    expect(nextPage('manifest')).toBeNull();
    expect(previousPage('origin')).toBeNull();
    expect(previousPage('manifest')).toBe('arc');
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
    expect(stepStatus('origin', ready)).toBe('empty');
    expect(stepStatus('origin', ready, ['origin.fate', 'origin.tags'])).toBe('filled');
    expect(stepStatus('manifest', ready)).toBe('filled');
  });

  it('never treats untouched defaults as reviewed or lets confirmations replace required answers', () => {
    const seed = createEmptyStorySeedInput();
    // Fun Settings sit on the ARC page (SENSEI, 2026-11-06).
    expect(partComplete('arc', 'fun', seed)).toBe(false);
    expect(partComplete('origin', 'fate', seed)).toBe(false);
    expect(partComplete('arc', 'fun', seed, ['arc.fun'])).toBe(true);
    expect(partComplete('origin', 'style', seed, ['origin.style'])).toBe(false);
    expect(partComplete('origin', 'synopsis', seed, ['origin.synopsis'])).toBe(false);
    seed.story.required.style = 'chinese';
    expect(partComplete('origin', 'style', seed)).toBe(false);
    seed.story.required.genre = 'Fantasy';
    expect(partComplete('origin', 'style', seed)).toBe(true);
    seed.story.required.style = 'Unsupported style' as typeof seed.story.required.style;
    expect(partComplete('origin', 'style', seed)).toBe(false);
    seed.story.required.genre = '';
    expect(partComplete('origin', 'style', seed)).toBe(false);
  });

  it('completes parents only when every child has content or confirmation', () => {
    const seed = createEmptyStorySeedInput();
    seed.story.optional.makeItWorkInstruction = 'An island that sinks a little every year';
    expect(pageComplete('world-identity', seed)).toBe(true);
    expect(stepStatus('world', seed)).toBe('empty');
    const world = SEED_SECTIONS.filter(section => section.family === 'world').map(section => section.id);
    expect(stepStatus('world', seed, world)).toBe('filled');
    expect(stepStatus('arc', seed, ['arc.ending'])).toBe('empty');
    expect(stepStatus('arc', seed, ['arc.ending', 'arc.goals', 'arc.pins', 'arc.fun'])).toBe('filled');
  });

  it('confirms only the displayed phone part or the displayed whole desktop page', () => {
    expect(tabsToConfirm({ page: 'arc', part: 'fun' }, true)).toEqual(['arc.fun']);
    expect(tabsToConfirm({ page: 'arc' }, false)).toEqual(['arc.ending', 'arc.goals', 'arc.pins', 'arc.fun']);
    expect(tabsToConfirm({ page: 'characters' }, true)).toEqual(['characters']);
    expect(tabsToConfirm({ page: 'manifest' }, true)).toEqual([]);
  });
});
