// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { HarnessGenerationController, type HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
import { HarnessGenerationWorkspace } from '@seihouse/library/generation';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const modelAdapter: HarnessGenerationModelAdapter = {
  getServerInfo: async () => ({
    provider: 'gemini',
    configured: true,
    models: [{ id: 'gemini-test', label: 'Gemini test' }],
    defaultModel: 'gemini-test',
  }),
  generate: vi.fn(async () => {
    throw new Error('Generation is not used by this test.');
  }),
};

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); });

const settle = async () => {
  for (let pass = 0; pass < 20; pass += 1) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  }
};
const pressedStory = () => container.querySelector('[aria-label="Harness stories"] button[aria-pressed="true"]')?.textContent;

/** Two stories: the requested one is never the list's first, so a fallback cannot pass for it. */
async function twoStories() {
  const repository = new InMemoryHarnessGenerationRepository();
  const setup = new HarnessGenerationController({ repository, modelAdapter });
  await setup.hydrate();
  await setup.createStory({ title: 'River of Oaths', premise: 'A ferryman remembers every oath spoken on his river.' });
  const second = await setup.createStory({ title: 'Lantern Court', premise: 'A court scribe records a war before it happens.' });
  return { repository, second };
}

describe('Opening the chapter workspace on a requested novel', () => {
  it('opens the requested novel once the stored stories arrive', async () => {
    const { repository, second } = await twoStories();
    await act(async () => root.render(<HarnessGenerationWorkspace repository={repository} modelAdapter={modelAdapter} initialStoryId={second.id} />));
    await settle();
    expect(pressedStory()).toContain('Lantern Court');
    expect(document.activeElement?.id).not.toBe('harness-generate-title');
  });

  it('lands on the Generate Chapter panel when asked to continue', async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const { repository, second } = await twoStories();
    await act(async () => root.render(<HarnessGenerationWorkspace repository={repository} modelAdapter={modelAdapter}
      initialStoryId={second.id} initialFocus="next-chapter" />));
    await settle();
    expect(pressedStory()).toContain('Lantern Court');
    expect(document.activeElement?.id).toBe('harness-generate-title');
    expect(document.activeElement?.textContent).toBe('Generate Chapter 1');
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it('falls back to the first story when the requested one does not exist', async () => {
    const { repository } = await twoStories();
    await act(async () => root.render(<HarnessGenerationWorkspace repository={repository} modelAdapter={modelAdapter} initialStoryId="missing" initialFocus="next-chapter" />));
    await settle();
    expect(pressedStory()).toContain('River of Oaths');
    expect(document.activeElement?.id).not.toBe('harness-generate-title');
  });
});
