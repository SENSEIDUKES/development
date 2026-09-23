// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ModelRouterGear } from '../../ModelRouterSettings';
import { readModelPreference } from '../../../host/generation/modelPreference';
import { modelRouterStatus } from '../../../server/model-router/status';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  localStorage.clear();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

const openRouter = async (environment: Record<string, string>) => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(modelRouterStatus(environment)), { status: 200 })));
  await act(async () => root.render(<ModelRouterGear />));
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Model Router settings"]')!.click());
};
const row = (id: string) => document.querySelector<HTMLButtonElement>(`[data-model="${id}"] button`)!;

it('opens from the gear, separated into Chapters, Images and TTS', async () => {
  await openRouter({ GEMINI_API_KEY: 'g' });
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  expect(tabs.map(tab => tab.textContent)).toEqual(['Chapters', 'Images', 'TTS']);
  expect(document.body.textContent).toContain('needs OpenRouter-Dev');
  await act(async () => tabs[2].click());
  expect(document.querySelector('[data-model="eleven_multilingual_v2"]')?.textContent).toContain('Selected');
  expect(document.querySelector('[data-model="eleven_v3"] button')).toBeNull();
});

it('selects a chapter model, saves it, and blocks models without a key', async () => {
  await openRouter({ GEMINI_API_KEY: 'g' });
  expect(row('google/gemini-3.1-flash-lite').getAttribute('aria-checked')).toBe('true');
  await act(async () => row('google/gemini-3.8-flash').click());
  expect(readModelPreference('chapters')).toBe('google/gemini-3.8-flash');
  expect(row('google/gemini-3.8-flash').getAttribute('aria-checked')).toBe('true');
  expect(row('google/gemini-3.1-flash-lite').getAttribute('aria-checked')).toBe('false');
  expect(row('openrouter/openai/gpt-6-luna').disabled).toBe(true);
});

it('lets GPT-6 Luna be selected once the OpenRouter key exists, and closes with Escape', async () => {
  await openRouter({ GEMINI_API_KEY: 'g', 'OpenRouter-Dev': 'o' });
  await act(async () => row('openrouter/openai/gpt-6-luna').click());
  expect(readModelPreference('chapters')).toBe('openrouter/openai/gpt-6-luna');
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
