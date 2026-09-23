// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ModelRouterWorkspace } from './ModelRouterWorkspace';
import { modelRouterStatus } from '../../../server/model-router/status';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

it('separates the router into Chapters, Images and TTS and marks which models are ready', async () => {
  const status = modelRouterStatus({ GEMINI_API_KEY: 'g' });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(status), { status: 200 })));
  await act(async () => root.render(<ModelRouterWorkspace />));
  const tabs = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  expect(tabs.map(tab => tab.textContent)).toEqual(['Chapters', 'Images', 'TTS']);
  const luna = container.querySelector('[data-model="openrouter/openai/gpt-6-luna"]');
  expect(luna?.textContent).toContain('No key');
  expect(container.querySelector('[data-model="google/gemini-3.8-flash"]')?.textContent).toContain('Ready');
  expect(container.textContent).toContain('needs OpenRouter-Dev');
  await act(async () => tabs[2].click());
  expect(container.querySelector('[data-model="eleven_multilingual_v2"]')?.textContent).toContain('Default');
});
