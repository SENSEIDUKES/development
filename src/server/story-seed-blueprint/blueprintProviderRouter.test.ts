import { describe, expect, it, vi } from 'vitest';
import { ModelRouterError } from '@seihouse/library/model-router-server';
import { BlueprintOutputLimitError, GeminiWorldBlueprintProvider, OpenRouterWorldBlueprintProvider } from './generate';

const generate = vi.fn();
vi.mock('@seihouse/library/model-router-server', async importOriginal => {
  const actual = await importOriginal<typeof import('@seihouse/library/model-router-server')>();
  return { ...actual, createModelRouter: () => ({ generate }) };
});

const request = {
  systemInstruction: 'instructions', userPrompt: 'prompt',
  responseJsonSchema: { type: 'object' }, temperature: 1,
  maxOutputTokens: 8192, timeoutMs: 90000,
};

describe('Blueprint router error translation', () => {
  it.each([
    ['Gemini', () => new GeminiWorldBlueprintProvider('key', 'google/gemini-3.8-flash')],
    ['OpenRouter', () => new OpenRouterWorldBlueprintProvider('key', 'openrouter/openai/gpt-6-luna')],
  ])('%s preserves the Blueprint output-limit error', async (_name, createProvider) => {
    generate.mockRejectedValueOnce(new ModelRouterError('output-limit', 'Provider limit.'));
    await expect(createProvider().generate(request)).rejects.toBeInstanceOf(BlueprintOutputLimitError);
  });

  it('leaves other provider errors intact', async () => {
    const failure = new ModelRouterError('provider-error', 'No credits.');
    generate.mockRejectedValueOnce(failure);
    await expect(new OpenRouterWorldBlueprintProvider('key', 'openrouter/openai/gpt-6-luna').generate(request))
      .rejects.toBe(failure);
  });
});
