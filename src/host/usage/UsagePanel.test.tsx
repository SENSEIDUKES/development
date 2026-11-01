// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { modelRouterStatus } from '../../server/model-router/status';
import { recordUsage } from './usageLog';
import { UsagePanel } from './UsagePanel';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
const NOW = new Date(2026, 10, 1, 15, 0).getTime();
const HOUR = 60 * 60 * 1_000;

beforeEach(() => {
  localStorage.clear();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

const render = () => act(async () => root.render(<UsagePanel now={NOW} />));
const click = (label: string) => act(async () => {
  [...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === label)!.click();
});
const group = (id: string) => container.querySelector(`[data-usage-group="${id}"]`)?.textContent;

it('says what was made in the reader\'s words, and its Energy', async () => {
  recordUsage({ kind: 'chapter', model: 'openrouter/openai/gpt-6-luna', inputTokens: 20_000, outputTokens: 4_000, at: NOW - HOUR });
  recordUsage({ kind: 'story-upkeep', task: 'Tagging', model: 'openrouter/openai/gpt-6-luna', inputTokens: 5_000, outputTokens: 800, at: NOW - HOUR });
  recordUsage({ kind: 'chapter', model: 'anthropic/claude-opus-5-5', at: NOW - 2 * 24 * HOUR });
  recordUsage({ kind: 'image', model: 'google/gemini-3.1-flash-lite-image', at: NOW - HOUR });
  recordUsage({ kind: 'live', model: 'google/gemini-3.8-live', seconds: 150, at: NOW - HOUR });
  recordUsage({ kind: 'blueprint', model: 'openrouter/openai/gpt-6-luna', at: NOW - HOUR });
  // Outside the last 30 days: not counted.
  recordUsage({ kind: 'chapter', model: 'anthropic/claude-opus-5-5', at: NOW - 40 * 24 * HOUR });
  await render();

  // The last 7 days: 2 + 8 (chapters), 5 (picture), 3 (live, three started minutes), 2 (the Blueprint, a chapter's price).
  expect(container.querySelector('[data-usage-total]')?.textContent).toContain('20 Energy');
  expect(group('chapters')).toBe('2 chapters written10 Energy');
  expect(group('pictures')).toBe('1 picture made5 Energy');
  expect(group('familiar')).toBe('3 minutes talking with your Familiar3 Energy');
  expect(group('worlds')).toBe('1 world planned2 Energy');
  expect(container.querySelector('[role="img"]')).not.toBeNull();
  expect(container.querySelector('[data-usage-legend]')?.textContent).toBe('ChaptersPicturesFamiliar talkWorlds');
  expect(container.textContent).not.toMatch(/token/i);

  await click('Today');
  expect(container.querySelector('[data-usage-total]')?.textContent).toContain('12 Energy');
  expect(group('chapters')).toBe('1 chapter written2 Energy');
});

it('shows each model, its grade and the provider\'s counts behind the scenes', async () => {
  recordUsage({ kind: 'chapter', model: 'openrouter/openai/gpt-6-luna', inputTokens: 20_000, outputTokens: 4_000, at: NOW - HOUR });
  recordUsage({ kind: 'story-upkeep', task: 'Tagging', model: 'openrouter/openai/gpt-6-luna', inputTokens: 5_000, outputTokens: 800, at: NOW - HOUR });
  recordUsage({ kind: 'live', model: 'openai/gpt-live-1', seconds: 95, at: NOW - HOUR });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(modelRouterStatus({})), { status: 200 })));
  await render();
  await click('Behind the scenes');
  const luna = container.querySelector('[data-usage-model="openrouter/openai/gpt-6-luna"]')!.textContent;
  expect(luna).toContain('GPT-6 Luna');
  expect(luna).toContain('Mortal');
  expect(luna).toContain('1 chapter · 1 upkeep call (Tagging)');
  expect(luna).toContain('25,000 tokens in · 4,800 out');
  const live = container.querySelector('[data-usage-model="openai/gpt-live-1"]')!.textContent;
  expect(live).toContain('Immortal');
  expect(live).toContain('1 min 35 s of live talk');
});

it('says when nothing was made', async () => {
  await render();
  expect(container.textContent).toContain('Nothing made in the last 7 days');
});
