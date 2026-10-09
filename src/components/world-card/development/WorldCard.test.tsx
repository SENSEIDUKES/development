// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';
import type { StoryDetailDisplay } from '../../light-novels-home/shared/storyDetailContracts';
import { WorldCard } from './WorldCard';
import { WorldCardInfo } from './WorldCardInfo';
import { WorldCardFeature } from './WorldCardFeature';

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

it('keeps format, creator and an awarded SEN sash on the 2:3 art, with the title and details beneath', () => {
  const onOpen = vi.fn();
  act(() => root.render(<WorldCard world={world} senSash onOpen={onOpen} />));

  const tile = container.querySelector<HTMLElement>('[data-world-card-tile="full"]')!;
  expect(tile.getAttribute('data-cover-shape')).toBe('tall');
  const card = tile.querySelector('[data-world-card="full"]')!;
  expect((card as HTMLElement).style.getPropertyValue('--world-card-glow')).not.toBe('');
  const open = card.querySelector<HTMLButtonElement>('.world-card-base-open')!;
  expect(open.getAttribute('aria-label')).toBe('Open The Last Lotus, 24 chapters, creator SENSEI, format Novel');
  const media = card.querySelector('.world-card-base-media')!;
  // On the art: format mark, creator and the SEN sash only. The title lives in the caption.
  expect(media.querySelector(':scope > .world-card-base-format .sr-only')?.textContent).toBe('Novel');
  expect(card.querySelector('[data-sen-icon="story-scroll"]')).not.toBeNull();
  expect(media.querySelector('.world-card-base-creator')?.textContent).toBe('SENSEI');
  expect(media.querySelector('.world-card-ribbon')?.textContent).toBe('SEN');
  expect(media.querySelectorAll('.world-card-ribbon-star')).toHaveLength(2);
  expect(media.querySelector('.world-card-ribbon')?.getAttribute('aria-hidden')).toBe('true');
  expect(media.textContent).not.toContain('The Last Lotus');
  expect(media.textContent).not.toContain('Ch. 24');

  const caption = tile.querySelector('.world-card-caption')!;
  expect(caption.querySelector('h3')?.textContent).toBe('The Last Lotus');
  expect(caption.querySelector('.world-card-caption-details')?.textContent).toBe('Xianxia · Ch. 24');
  for (const value of ['Standard', 'Creator', 'Format', 'Manga', 'Ye Chen', 'Foundation', '1,280', 'Sealed', 'Draft', 'Unacquired', 'Recently read']) {
    expect(tile.textContent).not.toContain(value);
  }
  act(() => open.click());
  act(() => (caption as HTMLElement).click());
  expect(onOpen).toHaveBeenCalledTimes(2);

  // The sash is the host's award: without it, no card wears one.
  act(() => root.render(<WorldCard world={world} onOpen={onOpen} />));
  expect(container.querySelector('.world-card-ribbon')).toBeNull();
});

it('shows the Branching badge only when the creator has enabled branching, keeping the badge row either way', () => {
  act(() => root.render(<WorldCard world={{ ...world, branchingEnabled: true }} onOpen={() => {}} />));
  expect(container.querySelector('.world-card-caption-features')?.textContent).toBe('Branching');
  act(() => root.render(<WorldCard world={{ ...world, branchingEnabled: false }} onOpen={() => {}} />));
  expect(container.querySelector('.world-card-caption-features')?.textContent).toBe('');
  act(() => root.render(<WorldCard world={world} onOpen={() => {}} />));
  expect(container.querySelector('.world-card-caption-features')).not.toBeNull();
  expect(container.querySelector('.world-card-feature')).toBeNull();
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

it('puts chapter and host-selected status in the caption details', () => {
  act(() => root.render(<WorldCard world={world} displayStatus={{ view: 'public', value: 'ongoing' }} onOpen={() => {}} />));
  const details = () => container.querySelector('.world-card-caption-details')?.textContent;
  expect(details()).toBe('Xianxia · Ch. 24 · On Going');
  expect(container.querySelector('.world-card-base-open')?.getAttribute('aria-label')).toContain('On Going');

  act(() => root.render(<WorldCard world={world} displayStatus={{ view: 'public', value: 'completed' }} onOpen={() => {}} />));
  expect(details()).toBe('Xianxia · Ch. 24 · Completed');

  act(() => root.render(<WorldCard world={{ ...world, draft: false }} displayStatus={{ view: 'library', value: 'draft' }} onOpen={() => {}} />));
  expect(details()).toBe('Xianxia · Ch. 24 · Draft');

  act(() => root.render(<WorldCard world={world} displayStatus={{ view: 'library', value: 'complete' }} onOpen={() => {}} />));
  expect(details()).toBe('Xianxia · Ch. 24 · Complete');
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

  act(() => root.render(<WorldCard world={{ ...world, creatorName: undefined, format: undefined, genre: '' }} onOpen={() => {}} />));
  expect(container.querySelector('.world-card-base-creator')).toBeNull();
  expect(container.querySelector('.world-card-caption-details')?.textContent).toBe('Ch. 24');

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
  expect(container.textContent).toContain('A lotus blooms.');

  act(() => root.render(<WorldCardInfo story={{ ...story, cultivationRate: undefined, imageUrl: '' }} />));
  expect(container.textContent).not.toContain('Cultivation Rate');
  expect(container.textContent).toContain('Cover unavailable');
  expect(container.querySelector('[data-world-card="info"]')).not.toBeNull();

  // The public Info view shows no owner or acquisition states; only the viewer's own Recently read.
  for (const variant of [{ acquired: true }, { acquired: false }, { draft: true }]) {
    act(() => root.render(<WorldCardInfo story={{ ...story, ...variant }} />));
    for (const ownerState of ['Sealed', 'Unacquired', 'Draft']) expect(container.textContent).not.toContain(ownerState);
  }
  act(() => root.render(<WorldCardInfo story={{ ...story, acquired: false, draft: true, recentlyRead: true }} />));
  const status = container.querySelector('[aria-label="Story status"]')?.textContent;
  expect(status).toContain('Recently read');
  expect(status).not.toContain('Draft');
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
  expect(container.querySelector('[data-world-info-chapters]')?.textContent).toContain('Continue · Ch. 7');
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

it('turns the Chapters card into Start Story for a story with no chapters that the host can start', () => {
  const onRead = vi.fn();
  const onStart = vi.fn();
  act(() => root.render(<WorldCardInfo story={{ ...infoStory, chapterCount: 0, currentArc: '' }} onRead={onRead} onStart={onStart} />));
  const start = container.querySelector<HTMLElement>('[role="button"][data-world-info-chapters="action"]')!;
  expect(start.textContent).toContain('No chapters yet');
  expect(start.textContent).toContain('Start Story');
  expect(start.getAttribute('aria-label')).toBe('Start Story: The Last Lotus, No chapters yet');
  act(() => start.click());
  expect(onStart).toHaveBeenCalledTimes(1);
  expect(onRead).not.toHaveBeenCalled();

  // Once the story has chapters, the same card reads them; Start Story is gone.
  act(() => root.render(<WorldCardInfo story={infoStory} onRead={onRead} onStart={onStart} />));
  const read = container.querySelector<HTMLElement>('[role="button"][data-world-info-chapters="action"]')!;
  expect(read.textContent).toContain('Start Reading');
  expect(read.textContent).not.toContain('Start Story');
  act(() => read.click());
  expect(onRead).toHaveBeenCalledTimes(1);
  expect(onStart).toHaveBeenCalledTimes(1);
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
  expect(container.textContent).not.toContain('Draft');
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
  expect(identity.textContent).not.toContain('Sealed');
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

it('spotlights a world in the wide Feature card with its cover, sash, details and synopsis', () => {
  const onOpen = vi.fn();
  act(() => root.render(<WorldCardFeature world={{ ...world, synopsis: 'A lotus blooms.', branchingEnabled: true }}
    displayStatus={{ view: 'public', value: 'ongoing' }} senSash onOpen={onOpen} />));
  const card = container.querySelector<HTMLElement>('[data-world-card="feature"]')!;
  expect(card.querySelector('.world-card-banner-eyebrow')?.textContent).toBe('Featured');
  expect(card.querySelector('h3')?.textContent).toBe('The Last Lotus');
  expect(card.querySelector('.world-card-banner-byline')?.textContent).toBe('bySENSEI');
  expect(card.querySelector('.world-card-banner-details')?.textContent).toBe('Xianxia · Ch. 24 · On Going');
  expect(card.querySelector('.world-card-banner-synopsis')?.textContent).toBe('A lotus blooms.');
  expect(card.querySelector('.world-card-feature')?.textContent).toBe('Branching');
  expect(card.querySelector('.world-card-banner-cover img')?.getAttribute('src')).toBe('/lotus.png');
  expect(card.querySelector('.world-card-banner-cover .world-card-ribbon')).not.toBeNull();
  expect(card.style.getPropertyValue('--world-card-banner-art')).toBe('url("/lotus.png")');
  const open = card.querySelector<HTMLButtonElement>('.world-card-banner-open')!;
  expect(open.getAttribute('aria-label')).toBe('Open The Last Lotus, 24 chapters, creator SENSEI, On Going');
  act(() => open.click());
  expect(onOpen).toHaveBeenCalledOnce();

  act(() => root.render(<WorldCardFeature world={{ ...world, synopsis: undefined, creatorName: undefined }} label="New on SEN" onOpen={() => {}} />));
  expect(container.querySelector('.world-card-banner-eyebrow')?.textContent).toBe('New on SEN');
  expect(container.querySelector('.world-card-banner-synopsis')).toBeNull();
  expect(container.querySelector('.world-card-banner-byline')).toBeNull();
  expect(container.querySelector('.world-card-ribbon')).toBeNull();
  expect(container.querySelector('video')).toBeNull();
});

it('loops the world’s own motion picture, muted, behind the Feature card', () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  act(() => root.render(<WorldCardFeature world={{ ...world, videoUrl: '/lotus.mp4' }} onOpen={() => {}} />));
  const video = container.querySelector<HTMLVideoElement>('.world-card-banner-video')!;
  expect(video.getAttribute('src')).toBe('/lotus.mp4');
  expect(video.getAttribute('poster')).toBe('/lotus.png');
  expect(video.loop).toBe(true);
  expect(video.muted).toBe(true);
  expect(video.getAttribute('aria-hidden')).toBe('true');
  expect(play).toHaveBeenCalled();
  // The still cover stays on the right.
  expect(container.querySelector('.world-card-banner-cover img')?.getAttribute('src')).toBe('/lotus.png');
  play.mockRestore();
});
