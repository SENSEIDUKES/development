// @vitest-environment jsdom
import { quotedEnergyGrade } from '@seihouse/library/energy';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ModelRouterGear } from '../../../host/model-router/ModelRouterSettings';
import { readExactModel, readModelPreference, readReasoningPreference, readTaggerPreference, readTextRolePreference, readTierPreference, writeModelPreference } from '../../../host/generation/modelPreference';
import { recordUsage } from '../../../host/usage/usageLog';
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
const select = (name: string) => document.querySelector<HTMLSelectElement>('select[aria-label="' + name + '"]')!;
const pick = (name: string, value: string) => act(async () => {
  select(name).value = value;
  select(name).dispatchEvent(new Event('change', { bubbles: true }));
});
const switchJob = (job: string) => click([...document.querySelectorAll<HTMLButtonElement>('[aria-label="Text task"] button')].find(button => button.textContent === job)!);
const switchImageJob = (job: string) => click([...document.querySelectorAll<HTMLButtonElement>('[aria-label="Image task"] button')].find(button => button.textContent === job)!);
const row = (id: string) => document.querySelector<HTMLButtonElement>(`[data-model="${id}"] button`);
const listedModels = () => [...document.querySelectorAll('[data-model]')].map(item => item.getAttribute('data-model'));

it('opens from the gear with a selector for each model capability', async () => {
  await openRouter({ GEMINI_API_KEY: 'g' });
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();

  expect([...select('Capability').options].map(option => option.textContent)).toEqual(['Text', 'Images', 'Text to speech', 'Live speech', 'Meaning', 'Audio', 'Video', '3D']);
  await pick('Capability', 'tts');
  expect(document.querySelector('[data-model="eleven_multilingual_v2"] [aria-label="Selected"]')).not.toBeNull();
  expect(row('eleven_v3')).toBeNull();
});

it('selects and remembers direct MiniMax writing and image models, and shows executable video models', async () => {
  await openRouter({ Minimax: 'secret' });
  await pick('Provider', 'minimax');
  expect(listedModels()).toHaveLength(9);
  await click(row('minimax/MiniMax-M2.7')!);
  expect(readModelPreference('chapters')).toBe('minimax/MiniMax-M2.7');

  await pick('Capability', 'images');
  await pick('Provider', 'minimax');
  await click(row('minimax/MiniMax-H3-Image')!);
  expect(readModelPreference('images')).toBe('minimax/MiniMax-H3-Image');
  await pick('Capability', 'tts');
  await pick('Provider', 'minimax');
  expect(listedModels()).toHaveLength(8);
  expect(document.querySelector('[data-model="minimax/speech-2.8-hd"]')!.textContent).not.toContain('Catalog only');
  await pick('Capability', 'video');
  await pick('Provider', 'minimax');
  expect(listedModels()).toHaveLength(13);
  expect(document.querySelector('[data-model="minimax/MiniMax-H3"]')!.textContent).not.toContain('Catalog only');
  expect(document.body.textContent).toContain('No Workshop feature generates video yet');
  expect(document.body.textContent).not.toContain('secret');
});

it('chooses the live speech model the Familiar\'s live talk uses, from the providers with a key', async () => {
  await openRouter({ GEMINI_API_KEY: 'g', OPENAI_API_KEY: 'o' });

  await pick('Capability', 'live');
  // GPT-Live serves by default when its key is set.
  expect(select('Provider').value).toBe('openai');
  expect(row('openai/gpt-live-1')!.getAttribute('aria-pressed')).toBe('true');
  expect(document.body.textContent).toContain('Familiar\'s live talk');
  await pick('Provider', 'gemini');
  await click(row('google/gemini-3.8-live')!);
  expect(readModelPreference('live')).toBe('google/gemini-3.8-live');
  // Read aloud is its own tab, set on the server.
  await pick('Capability', 'tts');
  expect(document.querySelector('[data-model="eleven_v3"] button')).toBeNull();
});

it('grades rounded Text and Image quotes at their inclusive cutoffs', () => {
  expect([0, 2, 3, 8, 9].map(n => quotedEnergyGrade('chapter', n))).toEqual(['mortal', 'mortal', 'immortal', 'immortal', 'heaven']);
  expect([0, 5, 6, 12, 13].map(n => quotedEnergyGrade('image', n))).toEqual(['mortal', 'mortal', 'immortal', 'immortal', 'heaven']);
});

it('selects the model and its quoted tier together', async () => {
  await openRouter({ GEMINI_API_KEY: 'g', ANTHROPIC_API_KEY: 'a', OPENAI_API_KEY: 'o', 'OpenRouter-Dev': 'r' });
  const tier = (grade: string) => document.querySelector<HTMLButtonElement>('[data-tier="' + grade + '"]')!;
  await pick('Provider', 'gemini');
  await click(row('google/gemini-3.8-flash')!);
  expect(readTierPreference('chapters')).toBe('immortal');
  expect(readModelPreference('chapters')).toBe('google/gemini-3.8-flash');
  await pick('Provider', 'openrouter');
  await click(row('openrouter/openai/gpt-6-luna')!);
  expect(readExactModel('chapters')).toBe('openrouter/openai/gpt-6-luna');
  expect(readTierPreference('chapters')).toBeUndefined();
  await pick('Capability', 'images');
  await pick('Provider', 'openai');
  await click(row('openai/gpt-image-2.6-flare')!);
  expect(readTierPreference('images')).toBe('immortal');
  await pick('Capability', 'live');
  expect(tier('heaven').disabled).toBe(true);
  expect(tier('immortal').querySelector('[aria-label="From 10 Energy/min"] .energy-action-cost.energy-badge')).toBeTruthy();
});

it('selects and prices cover and Codex images independently, including after reopening', async () => {
  writeModelPreference('images', 'google/gemini-3-pro-image');
  await openRouter({ OPENAI_API_KEY: 'o', Minimax: 'm', GEMINI_API_KEY: 'g' });
  await pick('Capability', 'images');
  expect(row('google/gemini-3-pro-image')?.getAttribute('aria-pressed')).toBe('true');
  expect(document.querySelector('[aria-label="Used by"]')?.textContent).toContain('Profile Picture');
  await switchImageJob('Codex');
  expect(row('minimax/MiniMax-H3-Image')?.getAttribute('aria-pressed')).toBe('true');
  expect(document.querySelector('[aria-label="Used by"]')?.textContent).toContain('Codex Picture');
  await click(row('minimax/MiniMax-H3-Image-Highspeed')!);
  expect(readTierPreference('codex-images')).toBe('immortal');
  expect(readModelPreference('images')).toBe('google/gemini-3-pro-image');
  await switchImageJob('Cover art / profile');
  await pick('Provider', 'openai');
  await click(row('openai/gpt-image-2.6-flare')!);
  await click(document.querySelector<HTMLButtonElement>('[aria-label="Close Model Router"]')!);
  await click(container.querySelector<HTMLButtonElement>('[aria-label="Model Router settings"]')!);
  await pick('Capability', 'images');
  expect(row('openai/gpt-image-2.6-flare')?.getAttribute('aria-pressed')).toBe('true');
  await switchImageJob('Codex');
  expect(row('minimax/MiniMax-H3-Image-Highspeed')?.getAttribute('aria-pressed')).toBe('true');
});

it('uses the selected task’s reported workload, including thinking tokens, for the quote', async () => {
  recordUsage({ kind: 'chapter', inputTokens: 14_000, outputTokens: 7_000, totalTokens: 22_000 });
  recordUsage({ kind: 'blueprint', inputTokens: 10_000, outputTokens: 8_000 });
  await openRouter({ OPENAI_API_KEY: 'o' });
  await pick('Provider', 'openai');
  await click(row('openai/gpt-6-luna')!);
  expect(document.body.textContent).toContain('$0.0054 provider cost');
  expect(row('openai/gpt-6-luna')!.querySelector('[aria-label="Approximately 2 Energy"] .energy-action-cost.energy-badge')).toBeTruthy();
  await switchJob('Blueprint');
  await pick('Provider', 'openai');
  await pick('Blueprint model', 'openai/gpt-6-luna');
  expect(document.body.textContent).toContain('Last blueprint receipt');
  expect(document.body.textContent).toContain('$0.005 provider cost');
  expect(document.body.querySelector('[aria-label="Approximately 1 Energy"] .energy-action-cost.energy-badge')).toBeTruthy();
});

it('lets an ElevenLabs live model be picked exactly, once its key is set', async () => {
  await openRouter({ GEMINI_API_KEY: 'g', ELEVENLABS_API_KEY: 'e' });

  await pick('Capability', 'live');
  await pick('Provider', 'elevenlabs');
  expect(listedModels()).toEqual(['elevenlabs/eleven_realtime_v1_max', 'elevenlabs/eleven_realtime_v1_mini']);
  await click(row('elevenlabs/eleven_realtime_v1_max')!);
  expect(readModelPreference('live')).toBe('elevenlabs/eleven_realtime_v1_max');
});

it('shows one provider at a time, starting with the provider of the selected model', async () => {
  await openRouter({ GEMINI_API_KEY: 'g', 'OpenRouter-Dev': 'o' });
  expect(select('Provider').value).toBe('gemini');
  expect(listedModels().every(id => id!.startsWith('google/'))).toBe(true);
  await pick('Provider', 'openrouter');
  expect(listedModels()).toEqual([
    'openrouter/anthropic/claude-haiku-5.5', 'openrouter/deepseek/deepseek-v4.1-flash',
    'openrouter/google/gemini-3.8-flash', 'openrouter/z-ai/glm-5.3-flash',
    'openrouter/openai/gpt-6-luna', 'openrouter/openai/gpt-6-luna-pro',
    'openrouter/minimax/minimax-m2.7', 'openrouter/qwen/qwen3.8-flash',
    'openrouter/arcee-ai/trinity-large-thinking',
  ]);
  for (const id of listedModels()) {
    await click(row(id!)!);
    expect(readModelPreference('chapters')).toBe(id);
    expect(row(id!)!.getAttribute('aria-pressed')).toBe('true');
  }
});

it('selects a chapter model, saves it, and blocks models without a key', async () => {
  await openRouter({ GEMINI_API_KEY: 'g' });
  expect(row('google/gemini-3.1-flash-lite')!.getAttribute('aria-pressed')).toBe('true');
  await click(row('google/gemini-3.8-flash')!);
  expect(readModelPreference('chapters')).toBe('google/gemini-3.8-flash');
  expect(row('google/gemini-3.8-flash')!.getAttribute('aria-pressed')).toBe('true');
  expect(row('google/gemini-3.1-flash-lite')!.getAttribute('aria-pressed')).toBe('false');
  await pick('Provider', 'openrouter');
  expect(document.body.textContent).toContain('Add OpenRouter-Dev in Vercel');
  expect(row('openrouter/openai/gpt-6-luna')!.disabled).toBe(true);
});

it('lists what uses each capability and whether it follows the router', async () => {
  await openRouter({ GEMINI_API_KEY: 'g' });
  const usedBy = document.querySelector('[aria-label="Used by"]')!.textContent;
  expect(usedBy).toContain('Harness Generation');
  expect(usedBy).toContain('follows router');
  expect(usedBy).not.toContain('Story Seed Blueprint');
  expect(usedBy).toContain('server default');
});

it('lets GPT-6 Luna be selected once the OpenRouter key exists, and closes with Escape', async () => {
  await openRouter({ GEMINI_API_KEY: 'g', 'OpenRouter-Dev': 'o' });
  await pick('Provider', 'openrouter');
  await click(row('openrouter/openai/gpt-6-luna')!);
  expect(readModelPreference('chapters')).toBe('openrouter/openai/gpt-6-luna');
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it('keeps all three text jobs independent and remembers them after reopening', async () => {
  await openRouter({ GEMINI_API_KEY: 'g', OPENAI_API_KEY: 'o', ANTHROPIC_API_KEY: 'a' });
  expect(row('anthropic/claude-haiku-5-5')?.getAttribute('aria-pressed')).toBe('true');
  expect(select('Reasoning').options[0].textContent).toBe('Default (low)');
  await pick('Provider', 'gemini');
  await click(row('google/gemini-3.8-flash')!);
  await pick('Reasoning', 'high');
  await switchJob('Tagger');
  expect(select('Tagger model').value).toBe('');
  expect(select('Tagger model').options[0].textContent).toBe('Default · GPT-6 Luna');
  expect(select('Reasoning').options[0].textContent).toBe('Default (medium)');
  expect([...select('Tagger model').options].some(item => item.value.startsWith('openrouter/'))).toBe(false);
  await pick('Provider', 'openai');
  await pick('Tagger model', 'openai/gpt-6-luna');
  await pick('Reasoning', 'medium');
  await switchJob('Blueprint');
  expect(select('Blueprint model').value).toBe('');
  expect(select('Blueprint model').options[0].textContent).toBe('Default · Claude Haiku 5.5');
  expect(select('Reasoning').options[0].textContent).toBe('Default (high)');
  expect(document.querySelector('[aria-label="Used by"]')?.textContent).toContain('Story Seed Blueprint');
  await pick('Provider', 'gemini');
  await pick('Blueprint model', 'google/gemini-3.5-flash-lite');
  await pick('Reasoning', 'minimal');
  expect(readTextRolePreference('blueprint')).toEqual({ model: 'google/gemini-3.5-flash-lite', reasoningLevel: 'minimal' });
  expect(readTaggerPreference()).toEqual({ model: 'openai/gpt-6-luna', reasoningLevel: 'medium' });
  expect(readReasoningPreference('google/gemini-3.8-flash')).toBe('high');
  await click(document.querySelector<HTMLButtonElement>('[aria-label="Close Model Router"]')!);
  await click(container.querySelector<HTMLButtonElement>('[aria-label="Model Router settings"]')!);
  await switchJob('Blueprint');
  expect(select('Blueprint model').value).toBe('google/gemini-3.5-flash-lite');
  expect(select('Reasoning').value).toBe('minimal');
  await pick('Blueprint model', '');
  await pick('Reasoning', '');
  expect(select('Reasoning').options[0].textContent).toBe('Default (high)');
});
