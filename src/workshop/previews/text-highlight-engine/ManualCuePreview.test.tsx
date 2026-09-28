// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NarrativeAudioProvider, type NarrativeAudioPlayback } from '../../../audio/playback';
import { passageRange } from '@seihouse/sen/text-highlight-engine';
import { TextHighlightEnginePreview } from './TextHighlightEngineWorkspace';
import { previewParagraphs } from './previewData';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement;
let root: Root;
const replace = vi.fn();
const stop = vi.fn();
const playback = {
  autoplayBlocked: false, currentSource: null, currentTrackId: null, errorMessage: '', hasError: false,
  isBuffering: false, isMuted: false, isPlaying: false, volume: 1,
  load: vi.fn(), pause: vi.fn(), play: vi.fn(), replace, restart: vi.fn(), setVolume: vi.fn(), stop,
  subscribe: () => () => {}, subscribeToTrackChange: () => () => {}, subscribeToQueueEnd: () => () => {}, toggleMute: vi.fn(),
} as unknown as NarrativeAudioPlayback;
const ACTION = previewParagraphs[0];
const ROAR = 'the beast roared again';
const ROAR_AT = ACTION.indexOf(ROAR);
const ROAR_SENTENCE = 'Somewhere behind the smoke, the beast roared again, closer now, its claws scraping across the stone.';
const button = (name: string) => Array.from(document.querySelectorAll('button')).find(item => item.textContent === name)!;
const click = (name: string) => act(() => button(name).click());
const block = (index = 0) => host.querySelectorAll<HTMLElement>('[data-sen-text-block]')[index];
const prose = (index = 0) => block(index).textContent?.replaceAll('⁠', '');
async function select(node: Node, start: number, end: number, endNode = node) {
  await act(async () => {
    const range = document.createRange(); range.setStart(node, start); range.setEnd(endNode, end);
    document.getSelection()!.removeAllRanges(); document.getSelection()!.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
}
/** Selects by prose offsets across any cue glyph that splits the paragraph's text nodes. */
async function selectText(index: number, start: number, end: number) {
  const element = block(index);
  const text = previewParagraphs[index] === prose(index) ? previewParagraphs[index] : prose(index)!;
  const range = passageRange(host, { blockId: element.dataset.senTextBlock!, startOffset: start, endOffset: end, selectedText: text.slice(start, end) })!;
  await select(range.startContainer, range.startOffset, range.endOffset, range.endContainer);
}
const selectRoar = () => select(block().firstChild!, ROAR_AT, ROAR_AT + ROAR.length);
function openCue() { click('Media'); click('Audio'); click('Cue'); }
const placeFirstCue = () => act(() => document.querySelector('.sen-manual-cue-picker__item')!.querySelectorAll('button')[1].click());
function inlinePhrase() { return block().querySelector<HTMLElement>('[data-cue-annotation] .inline-world-cue-annotation__text')!; }
function editTo(value: string) {
  click('Edit');
  act(() => {
    const editor = block().querySelector('[contenteditable]')!;
    editor.textContent = value; editor.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const attachments = () => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="manuscript-attachment"]'));
const address = () => document.querySelector('[data-testid="manuscript-address"]')?.textContent;
function setSearch(value: string) {
  const input = document.querySelector<HTMLInputElement>('.sen-manual-cue-picker input[type="search"]')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function setCategory(value: string) {
  const select = document.querySelector<HTMLSelectElement>('.sen-manual-cue-picker select')!;
  act(() => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); });
}

beforeEach(() => {
  replace.mockClear(); stop.mockClear();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  Range.prototype.getClientRects = () => [{ left: 100, top: 200, right: 230, bottom: 222, width: 130, height: 22 }] as unknown as DOMRectList;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(<NarrativeAudioProvider value={playback}><TextHighlightEnginePreview /></NarrativeAudioProvider>));
});
afterEach(() => { act(() => root.unmount()); host.remove(); document.getSelection()?.removeAllRanges(); vi.unstubAllGlobals(); });

describe('Workshop manuscript page', () => {
  it('starts from three pre-made paragraphs saved as a draft page with sentences', () => {
    expect(host.querySelectorAll('[data-sen-text-block]')).toHaveLength(3);
    expect(Array.from(host.querySelectorAll('[data-sen-text-block]'), element => element.textContent)).toEqual(previewParagraphs);
    expect(document.querySelector('[data-testid="manuscript-status"]')?.textContent).toBe('Draft');
    expect(document.querySelector('[data-testid="manuscript-structure"] summary')?.textContent).toContain('3 paragraphs · 15 sentences');
  });

  it('shows the address of a selection and selects a saved sentence from the page structure', async () => {
    const second = previewParagraphs[1];
    await select(block(1).firstChild!, second.indexOf('temple bells'), second.indexOf('temple bells') + 'temple bells'.length);
    expect(address()).toBe('Paragraph 2 · Sentence 8');
    expect(document.querySelector('[data-testid="manuscript-selection"]')?.textContent).toContain('“temple bells”');
    act(() => document.querySelectorAll<HTMLButtonElement>('[data-testid="manuscript-structure"] [data-sentence-id]')[2].click());
    expect(address()).toBe('Paragraph 1 · Sentence 3');
    expect(document.querySelector('[data-testid="manuscript-selection"]')?.textContent).toContain('exactly one sentence');
    expect(button('Edit')).toBeDefined();
  });
});

describe('Workshop manual Sound Cue flow', () => {
  it('navigates nested actions, previews and places one existing cue through shared playback', async () => {
    const paragraph = block();
    await selectRoar();
    expect(button('Edit')).toBeDefined(); expect(button('Media')).toBeDefined();
    openCue();
    expect(document.querySelectorAll('.sen-manual-cue-picker__item')).toHaveLength(92);
    expect(document.querySelector('.sen-manual-cue-picker__number')?.textContent).toBe('#001');
    expect(document.querySelectorAll('.sen-manual-cue-picker__number')[91].textContent).toBe('#092');
    expect(document.querySelector('.sen-text-highlight-marks span')).not.toBeNull();
    const first = document.querySelector('.sen-manual-cue-picker__item')!;
    act(() => first.querySelectorAll('button')[0].click());
    expect(replace).toHaveBeenCalledWith(expect.objectContaining({ id: expect.stringContaining('manual-cue-preview:'), source: expect.stringMatching(/^https:/) }));
    act(() => first.querySelectorAll('button')[1].click());
    expect(block()).toBe(paragraph);
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(1);
    expect(inlinePhrase().textContent).toBe(ROAR);
    expect(prose()).toBe(ACTION);
    expect(document.querySelector('.sen-manual-cue-picker')).toBeNull();
    expect(attachments()).toHaveLength(1);
    expect(attachments()[0].dataset.status).toBe('placed');
    expect(attachments()[0].textContent).toContain('Words · Paragraph 1 · Sentence 3');
    act(() => block().querySelector<HTMLButtonElement>('[data-action-type="world-cue"]')!.click());
    expect(replace.mock.lastCall?.[0]).toMatchObject({ id: expect.stringContaining('reader-inline:manual-world-cue:'),
      source: expect.stringMatching(/^https:/) });
  });

  it('filters by parent category and search while keeping catalog numbers and selection stable', async () => {
    await selectRoar(); openCue();
    expect(document.activeElement).toBe(document.querySelector('.sen-manual-cue-picker__heading'));
    const options = Array.from(document.querySelectorAll('.sen-manual-cue-picker select option'));
    expect(options.map(option => option.textContent)).toEqual([
      'All categories (92)', 'Beasts (46)', 'Weapons (20)', 'Artifacts (4)', 'Locations (16)', 'Factions (6)',
    ]);
    setCategory('weapons');
    expect(document.querySelectorAll('.sen-manual-cue-picker__item')).toHaveLength(20);
    setSearch('  SWorD  ');
    expect(document.querySelectorAll('.sen-manual-cue-picker__item')).toHaveLength(7);
    expect(document.querySelector('.sen-manual-cue-picker__number')?.textContent).toBe('#012');
    expect(document.querySelector('.sen-manual-cue-picker__count')?.textContent).toBe('Showing 7 of 92 cues');
    expect(document.querySelector('.sen-text-highlight-marks span')).not.toBeNull();
    setSearch('not-a-real-cue');
    expect(document.querySelectorAll('.sen-manual-cue-picker__item')).toHaveLength(0);
    expect(document.querySelector('.sen-manual-cue-picker__empty')?.textContent).toContain('No Sound Cues match');
    setSearch('');
    setCategory('all');
    expect(document.querySelectorAll('.sen-manual-cue-picker__item')).toHaveLength(92);
    setCategory('weapons');
    setSearch('sword');
    const chosen = document.querySelector('.sen-manual-cue-picker__item')!;
    act(() => chosen.querySelectorAll('button')[0].click());
    const previewSource = replace.mock.lastCall?.[0].source;
    act(() => chosen.querySelectorAll('button')[1].click());
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(1);
    act(() => block().querySelector<HTMLButtonElement>('[data-action-type="world-cue"]')!.click());
    expect(replace.mock.lastCall?.[0].source).toBe(previewSource);
  });

  it('attaches a cue to the whole saved sentence around a selection', async () => {
    const across = ACTION.indexOf('courtyard. Somewhere');
    await selectText(0, across, across + 'courtyard. Somewhere'.length);
    openCue(); click('Sentence');
    expect(document.querySelector('.sen-manuscript-cue-panel [role="status"]')?.textContent).toContain('covers more than one sentence');
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });

    await select(block().firstChild!, ROAR_AT + 4, ROAR_AT + 9);
    openCue();
    click('Sentence');
    expect(document.querySelector('.sen-manual-cue-picker__heading')?.textContent).toBe(`Sound Cue for “${ROAR_SENTENCE}”`);
    placeFirstCue();
    expect(inlinePhrase().textContent).toBe(ROAR_SENTENCE);
    expect(attachments()[0].textContent).toContain('Sentence · Paragraph 1 · Sentence 3');

    const smoke = inlinePhrase().textContent!.indexOf('smoke');
    await select(inlinePhrase().firstChild!, smoke, smoke + 'smoke'.length);
    editTo('ash'); click('Save');
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(0);
    expect(attachments()[0].dataset.status).toBe('changed');
    expect(attachments()[0].textContent).toContain('Sentence · Paragraph 1 · Sentence 3');
    click('Keep');
    expect(attachments()[0].dataset.status).toBe('placed');
    expect(inlinePhrase().textContent).toBe(ROAR_SENTENCE.replace('smoke', 'ash'));
  });

  it('reselects annotated prose for replacement and removal without duplicate glyphs', async () => {
    await selectRoar(); openCue(); placeFirstCue();
    await select(inlinePhrase().firstChild!, 0, inlinePhrase().textContent!.length);
    openCue();
    expect(button('Remove cue')).toBeDefined();
    act(() => document.querySelectorAll('.sen-manual-cue-picker__item')[1].querySelectorAll('button')[1].click());
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(1);
    expect(attachments()).toHaveLength(1);
    await select(inlinePhrase().firstChild!, 0, inlinePhrase().textContent!.length);
    openCue(); click('Remove cue');
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(0);
    expect(attachments()).toHaveLength(0);
    expect(block().textContent).toBe(ACTION);
  });

  it('rejects a second cue whose selected range overlaps an existing placement', async () => {
    await selectRoar(); openCue(); placeFirstCue();
    await select(inlinePhrase().firstChild!, 4, 12); openCue();
    placeFirstCue();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('overlaps an existing cue');
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(1);
  });
});

describe('Workshop edits keep attachments on their words', () => {
  it('shifts a cue after an earlier edit and flags it, rather than moving it, when its words change', async () => {
    await selectRoar(); openCue(); placeFirstCue();
    await select(block().firstChild!, 0, 'The iron'.length); editTo('An old');
    click('Save');
    expect(prose()).toBe(`An old${ACTION.slice('The iron'.length)}`);
    expect(inlinePhrase().textContent).toBe(ROAR);
    expect(attachments()[0].dataset.status).toBe('placed');
    await select(inlinePhrase().firstChild!, 0, inlinePhrase().textContent!.length);
    editTo('the wind howled');
    click('Save');
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(0);
    expect(attachments()).toHaveLength(1);
    expect(attachments()[0].dataset.status).toBe('changed');
    expect(attachments()[0].textContent).toContain('An edit replaced these words');
    act(() => attachments()[0].querySelector<HTMLButtonElement>('button')!.click());
    expect(attachments()).toHaveLength(0);
  });

  it('restores an anchored cue after undoing a deletion immediately before it', async () => {
    await selectRoar(); openCue(); placeFirstCue();
    await select(block().firstChild!, 0, 'The iron gate split down the middle, and '.length); editTo('');
    click('Delete Passage');
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(1);
    click('Undo');
    expect(prose()).toBe(ACTION);
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(1);
    expect(inlinePhrase().textContent).toBe(ROAR);
  });

  it('brings back a cue inside deleted words when the deletion is undone', async () => {
    await selectRoar(); openCue(); placeFirstCue();
    const sentenceAt = ACTION.indexOf(ROAR_SENTENCE);
    await selectText(0, sentenceAt, ROAR_AT + 2); editTo('');
    click('Delete Passage');
    expect(block().querySelectorAll('[data-cue-annotation]')).toHaveLength(0);
    expect(attachments()[0].dataset.status).toBe('changed');
    click('Undo');
    expect(prose()).toBe(ACTION);
    expect(inlinePhrase().textContent).toBe(ROAR);
    expect(attachments()[0].dataset.status).toBe('placed');
    expect(document.querySelector('[data-testid="manuscript-structure"] summary')?.textContent).toContain('15 sentences');
  });

  it('seals only once nothing is flagged, then closes editing and attaching', async () => {
    await selectRoar(); openCue(); placeFirstCue();
    await select(inlinePhrase().firstChild!, 0, inlinePhrase().textContent!.length);
    editTo('the wind howled'); click('Save');
    click('Seal chapter');
    expect(document.querySelector('[aria-label="Confirm seal"]')?.textContent).toContain('1 flagged attachment must be resolved first.');
    expect(button('Seal').disabled).toBe(true);
    click('Cancel');
    act(() => attachments()[0].querySelector<HTMLButtonElement>('button')!.click());
    click('Seal chapter'); click('Seal');
    expect(document.querySelector('[data-testid="manuscript-status"]')?.textContent).toBe('Sealed');
    await select(block(1).firstChild!, 0, 6);
    expect(address()).toBe('Paragraph 2 · Sentence 6');
    expect(button('Edit')).toBeUndefined();
    expect(button('Media')).toBeUndefined();
    expect(document.querySelector('.sen-text-highlight-controls')).toBeNull();
  });
});
