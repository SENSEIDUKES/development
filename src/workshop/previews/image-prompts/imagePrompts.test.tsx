// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildStoryCoverPrompt } from '../../../server/story-cover/prompt';
import { fingerprintText } from '../writer-instructions/writerInstructions';
import { DEFAULT_IMAGE_MODEL, IMAGE_MODELS } from '@seihouse/library/model-router-server';
import { COVER_DEFAULT_MODEL_LABEL, COVER_PROMPT_TEMPLATE, COVER_TITLE_OFF, COVER_TITLE_ON, IMAGE_KINDS, IMAGE_PROMPTS, PROFILE_PICTURE_PROMPT, RETIRED_IMAGE_PROMPTS } from './imagePrompts';
import { IMAGE_PROMPTS_HISTORY, lastChange } from './imagePromptsHistory';
import { ImagePromptsWorkspace } from './ImagePromptsWorkspace';
import { DEVELOPMENT_ACCESS_TOKEN_KEY } from '../../../host/generation/accessToken';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('The Image Prompts page', () => {
  it.each(IMAGE_PROMPTS.map(prompt => [prompt.id, prompt] as const))('records every change to "%s" in the dated history', (id, prompt) => {
    const fingerprint = fingerprintText(prompt.text);
    expect(lastChange(id)?.changed[id], `"${prompt.title}" changed. Add an entry at the top of IMAGE_PROMPTS_HISTORY (src/workshop/previews/image-prompts/imagePromptsHistory.ts) with today's date, what changed and why in plain words, and '${id}': '${fingerprint}'.`).toBe(fingerprint);
  });

  it('keeps the history well formed: dates newest first, a real summary, only known or retired prompts', () => {
    const ids = new Set<string>([...IMAGE_PROMPTS.map(prompt => prompt.id), ...Object.keys(RETIRED_IMAGE_PROMPTS)]);
    IMAGE_PROMPTS_HISTORY.forEach((change, index) => {
      expect(change.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (index > 0) expect(change.date <= IMAGE_PROMPTS_HISTORY[index - 1].date).toBe(true);
      expect(change.summary.length).toBeGreaterThan(20);
      for (const id of Object.keys(change.changed)) expect(ids.has(id), id).toBe(true);
    });
  });

  it('shows the approved cover template with both title instructions', () => {
    const text = (id: string) => IMAGE_PROMPTS.find(prompt => prompt.id === id)?.text;
    expect(text('cover')).toBe(COVER_PROMPT_TEMPLATE);
    expect(text('cover')).toContain('{title instruction}');
    expect(text('cover-title-on')).toBe(COVER_TITLE_ON);
    expect(text('cover-title-off')).toBe(COVER_TITLE_OFF);
  });

  it('shows the cover template the server fills, never a copy', () => {
    const story = { title: 'The Drowned Name', style: 'chinese', synopsis: 'A courier returns.', tags: ['revenge'] };
    const prompt = buildStoryCoverPrompt(story);
    expect(prompt).toContain('Title: The Drowned Name');
    expect(prompt).toContain('Tradition: Chinese webnovel');
    expect(prompt).toContain(COVER_TITLE_ON.replace('{title}', 'The Drowned Name'));
    expect(prompt).not.toContain('Genre:');
    expect(buildStoryCoverPrompt(story, { title: false })).toContain(COVER_TITLE_OFF);
    expect(IMAGE_PROMPTS.some(entry => entry.id === ('cover-current' as never))).toBe(false);
  });

  it('names the Model Router\'s default image model for covers', () => {
    expect(COVER_DEFAULT_MODEL_LABEL).toBe(IMAGE_MODELS.find(model => model.id === DEFAULT_IMAGE_MODEL)?.label);
  });

  it('lists every kind of image, with each prompt\'s words and every rule', async () => {
    const { container, unmount } = await renderPage();
    for (const kind of IMAGE_KINDS) expect(container.querySelector(`[data-image-kind="${kind.id}"] h2`)?.textContent).toBe(kind.title);
    for (const prompt of IMAGE_PROMPTS) expect(container.querySelector(`[data-image-prompt="${prompt.id}"] pre`)?.textContent).toBe(prompt.text);
    expect(container.querySelector('[data-image-ideas]')?.textContent).toContain('across the ages');
    unmount();
  });

  it('opens one kind at a time from the tab row, and the keys move between tabs', async () => {
    const { container, unmount } = await renderPage();
    const tab = (id: string) => container.querySelector<HTMLButtonElement>(`[role="tab"][data-tab="${id}"]`)!;
    const visibleKind = () => [...container.querySelectorAll<HTMLElement>('[role="tabpanel"]')].filter(panel => !panel.hidden).map(panel => panel.id);
    expect(visibleKind()).toEqual(['image-prompts-panel-cover']);
    expect(tab('cover').getAttribute('aria-selected')).toBe('true');
    act(() => tab('codex-portraits').click());
    expect(visibleKind()).toEqual(['image-prompts-panel-codex-portraits']);
    act(() => tab('codex-portraits').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(visibleKind()).toEqual(['image-prompts-panel-codex-places']);
    expect(document.activeElement).toBe(tab('codex-places'));
    unmount();
  });

  it('sends the profile picture prompt to the Image Lab with a photo, makes three and lets one be chosen', async () => {
    window.localStorage.setItem(DEVELOPMENT_ACCESS_TOKEN_KEY, 'owner-token');
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/model-router') return Response.json({ capabilities: [{ id: 'images', defaultModel: DEFAULT_IMAGE_MODEL, models: IMAGE_MODELS.map(model => ({ ...model, available: true })) }] });
      return Response.json({ image: btoa('png-bytes'), mimeType: 'image/png', model: JSON.parse(String(init?.body)).model, durationMs: 4200 });
    });
    const { container, unmount } = await renderPage(fetcher as unknown as typeof fetch);
    const profile = container.querySelector('[data-image-prompt="profile-picture"]')!;
    act(() => [...profile.querySelectorAll('button')].find(button => button.textContent === 'Try this prompt')!.click());
    const lab = container.querySelector<HTMLElement>('[data-image-lab]')!;
    expect(lab.closest<HTMLElement>('[role="tabpanel"]')!.hidden).toBe(false);
    expect(lab.querySelector('textarea')!.value).toBe(PROFILE_PICTURE_PROMPT);
    const [, shape, variations] = lab.querySelectorAll('select');
    expect(shape.value).toBe('1:1');
    expect(variations.value).toBe('3');

    const file = new File(['photo-bytes'], 'me.jpg', { type: 'image/jpeg' });
    const input = lab.querySelector<HTMLInputElement>('[data-image-lab-file]')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    act(() => { input.dispatchEvent(new Event('change', { bubbles: true })); });
    await waitFor(() => lab.querySelector('[data-image-lab-attachment]'));
    expect(lab.querySelector('[data-image-lab-attachment]')?.textContent).toContain('me.jpg');

    await act(async () => [...lab.querySelectorAll('button')].find(button => button.textContent === 'Make 3 images')!.click());
    const calls = fetcher.mock.calls.filter(([url]) => url === '/api/image-lab');
    expect(calls).toHaveLength(3);
    expect(new Headers(calls[0][1]!.headers).get('Authorization')).toBe('Bearer owner-token');
    expect(JSON.parse(String(calls[0][1]!.body))).toEqual({
      prompt: PROFILE_PICTURE_PROMPT, model: DEFAULT_IMAGE_MODEL, aspectRatio: '1:1',
      images: [{ data: btoa('photo-bytes'), mimeType: 'image/jpeg' }],
    });
    const made = lab.querySelectorAll('[data-image-lab-try] figure img');
    expect(made).toHaveLength(3);
    expect(lab.querySelector('[data-image-lab-try]')?.textContent).toContain('with me.jpg');
    expect(lab.querySelector('figcaption')?.textContent).toContain(COVER_DEFAULT_MODEL_LABEL);

    const chooseButtons = () => [...lab.querySelectorAll<HTMLButtonElement>('[data-image-lab-try] button[aria-pressed]')];
    act(() => chooseButtons()[1].click());
    expect(chooseButtons().map(button => button.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    expect(lab.querySelectorAll('[data-chosen]')).toHaveLength(1);
    unmount();
  });

  it('makes one image for prompts that are simply what the reader gets', async () => {
    window.localStorage.setItem(DEVELOPMENT_ACCESS_TOKEN_KEY, 'owner-token');
    const fetcher = vi.fn(async (url: string) => url === '/api/model-router'
      ? Response.json({ capabilities: [] })
      : Response.json({ image: btoa('png-bytes'), mimeType: 'image/png', model: DEFAULT_IMAGE_MODEL, durationMs: 1000 }));
    const { container, unmount } = await renderPage(fetcher as unknown as typeof fetch);
    const codex = container.querySelector('[data-image-prompt="old-codex-character"]')!;
    act(() => [...codex.querySelectorAll('button')].find(button => button.textContent === 'Try this prompt')!.click());
    const lab = container.querySelector<HTMLElement>('[data-image-lab]')!;
    expect(lab.querySelectorAll('select')[2].value).toBe('1');
    await act(async () => [...lab.querySelectorAll('button')].find(button => button.textContent === 'Make image')!.click());
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/image-lab')).toHaveLength(1);
    expect(lab.querySelector('button[aria-pressed]')).toBeNull();
    unmount();
  });

  it('asks for the access token before making an image, and shows the server\'s reason when one fails', async () => {
    const fetcher = vi.fn(async (url: string) => url === '/api/model-router'
      ? Response.json({ capabilities: [] })
      : Response.json({ error: 'The image could not be made: blocked by safety.' }, { status: 502 }));
    const { container, unmount } = await renderPage(fetcher as unknown as typeof fetch);
    act(() => container.querySelector<HTMLButtonElement>('[data-tab="lab"]')!.click());
    const lab = container.querySelector<HTMLElement>('[data-image-lab]')!;
    const make = () => [...lab.querySelectorAll('button')].find(button => button.textContent === 'Make image')!;
    const textarea = lab.querySelector('textarea')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, 'A lantern in the rain');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(make().disabled).toBe(true);
    const token = lab.querySelector<HTMLInputElement>('input[type="password"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(token, 'owner-token');
      token.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => [...lab.querySelectorAll('button')].find(button => button.textContent === 'Save')!.click());
    expect(window.localStorage.getItem(DEVELOPMENT_ACCESS_TOKEN_KEY)).toBe('owner-token');
    expect(make().disabled).toBe(false);
    await act(async () => make().click());
    expect(lab.querySelector('[role="alert"]')?.textContent).toBe('The image could not be made: blocked by safety.');
    expect(lab.querySelector('img')).toBeNull();
    unmount();
  });
});

let objectUrls = 0;
URL.createObjectURL = () => `blob:image-${++objectUrls}`;
URL.revokeObjectURL = () => undefined;

afterEach(() => {
  window.localStorage.clear();
  objectUrls = 0;
});

/** Reading a file is asynchronous: wait for what it shows. */
async function waitFor<T>(find: () => T | null | undefined): Promise<T> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const found = find();
    if (found) return found;
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
  }
  throw new Error('Waited too long.');
}

async function renderPage(fetcher?: typeof fetch) {
  const fallback = (async () => Response.json({ capabilities: [] })) as unknown as typeof fetch;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<ImagePromptsWorkspace fetcher={fetcher ?? fallback} />));
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}
