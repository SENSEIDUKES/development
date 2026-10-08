// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { buildStoryCoverPrompt } from '../../../server/story-cover/prompt';
import { fingerprintText } from '../writer-instructions/writerInstructions';
import { DEFAULT_IMAGE_MODEL, IMAGE_MODELS } from '@seihouse/library/model-router-server';
import { COVER_DEFAULT_MODEL_LABEL, COVER_PROMPT_SHAPE, IMAGE_KINDS, IMAGE_PROMPTS } from './imagePrompts';
import { IMAGE_PROMPTS_HISTORY, lastChange } from './imagePromptsHistory';
import { ImagePromptsWorkspace } from './ImagePromptsWorkspace';

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
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => root.render(<ImagePromptsWorkspace />));
    for (const kind of IMAGE_KINDS) expect(container.querySelector(`[data-image-kind="${kind.id}"] h2`)?.textContent).toBe(kind.title);
    for (const prompt of IMAGE_PROMPTS) expect(container.querySelector(`[data-image-prompt="${prompt.id}"] pre`)?.textContent).toBe(prompt.text);
    expect(container.querySelector('[data-image-ideas]')?.textContent).toContain('across the ages');
    act(() => root.unmount());
    container.remove();
  });
});
