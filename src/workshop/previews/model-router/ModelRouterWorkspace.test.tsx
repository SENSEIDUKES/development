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
const click = (element: HTMLElement) => act(async () => element.click());
const provider = (id: string) => document.querySelector<HTMLButtonElement>(`[data-provider="${id}"]`)!;
const row = (id: string) => document.querySelector<HTMLButtonElement>(`[data-model="${id}"] button`);
const listedModels = () => [...document.querySelectorAll('[data-model]')].map(item => item.getAttribute('data-model'));

it('opens from the gear, separated into Chapters, Images and TTS', async () => {
  await openRouter({ GEMINI_API_KEY: 'g' });
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[aria-label="Router capabilities"] [role="tab"]')];
  expect(tabs.map(tab => tab.textContent)).toEqual(['Chapters', 'Images', 'TTS']);
  await click(tabs[2]);
  expect(document.querySelector('[data-model="eleven_multilingual_v2"] [aria-label="Selected"]')).not.toBeNull();
  expect(row('eleven_v3')).toBeNull();
});

it('shows one provider at a time, starting with the provider of the selected model', async () => {
  await openRouter({ GEMINI_API_KEY: 'g', 'OpenRouter-Dev': 'o' });
  expect(provider('gemini').getAttribute('aria-selected')).toBe('true');
  expect(listedModels().every(id => id!.startsWith('google/'))).toBe(true);
  await click(provider('openrouter'));
  expect(listedModels()).toEqual(['openrouter/openai/gpt-6-luna', 'openrouter/openai/gpt-6-luna-pro']);
});

it('selects a chapter model, saves it, and blocks models without a key', async () => {
  await openRouter({ GEMINI_API_KEY: 'g' });
  expect(row('google/gemini-3.1-flash-lite')!.getAttribute('aria-checked')).toBe('true');
  await click(row('google/gemini-3.8-flash')!);
  expect(readModelPreference('chapters')).toBe('google/gemini-3.8-flash');
  expect(row('google/gemini-3.8-flash')!.getAttribute('aria-checked')).toBe('true');
  expect(row('google/gemini-3.1-flash-lite')!.getAttribute('aria-checked')).toBe('false');
  await click(provider('openrouter'));
  expect(document.body.textContent).toContain('Add OpenRouter-Dev in Vercel');
  expect(row('openrouter/openai/gpt-6-luna')!.disabled).toBe(true);
});

it('lists what uses each capability and whether it follows the router', async () => {
  await openRouter({ GEMINI_API_KEY: 'g' });
  const usedBy = document.querySelector('[aria-label="Used by"]')!.textContent;
  expect(usedBy).toContain('Harness Generation');
  expect(usedBy).toContain('follows router');
  expect(usedBy).toContain('Story Seed Blueprint');
  expect(usedBy).toContain('server default');
});

it('lets GPT-6 Luna be selected once the OpenRouter key exists, and closes with Escape', async () => {
  await openRouter({ GEMINI_API_KEY: 'g', 'OpenRouter-Dev': 'o' });
  await click(provider('openrouter'));
  await click(row('openrouter/openai/gpt-6-luna')!);
  expect(readModelPreference('chapters')).toBe('openrouter/openai/gpt-6-luna');
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
