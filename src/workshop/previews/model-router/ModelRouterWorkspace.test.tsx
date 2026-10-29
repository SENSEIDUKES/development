// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ModelRouterGear } from '../../ModelRouterSettings';
import { readModelPreference, readReasoningPreference, readTaggerPreference } from '../../../host/generation/modelPreference';
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

it('opens from the gear with tabs for each model capability', async () => {
  await openRouter({ GEMINI_API_KEY: 'g' });
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[aria-label="Router capabilities"] [role="tab"]')];
  expect(tabs.map(tab => tab.textContent)).toEqual(['Chapters', 'Images', 'TTS', 'Audio', 'Video', '3D']);
  await click(tabs[2]);
  expect(document.querySelector('[data-model="eleven_multilingual_v2"] [aria-label="Selected"]')).not.toBeNull();
  expect(row('eleven_v3')).toBeNull();
});

it('selects and remembers direct MiniMax writing and image models, and shows executable video models', async () => {
  await openRouter({ Minimax: 'secret' });
  await click(provider('minimax'));
  expect(listedModels()).toHaveLength(9);
  await click(row('minimax/MiniMax-M2.7')!);
  expect(readModelPreference('chapters')).toBe('minimax/MiniMax-M2.7');
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[aria-label="Router capabilities"] [role="tab"]')];
  await click(tabs[1]);
  await click(provider('minimax'));
  await click(row('minimax/image-01')!);
  expect(readModelPreference('images')).toBe('minimax/image-01');
  await click(tabs[4]);
  await click(provider('minimax'));
  expect(listedModels()).toHaveLength(11);
  expect(document.querySelector('[data-model="minimax/MiniMax-H3"]')!.textContent).not.toContain('Catalog only');
  expect(document.body.textContent).toContain('No Workshop feature generates video yet');
  expect(document.body.textContent).not.toContain('secret');
});

it('shows one provider at a time, starting with the provider of the selected model', async () => {
  await openRouter({ GEMINI_API_KEY: 'g', 'OpenRouter-Dev': 'o' });
  expect(provider('gemini').getAttribute('aria-selected')).toBe('true');
  expect(listedModels().every(id => id!.startsWith('google/'))).toBe(true);
  await click(provider('openrouter'));
  expect(listedModels()).toEqual([
    'openrouter/openai/gpt-6-luna', 'openrouter/openai/gpt-6-luna-pro',
    'openrouter/z-ai/glm-5.3-flash', 'openrouter/qwen/qwen3.8-flash',
    'openrouter/minimax/minimax-m2.7', 'openrouter/arcee-ai/trinity-large-thinking',
    'openrouter/deepseek/deepseek-v4.1-flash', 'openrouter/google/gemini-3.8-flash',
    'openrouter/anthropic/claude-haiku-5.5',
  ]);
  for (const id of listedModels()) {
    await click(row(id!)!);
    expect(readModelPreference('chapters')).toBe(id);
    expect(row(id!)!.getAttribute('aria-checked')).toBe('true');
  }
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

it('tunes the selected model\'s reasoning from Advanced settings', async () => {
  await openRouter({ GEMINI_API_KEY: 'g' });
  await click(row('google/gemini-3.8-flash')!);
  await click(document.querySelector<HTMLButtonElement>('[aria-label="Advanced settings"]')!);
  const levels = () => [...document.querySelectorAll<HTMLButtonElement>('[aria-label="Reasoning level"] button')];
  expect(levels().map(button => button.textContent)).toEqual(['Default (low)', 'low', 'medium', 'high']);
  await click(levels().find(button => button.textContent === 'high')!);
  expect(readReasoningPreference('google/gemini-3.8-flash')).toBe('high');
  expect(document.querySelector('[data-model="google/gemini-3.8-flash"]')?.textContent).toContain('high');
  await click(levels()[0]);
  expect(readReasoningPreference('google/gemini-3.8-flash')).toBeUndefined();
});

it('chooses the Chapter Tagger\'s own model and reasoning level, apart from the chapter model\'s', async () => {
  await openRouter({ GEMINI_API_KEY: 'g' });
  const select = () => document.querySelector<HTMLSelectElement>('[aria-label="Chapter Tagger model"]')!;
  const levels = () => [...document.querySelectorAll<HTMLButtonElement>('[aria-label="Chapter Tagger reasoning level"] button')];
  // By default the chapter's own writer tags, thinking as little as it allows.
  expect(select().value).toBe('');
  expect(select().options[0].textContent).toContain('Same as chapters (Gemini 3.1 Flash Lite)');
  expect(levels().map(button => button.textContent)).toEqual(['Default (minimal)', 'minimal', 'low', 'medium', 'high']);
  expect(readTaggerPreference()).toEqual({});
  // A cheap model with high reasoning, the owner's experiment.
  await act(async () => {
    select().value = 'google/gemini-3.5-flash-lite';
    select().dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(readTaggerPreference()).toEqual({ model: 'google/gemini-3.5-flash-lite' });
  await click(levels().find(button => button.textContent === 'high')!);
  expect(readTaggerPreference()).toEqual({ model: 'google/gemini-3.5-flash-lite', reasoningLevel: 'high' });
  // The chapter model's own level is untouched by the tagger's.
  expect(readReasoningPreference('google/gemini-3.5-flash-lite')).toBeUndefined();
  expect(readModelPreference('chapters')).toBeUndefined();
  // Back to the chapter's writer, keeping the level.
  await act(async () => {
    select().value = '';
    select().dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(readTaggerPreference()).toEqual({ reasoningLevel: 'high' });
  // A model without a key is never offered to the tagger.
  expect([...select().options].some(option => option.value.startsWith('openrouter/'))).toBe(false);
});
