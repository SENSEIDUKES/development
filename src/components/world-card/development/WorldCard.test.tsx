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

it('opens the portrait card with only chapter count, title, creator and format on the image', () => {
  const onOpen = vi.fn();
  act(() => root.render(<WorldCard world={world} onOpen={onOpen} />));

  const card = container.querySelector('[data-world-card="full"]')!;
  expect((card as HTMLElement).style.getPropertyValue('--world-card-glow')).not.toBe('');
  const open = card.querySelector<HTMLButtonElement>('.world-card-base-open')!;
  expect(open.getAttribute('aria-label')).toBe('Open The Last Lotus, 24 chapters, creator SENSEI, format Novel');
  const media = card.querySelector('.world-card-base-media')!;
  expect(media.querySelector('.world-card-base-overlay')).not.toBeNull();
  for (const value of ['The Last Lotus', '24 Ch', 'SENSEI', 'NOVEL']) {
    expect(card.textContent).toContain(value);
    expect(media.textContent).toContain(value);
  }
  expect(card.querySelector('[data-sen-icon="story-scroll"]')).not.toBeNull();
  for (const value of ['Xianxia', 'Standard', 'Creator', 'Format', 'Manga', 'Ye Chen', 'Foundation', '1,280', 'Sealed', 'Draft', 'Unacquired', 'Recently read']) {
    expect(card.textContent).not.toContain(value);
  }
  act(() => open.click());
  expect(onOpen).toHaveBeenCalledOnce();
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

it('keeps library states off the card and handles missing covers without inventing a writing style', () => {
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
  expect(container.querySelector('.world-card-base-meta')).toBeNull();

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
