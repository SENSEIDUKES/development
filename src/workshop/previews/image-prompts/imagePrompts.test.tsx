// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildStoryCoverPrompt } from '../../../server/story-cover/prompt';
import { fingerprintText } from '../writer-instructions/writerInstructions';
import { DEFAULT_IMAGE_MODEL, IMAGE_MODELS } from '@seihouse/library/model-router-server';
import { COVER_DEFAULT_MODEL_LABEL, COVER_PROMPT_SHAPE, IMAGE_KINDS, IMAGE_PROMPTS } from './imagePrompts';
import { IMAGE_PROMPTS_HISTORY, lastChange } from './imagePromptsHistory';
import { ImagePromptsWorkspace } from './ImagePromptsWorkspace';
import { DEVELOPMENT_ACCESS_TOKEN_KEY } from '../../../host/generation/accessToken';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('The Image Prompts page', () => {
  it.each(IMAGE_PROMPTS.map(prompt => [prompt.id, prompt] as const))('records every change to "%s" in the dated history', (id, prompt) => {
    const fingerprint = fingerprintText(prompt.text);
    expect(lastChange(id)?.changed[id], `"${prompt.title}" changed. Add an entry at the top of IMAGE_PROMPTS_HISTORY (src/workshop/previews/image-prompts/imagePromptsHistory.ts) with today's date, what changed and why in plain words, and '${id}': '${fingerprint}'.`).toBe(fingerprint);
  });

  it('keeps the history well formed: dates newest first, a real summary, only known prompts', () => {
    const ids = new Set(IMAGE_PROMPTS.map(prompt => prompt.id));
    IMAGE_PROMPTS_HISTORY.forEach((change, index) => {
      expect(change.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (index > 0) expect(change.date <= IMAGE_PROMPTS_HISTORY[index - 1].date).toBe(true);
      expect(change.summary.length).toBeGreaterThan(20);
      for (const id of Object.keys(change.changed)) expect(ids.has(id as never), id).toBe(true);
    });
  });

  it('shows the cover prompt the server builds, never a copy', () => {
    const cover = IMAGE_PROMPTS.find(prompt => prompt.id === 'cover')!;
    expect(cover.text).toBe(COVER_PROMPT_SHAPE);
    expect(cover.text).toBe(buildStoryCoverPrompt({
      title: '{title}', genre: '{genre}', style: 'chinese', synopsis: '{logline, else premise}',
      mainCharacter: '{main character}', tone: '{tone}', world: '{world facts}', tags: ['{story tags}'],
    }));
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

  it('sends a prompt card to the Image Lab, makes the image with the saved token and shows it', async () => {
    window.localStorage.setItem(DEVELOPMENT_ACCESS_TOKEN_KEY, 'owner-token');
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/model-router') return Response.json({ capabilities: [{ id: 'images', defaultModel: DEFAULT_IMAGE_MODEL, models: IMAGE_MODELS.map(model => ({ ...model, available: true })) }] });
      return Response.json({ image: btoa('png-bytes'), mimeType: 'image/png', model: JSON.parse(String(init?.body)).model, durationMs: 4200 });
    });
    const { container, unmount } = await renderPage(fetcher as unknown as typeof fetch);
    const cover = container.querySelector('[data-image-prompt="cover"]')!;
    const tryButton = [...cover.querySelectorAll('button')].find(button => button.textContent === 'Try this prompt')!;
    act(() => tryButton.click());
    const lab = container.querySelector<HTMLElement>('[data-image-lab]')!;
    expect(lab.closest<HTMLElement>('[role="tabpanel"]')!.hidden).toBe(false);
    expect(lab.querySelector('textarea')!.value).toBe(COVER_PROMPT_SHAPE);
    expect(lab.querySelectorAll('select')[1].value).toBe('2:3');
    expect(lab.textContent).toContain('Replace them with real words first');

    const make = [...lab.querySelectorAll('button')].find(button => button.textContent === 'Make image')!;
    await act(async () => make.click());
    const call = fetcher.mock.calls.find(([url]) => url === '/api/image-lab')!;
    expect(new Headers(call[1]!.headers).get('Authorization')).toBe('Bearer owner-token');
    expect(JSON.parse(String(call[1]!.body))).toEqual({ prompt: COVER_PROMPT_SHAPE, model: DEFAULT_IMAGE_MODEL, aspectRatio: '2:3' });
    expect(lab.querySelector('img')?.getAttribute('src')).toBe('blob:image-1');
    expect(lab.querySelector('a[download]')?.getAttribute('download')).toMatch(/\.png$/);
    expect(lab.querySelector('figcaption')?.textContent).toContain(COVER_DEFAULT_MODEL_LABEL);
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

async function renderPage(fetcher?: typeof fetch) {
  const fallback = (async () => Response.json({ capabilities: [] })) as unknown as typeof fetch;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<ImagePromptsWorkspace fetcher={fetcher ?? fallback} />));
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}
