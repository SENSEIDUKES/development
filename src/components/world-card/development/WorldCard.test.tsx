// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';
import type { StoryDetailDisplay } from '../../light-novels-home/shared/storyDetailContracts';
import { WorldCard } from './WorldCard';
import { WorldCardInfo } from './WorldCardInfo';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

const world: HomeWorld = {
  id: 'lotus', title: 'The Last Lotus', genre: 'Xianxia', createdAt: '2026-09-09',
  reads: 1280, imageUrl: '/lotus.png', chapterCount: 24, chapterWritingStyle: 'Standard',
  mcName: 'Ye Chen', powerStage: 'Foundation', creatorName: 'SENSEI', format: 'Novel', acquired: true,
};

it('opens the portrait card with title, creator and a chapter-format row on the image', () => {
  const onOpen = vi.fn();
  act(() => root.render(<WorldCard world={world} onOpen={onOpen} />));

  const card = container.querySelector('[data-world-card="full"]')!;
  expect((card as HTMLElement).style.getPropertyValue('--world-card-glow')).not.toBe('');
  const open = card.querySelector<HTMLButtonElement>('.world-card-base-open')!;
  expect(open.getAttribute('aria-label')).toBe('Open The Last Lotus, 24 chapters, creator SENSEI, format Novel');
  const media = card.querySelector('.world-card-base-media')!;
  expect(media.querySelector('.world-card-base-overlay')).not.toBeNull();
  for (const value of ['The Last Lotus', 'SENSEI', 'Ch. 24']) {
    expect(card.textContent).toContain(value);
    expect(media.textContent).toContain(value);
  }
  expect(card.querySelector('[data-sen-icon="story-scroll"]')).not.toBeNull();
  expect(card.querySelector('.world-card-base-chapters svg[aria-hidden="true"]')).not.toBeNull();
  expect(media.querySelector(':scope > .world-card-base-format')).not.toBeNull();
  expect(media.querySelector('.world-card-base-details .world-card-base-format')).toBeNull();
  expect(card.querySelector('.world-card-base-format .sr-only')?.textContent).toBe('Novel');
  expect(card.querySelector('.world-card-base-format')?.textContent).not.toContain('NOVEL');
  expect(card.querySelector('.world-card-base-chapter-count')).toBeNull();
  expect(card.querySelector('.world-card-base-details')?.getAttribute('data-slot')).toBe('badge');
  expect([...card.querySelector('.world-card-base-meta')!.children].map((element) => element.className)).toEqual([
    expect.stringContaining('world-card-base-details'), 'world-card-base-creator',
  ]);
  expect(card.querySelector('.world-card-base-details .world-card-base-creator')).toBeNull();
  for (const value of ['Xianxia', 'Standard', 'Creator', 'Format', 'Manga', 'Ye Chen', 'Foundation', '1,280', 'Sealed', 'Draft', 'Unacquired', 'Recently read']) {
    expect(card.textContent).not.toContain(value);
  }
  act(() => open.click());
  expect(onOpen).toHaveBeenCalledOnce();
});

it('renders host-supplied creator lettering without assigning an element to other creators', () => {
  act(() => root.render(<WorldCard world={{ ...world, creatorTitle: { element: 'lightning', intensity: 'rare' } }} onOpen={() => {}} />));
  expect(container.querySelector('.world-card-base-creator [data-element="lightning"]')?.textContent).toContain('SENSEI');

  act(() => root.render(<WorldCard world={world} onOpen={() => {}} />));
  expect(container.querySelector('.world-card-base-creator')?.textContent).toBe('SENSEI');
  expect(container.querySelector('.world-card-base-creator [data-element]')).toBeNull();
});

it('opens authorized story information without navigating or playing motion', async () => {
  const onOpen = vi.fn();
  await act(async () => root.render(<WorldCard world={{ ...world, synopsis: 'A lotus blooms.',
    tags: ['FoundFamily'], activityStatus: 'active-this-week', branchingEnabled: false,
  }} onOpen={onOpen} />));
  const trigger = container.querySelector<HTMLButtonElement>('.world-card-base-format')!;
  await act(async () => trigger.click());
  const panel = document.querySelector('.world-card-story-panel')!;
  expect(panel.querySelector('h2')?.classList.contains('sr-only')).toBe(true);
  expect(panel.querySelector('h2')?.textContent).toBe(`Story information for ${world.title}`);
  expect(panel.textContent).toContain('A lotus blooms.');
  expect(panel.querySelector('.world-card-story-panel-views')?.getAttribute('aria-label')).toBe(`${world.reads.toLocaleString()} views`);
  expect(panel.querySelector('.world-card-story-panel-views')?.getAttribute('data-slot')).toBe('badge');
  expect(panel.querySelector('.world-card-story-panel-views')?.textContent).toContain(world.reads.toLocaleString());
  expect(panel.querySelector('.world-card-story-panel-verified')).toBeNull();
  expect(panel.querySelector('[aria-label="World standing"]')?.contains(panel.querySelector('.world-card-story-panel-views'))).toBe(true);
  expect(panel.textContent).toContain('Active this week');
  expect(panel.textContent).toContain('BranchingDisabled');
  expect(panel.textContent).toContain('#FoundFamily');
  expect(panel.getAttribute('role')).toBe('dialog');
  expect(panel.getAttribute('aria-modal')).toBe('true');
  expect(document.querySelector('.world-card-story-backdrop')).not.toBeNull();
  expect(onOpen).not.toHaveBeenCalled();
  expect(container.querySelector('video')).toBeNull();
  await act(async () => panel.querySelector<HTMLButtonElement>('[aria-label="Close dialog"]')!.click());
  expect(document.querySelector('.world-card-story-panel')).toBeNull();
});

it('shows the official SEN mark only for a host-verified world', async () => {
  await act(async () => root.render(<WorldCard world={{ ...world, senVerified: true }} onOpen={() => {}} />));
  expect(container.querySelector('.world-card-story-panel-verified')).toBeNull();
  await act(async () => container.querySelector<HTMLButtonElement>('.world-card-base-format')!.click());
  const panel = document.querySelector('.world-card-story-panel')!;
  const verified = panel.querySelector('.world-card-story-panel-verified')!;
  expect(verified.textContent).toContain('SEN Verified');
  expect(verified.getAttribute('aria-label')).toBe('SEN verified world');
  expect(verified.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  expect(panel.querySelector('[aria-label="World standing"]')?.contains(verified)).toBe(true);
});

it('does not infer hidden activity or branching permission from missing data', async () => {
  await act(async () => root.render(<WorldCard world={{ ...world, format: undefined }} onOpen={() => {}} />));
  await act(async () => container.querySelector<HTMLButtonElement>('.world-card-base-format')!.click());
  const panel = document.querySelector('.world-card-story-panel')!;
  expect(panel.textContent).toContain('Synopsis unavailable.');
  expect(panel.textContent).toContain('No story tags supplied.');
  expect(panel.textContent).not.toContain('Activity');
  expect(panel.textContent).not.toContain('Branching');
  expect(panel.textContent).not.toContain('Quiet');
});

it('keeps chapter and host-selected status in the bottom row', () => {
  act(() => root.render(<WorldCard world={world} displayStatus={{ view: 'public', value: 'ongoing' }} onOpen={() => {}} />));
  const card = container.querySelector('[data-world-card="full"]')!;
  const details = card.querySelector('.world-card-base-details')!;
  expect([...details.children].map((item) => item.className)).toEqual([
    'world-card-base-chapters', 'world-card-base-status',
  ]);
  expect(details.textContent).toContain('Ch. 24On Going');
  expect(details.querySelector('.world-card-base-status svg')).not.toBeNull();
  expect(card.querySelector('.world-card-base-open')?.getAttribute('aria-label')).toContain('On Going');

  act(() => root.render(<WorldCard world={world} displayStatus={{ view: 'public', value: 'completed' }} onOpen={() => {}} />));
  expect(details.textContent).toContain('Ch. 24Completed');

  act(() => root.render(<WorldCard world={{ ...world, draft: false }} displayStatus={{ view: 'library', value: 'draft' }} onOpen={() => {}} />));
  expect(details.textContent).toContain('Ch. 24Draft');

  act(() => root.render(<WorldCard world={world} displayStatus={{ view: 'library', value: 'complete' }} onOpen={() => {}} />));
  expect(details.textContent).toContain('Ch. 24Complete');
});

it('plays only this world’s supplied motion clip without opening the world', () => {
  const onOpen = vi.fn();
  const videoUrl = 'https://media.seihouse.org/SEN/VIDEO/Motion%20Pictures/ye_chen_MP.mp4';
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
  act(() => root.render(<WorldCard world={{ ...world, videoUrl }} onOpen={onOpen} />));
  const card = container.querySelector('[data-world-card="full"]')!;
  const play = card.querySelector<HTMLButtonElement>('.motion-picture-control')!;
  expect(card.querySelector('video')).toBeNull();
  expect(play.getAttribute('aria-label')).toBe('Play motion for The Last Lotus cover');
  expect(card.getAttribute('data-motion-playing')).toBeNull();
  act(() => play.click());
  expect(card.getAttribute('data-motion-playing')).toBe('true');
  expect(card.querySelector('video')?.getAttribute('src')).toBe(videoUrl);
  expect(play.getAttribute('aria-pressed')).toBe('true');
  expect(onOpen).not.toHaveBeenCalled();
  act(() => card.querySelector('video')!.dispatchEvent(new Event('ended')));
  expect(play.getAttribute('aria-pressed')).toBe('false');
  expect(card.getAttribute('data-motion-playing')).toBeNull();
  act(() => card.querySelector<HTMLButtonElement>('.world-card-base-open')!.click());
  expect(onOpen).toHaveBeenCalledOnce();
  vi.restoreAllMocks();
});

it('keeps acquisition and reading states off the card and handles missing covers without inventing a writing style', () => {
  const draft = { ...world, acquired: false, draft: true, recentlyRead: true, chapterWritingStyle: undefined, imageUrl: '' };
  act(() => root.render(<WorldCard world={draft} onOpen={() => {}} />));
  const card = container.querySelector('[data-world-card="full"]')!;
  expect(card.textContent).toContain('Cover unavailable');
  expect(card.textContent).not.toContain('Draft');
  expect(card.textContent).not.toContain('Recently read');
  expect(card.textContent).not.toContain('Unacquired');
  expect(card.textContent).not.toContain('Standard');
  expect(card.querySelector('img')).toBeNull();

  act(() => root.render(<WorldCard world={{ ...world, imageUrl: '/broken.png' }} onOpen={() => {}} />));
  const image = container.querySelector('img')!;
  act(() => image.dispatchEvent(new Event('error')));
  expect(container.textContent).toContain('Cover unavailable');

  act(() => root.render(<WorldCard world={{ ...world, creatorName: undefined, format: undefined }} onOpen={() => {}} />));
  expect(container.querySelector('.world-card-base-meta')?.textContent).toBe('Ch. 24');
  expect(container.querySelector('.world-card-base-details')?.textContent).toBe('Ch. 24');

  act(() => root.render(<WorldCard world={{ ...world, format: 'Manga' }} onOpen={() => {}} />));
  expect(container.textContent).toContain('MANGA');
  expect(container.querySelector('[data-sen-icon="story-scroll"]')).toBeNull();
});

it('keeps the Info overview and shows cultivation rate only from data', () => {
  const story: StoryDetailDisplay = {
    ...world, author: 'SENSEI', synopsis: 'A lotus blooms.', currentArc: 'Silent Pavilion',
    status: 'Manifesting', tags: ['FoundFamily'], cultivationRate: 'Heaven',
    branchCount: 12, activityStatus: 'active-this-week',
  };
  act(() => root.render(<WorldCardInfo story={story} />));
  // Cultivation Rate is not shown: the tag slot holds story tags only.
  expect(container.textContent).not.toContain('Cultivation Rate');
  // Views, branches and activity are placeholders with no real source yet, so the Info page shows none of them.
  expect(container.querySelector('[aria-label="World information"]')).toBeNull();
  for (const placeholder of ['Views', '1,280', 'Branches', 'Activity', 'Active this week']) {
    expect(container.textContent).not.toContain(placeholder);
  }
  expect(container.querySelector('[aria-label="Library state"]')?.textContent).toContain('Sealed');
  expect(container.textContent).toContain('A lotus blooms.');

  act(() => root.render(<WorldCardInfo story={{ ...story, cultivationRate: undefined, imageUrl: '' }} />));
  expect(container.textContent).not.toContain('Cultivation Rate');
  expect(container.textContent).toContain('Cover unavailable');
  expect(container.querySelector('[data-world-card="info"]')).not.toBeNull();

  act(() => root.render(<WorldCardInfo story={{ ...story, acquired: false }} />));
  expect(container.querySelector('[aria-label="Library state"]')?.textContent).toContain('Unacquired');
  expect(container.querySelector('[aria-label="Library state"]')?.textContent).not.toContain('Sealed');

  act(() => root.render(<WorldCardInfo story={{ ...story, acquired: false, draft: true, recentlyRead: true }} />));
  const libraryState = container.querySelector('[aria-label="Library state"]')?.textContent;
  expect(libraryState).toContain('Draft');
  expect(libraryState).toContain('Recently read');
  expect(libraryState).not.toContain('Unacquired');
});

it('uses the artwork-only WorldCard on Info while keeping creator and progress on the page', () => {
  const story: StoryDetailDisplay = {
    ...world, author: 'SENSEI', synopsis: 'A lotus blooms.', currentArc: 'Silent Pavilion',
    status: 'Manifesting', tags: [], publicationStatus: 'ongoing',
    creatorTitle: { element: 'lightning', intensity: 'rare' },
    videoUrl: 'https://media.seihouse.org/SEN/VIDEO/Motion%20Pictures/ye_chen_MP.mp4',
  };
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
  act(() => root.render(<WorldCardInfo story={story} />));

  const page = container.querySelector('[data-world-card="info"]')!;
  const cover = page.querySelector<HTMLElement>('[data-world-card="info-cover"]')!;
  expect(cover.classList.contains('world-card-base')).toBe(true);
  expect(cover.style.getPropertyValue('--world-card-glow')).not.toBe('');
  expect(cover.querySelector('.world-card-base-overlay')).toBeNull();
  expect(cover.querySelector('.world-card-base-details')).toBeNull();
  // The format lives in the page's Information row, not on the Info cover.
  expect(cover.querySelector('.world-card-base-format')).toBeNull();
  expect(cover.querySelector('.world-card-base-open')).toBeNull();
  expect(page.querySelector('h1')?.textContent).toBe(story.title);
  expect(page.querySelector('[data-element="lightning"]')?.textContent).toContain('SENSEI');
  expect(page.querySelector('[data-world-info-chapters]')?.textContent).toContain('24 Chapters');
  expect(page.querySelector('[data-world-info-chapters]')?.textContent).toContain('Current arc · Silent Pavilion');
  expect(page.querySelector('[aria-label="Story status: On Going"]')).not.toBeNull();
  expect(cover.querySelector('video')).toBeNull();

  act(() => cover.querySelector<HTMLButtonElement>('.motion-picture-control')!.click());
  expect(cover.getAttribute('data-motion-playing')).toBe('true');
  expect(cover.querySelector('video')?.getAttribute('src')).toBe(story.videoUrl);
  act(() => cover.querySelector('video')!.dispatchEvent(new Event('ended')));
  expect(cover.getAttribute('data-motion-playing')).toBeNull();
  vi.restoreAllMocks();
});

const infoStory: StoryDetailDisplay = {
  ...world, author: 'SENSEI', synopsis: 'A lotus blooms.', currentArc: 'Silent Pavilion',
  status: 'Manifesting', tags: ['found family'], branchCount: 12,
};

it('makes the Chapters card the single reading action and names the known reading position', () => {
  const onRead = vi.fn();
  act(() => root.render(<WorldCardInfo story={infoStory} onRead={onRead} />));
  const readingActions = container.querySelectorAll<HTMLElement>('[role="button"][data-world-info-chapters="action"]');
  expect(readingActions).toHaveLength(1);
  expect(container.querySelectorAll('[role="button"], button:not(.motion-picture-control):not(.world-card-info-information)')).toHaveLength(1);
  const chapters = readingActions[0];
  expect(chapters.textContent).toContain('Start Reading');
  expect(chapters.getAttribute('aria-label')).toBe('Start Reading: The Last Lotus, 24 Chapters, current arc Silent Pavilion');
  expect(chapters.getAttribute('tabindex')).toBe('0');
  act(() => chapters.click());
  expect(onRead).toHaveBeenCalledTimes(1);
  act(() => chapters.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  expect(onRead).toHaveBeenCalledTimes(2);
  act(() => chapters.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })));
  expect(onRead).toHaveBeenCalledTimes(3);

  act(() => root.render(<WorldCardInfo story={infoStory} onRead={onRead} readingPosition={{ chapterNumber: 7 }} />));
  expect(container.querySelector('[data-world-info-chapters]')?.textContent).toContain('Continue Reading · Ch. 7');
  expect(container.textContent).not.toContain('Start Reading');

  act(() => root.render(<WorldCardInfo story={{ ...infoStory, currentArc: '' }} />));
  const staticCard = container.querySelector<HTMLElement>('[data-world-info-chapters]')!;
  expect(staticCard.getAttribute('data-world-info-chapters')).toBe('static');
  expect(staticCard.getAttribute('role')).toBeNull();
  expect(staticCard.getAttribute('tabindex')).toBeNull();
  expect(staticCard.textContent).not.toContain('Start Reading');
  expect(staticCard.textContent).not.toContain('Current arc');

  act(() => root.render(<WorldCardInfo story={{ ...infoStory, chapterCount: 0 }} onRead={onRead} />));
  expect(container.querySelector('[data-world-info-chapters]')?.getAttribute('data-world-info-chapters')).toBe('static');
  expect(container.querySelector('[data-world-info-chapters]')?.textContent).toContain('No chapters yet');
});

it('shows Open Codex only when supplied and an Information row that opens the story information', async () => {
  const onOpenCodex = vi.fn();
  act(() => root.render(<WorldCardInfo story={infoStory} onOpenCodex={onOpenCodex} />));
  const codex = container.querySelector<HTMLElement>('[role="button"][aria-label^="Open Codex"]')!;
  act(() => codex.click());
  expect(onOpenCodex).toHaveBeenCalledTimes(1);
  expect(container.textContent).not.toContain('Fate Timeline');

  act(() => root.render(<WorldCardInfo story={infoStory} />));
  expect(container.textContent).not.toContain('Open Codex');
  expect(container.querySelector('button:disabled')).toBeNull();
  const format = container.querySelector<HTMLButtonElement>('button.world-card-info-information')!;
  expect(format.getAttribute('aria-label')).toBe('Story information for The Last Lotus, Novel');
  expect(format.querySelector('.world-card-info-tool-title')?.textContent).toBe('Information');
  expect(format.querySelector('.world-card-info-tool-description')?.textContent).toBe('Novel');
  expect(format.querySelector('[data-sen-icon="story-scroll"]')).not.toBeNull();
  await act(async () => format.click());
  const panel = document.body.querySelector('.world-card-story-panel')!;
  expect(panel.textContent).toContain('A lotus blooms.');
  expect(panel.textContent).toContain('1,280');

  act(() => root.render(<WorldCardInfo story={{ id: 'ashes', title: 'Ashes', chapterCount: 3, status: 'draft', updatedAt: '2026-09-01' }} />));
  expect(container.querySelector('.world-card-info-information')).toBeNull();
});

it('paints story tags in their Story Seed catalog colors and leaves unknown tags neutral', () => {
  act(() => root.render(<WorldCardInfo story={{ ...infoStory, tags: ['sect politics', 'found family', 'lost history', 'Moon Bridge'] }} />));
  const chips = [...container.querySelectorAll<HTMLElement>('[aria-label="Story tags"] li > *')];
  expect(chips.map(chip => chip.textContent)).toEqual(['sect politics', 'found family', 'lost history', 'Moon Bridge']);
  expect(chips.map(chip => chip.getAttribute('data-tag-color'))).toEqual(['purple', 'gold', 'black', null]);
  expect(chips[0].style.getPropertyValue('--world-info-tag-accent')).toBe('#A78BFA');
  expect(chips[0].getAttribute('title')).toBe('Politics & War');
  expect(chips[3].querySelector('.world-card-info-tag-dot')).toBeNull();
  expect(container.textContent).not.toContain('#');
});

it('offers More only when the synopsis overflows its four lines', () => {
  act(() => root.render(<WorldCardInfo story={infoStory} />));
  expect(container.querySelector('.world-card-info-more')).toBeNull();

  const scrollHeight = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(240);
  const clientHeight = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(120);
  act(() => root.render(<WorldCardInfo story={{ ...infoStory, id: 'long-synopsis', synopsis: 'A lotus blooms. '.repeat(60) }} />));
  const more = container.querySelector<HTMLButtonElement>('.world-card-info-more')!;
  const synopsis = container.querySelector<HTMLElement>(`#${more.getAttribute('aria-controls')}`)!;
  expect(more.textContent).toContain('More');
  expect(more.getAttribute('aria-expanded')).toBe('false');
  expect(synopsis.classList.contains('world-card-info-synopsis-clamped')).toBe(true);
  act(() => more.click());
  expect(more.getAttribute('aria-expanded')).toBe('true');
  expect(more.textContent).toContain('Less');
  expect(synopsis.classList.contains('world-card-info-synopsis-clamped')).toBe(false);
  scrollHeight.mockRestore();
  clientHeight.mockRestore();
});

it('reflects only this world’s own cover and omits metrics and connected media', () => {
  act(() => root.render(<WorldCardInfo story={infoStory} />));
  const reflection = container.querySelector<HTMLElement>('.world-card-info-reflection')!;
  expect(reflection.getAttribute('aria-hidden')).toBe('true');
  expect(reflection.style.backgroundImage).toContain('/lotus.png');
  expect(container.querySelector('.world-expression-card, [aria-label^="Connected media for"]')).toBeNull();

  act(() => root.render(<WorldCardInfo story={{ ...infoStory, imageUrl: '  ' }} />));
  expect(container.querySelector('.world-card-info-reflection')).toBeNull();
  expect(container.querySelector('.world-card-info-chapters [data-slot="card-media"]')).toBeNull();

  act(() => root.render(<WorldCardInfo story={{ id: 'ashes', title: 'Ashes', chapterCount: 3, status: 'draft', updatedAt: '2026-09-01' }} />));
  expect(container.querySelector('[aria-label="World information"]')).toBeNull();
  expect(container.textContent).not.toContain('aren’t shared');
  expect(container.textContent).not.toContain('—');
  expect(container.querySelector('[aria-label="Library state"]')?.textContent).toContain('Draft');
  expect(container.textContent).toContain('Synopsis is not available yet.');
});

it('keeps title, byline and states beside the cover, with the tags in the hero', () => {
  act(() => root.render(<WorldCardInfo story={{ ...infoStory, publicationStatus: 'ongoing', cultivationRate: 'Heaven' }} />));
  const hero = container.querySelector('.world-card-info-hero')!;
  expect(hero.children).toHaveLength(3);
  expect(hero.children[0].querySelector('[data-world-card="info-cover"]')).not.toBeNull();
  const identity = hero.children[1];
  expect(identity.querySelector('h1')?.textContent).toBe('The Last Lotus');
  expect(identity.textContent).toContain('SENSEI');
  expect(identity.querySelector('[aria-label="Library state"]')?.textContent).toContain('Sealed');
  expect(identity.querySelector('[aria-label="Story status: On Going"]')).not.toBeNull();
  const tags = hero.children[2];
  expect(tags.getAttribute('aria-label')).toBe('Story tags');
  expect(tags.textContent).toBe('found family');
  expect(tags.textContent).not.toContain('Cultivation Rate');
});

it('shows each trimmed tag once', () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  act(() => root.render(<WorldCardInfo story={{ ...infoStory, tags: ['Lore', ' Lore', '', 'found family', 'Found Family '] }} />));
  const tags = [...container.querySelectorAll('[aria-label="Story tags"] li')].map(item => item.textContent);
  expect(tags).toEqual(['Lore', 'found family']);
  expect(error).not.toHaveBeenCalled();
  error.mockRestore();
});
