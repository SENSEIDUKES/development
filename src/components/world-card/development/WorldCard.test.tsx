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
  expect(container.textContent).toContain('Cultivation Rate: Heaven');
  expect(container.textContent).toContain('Views');
  expect(container.textContent).toContain('1,280');
  const information = container.querySelector('[aria-label="World information"]')!;
  expect(information.textContent).toContain('Branches');
  expect(information.textContent).toContain('12');
  expect(information.textContent).toContain('Activity');
  expect(information.textContent).toContain('Active this week');
  expect(information.textContent).not.toContain('Realm');
  expect(information.textContent).not.toContain('Status');
  expect(container.querySelector('[aria-label="Library state"]')?.textContent).toContain('Sealed');
  expect(container.textContent).toContain('A lotus blooms.');

  act(() => root.render(<WorldCardInfo story={{ ...story, cultivationRate: undefined, imageUrl: '' }} />));
  expect(container.textContent).not.toContain('Cultivation Rate: Heaven');
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
  const format = cover.querySelector('.world-card-base-format-static')!;
  expect(format.getAttribute('role')).toBe('img');
  expect(format.getAttribute('aria-label')).toBe('Format: Novel');
  expect(format.querySelector('[data-sen-icon="story-scroll"]')).not.toBeNull();
  expect(cover.querySelector('button.world-card-base-format')).toBeNull();
  expect(cover.querySelector('.world-card-base-open')).toBeNull();
  expect(page.querySelector('h1')?.textContent).toBe(story.title);
  expect(page.querySelector('[data-element="lightning"]')?.textContent).toContain('SENSEI');
  expect(page.querySelector('[aria-label="World information"]')?.textContent).toContain('Chapters24');
  expect(page.querySelector('[aria-label="Story status: On Going"]')).not.toBeNull();
  expect(cover.querySelector('video')).toBeNull();

  act(() => cover.querySelector<HTMLButtonElement>('.motion-picture-control')!.click());
  expect(cover.getAttribute('data-motion-playing')).toBe('true');
  expect(cover.querySelector('video')?.getAttribute('src')).toBe(story.videoUrl);
  act(() => cover.querySelector('video')!.dispatchEvent(new Event('ended')));
  expect(cover.getAttribute('data-motion-playing')).toBeNull();
  act(() => root.render(<WorldCardInfo story={{ ...story, format: undefined }} />));
  expect(container.querySelector('[data-world-card="info-cover"] .world-card-base-format')).toBeNull();
  vi.restoreAllMocks();
});

it('treats zero branches as known and omits activity the host does not supply', () => {
  const story: StoryDetailDisplay = {
    ...world, author: 'SENSEI', synopsis: 'A lotus blooms.', currentArc: 'Silent Pavilion',
    status: 'Manifesting', tags: [], branchCount: 0, activityStatus: 'active-now',
  };
  act(() => root.render(<WorldCardInfo story={story} />));
  let information = container.querySelector('[aria-label="World information"]')!;
  expect(information.textContent).toContain('Branches0');
  expect(information.textContent).toContain('Active now');

  act(() => root.render(<WorldCardInfo story={{ ...story, branchCount: undefined, activityStatus: 'quiet' }} />));
  information = container.querySelector('[aria-label="World information"]')!;
  expect(information.textContent).toContain('Quiet');
  expect(information.textContent).not.toContain('Branches');

  act(() => root.render(<WorldCardInfo story={{ ...story, branchCount: undefined, activityStatus: undefined }} />));
  information = container.querySelector('[aria-label="World information"]')!;
  expect(information.textContent).not.toContain('Activity');
  expect(information.textContent).not.toContain('Branches');
});
