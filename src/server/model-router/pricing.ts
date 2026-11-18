/** Published standard rates for direct routes, reviewed 2026-11-18. Text is USD per
 * million uncached input and billable output tokens at standard context lengths.
 * OpenRouter text routes use its public catalog below. See the pricing sources in README.md. */
export type RouterPrice =
  | { input: number; output: number }
  | { usd: number; basis: string; minimum?: boolean };

type TokenRates = readonly [input: number, output: number];
const textRates: Record<string, TokenRates> = {
  'openai/gpt-6.1-terra': [1, 5],
  'openai/gpt-6.1-sol': [2, 10],
  'openai/gpt-6-astra': [10, 50],
  'openai/gpt-6-luna': [0.10, 0.50],
  'openai/gpt-6-sol': [2, 10],
  'openai/gpt-5.6-sol': [4, 20],
  'openai/gpt-5.6-terra': [2, 12],
  'openai/gpt-5.6-luna': [0.20, 1.20],
  'openai/gpt-5.5': [5, 30],
  'openai/gpt-5.5-pro': [30, 180],
  'openai/gpt-5.4': [2.50, 15],
  'openai/gpt-5.4-pro': [30, 180],
  'openai/gpt-5.4-mini': [0.75, 4.50],
  'openai/gpt-5.2': [1.75, 14],
  'openai/gpt-5.2-pro': [21, 168],
  'openai/chat-latest': [5, 30],
  'google/gemini-3.5-flash': [1.50, 9],
  'google/gemini-3.5-flash-lite': [0.30, 2.50],
  'google/gemini-3.1-flash-lite': [0.25, 1.50],
  'google/gemini-3.1-pro-preview': [2, 12],
  'anthropic/claude-haiku-5-5': [0.10, 0.50],
  'anthropic/claude-sonnet-5-5': [2, 10],
  'anthropic/claude-opus-5-5': [4, 20],
  'anthropic/claude-fable-5-1': [10, 50],
  'minimax/MiniMax-M3.1-Flash': [0.15, 0.60],
  'minimax/MiniMax-M3': [0.30, 1.20],
  'minimax/MiniMax-M2.7': [0.30, 1.20],
  'minimax/MiniMax-M2.7-highspeed': [0.60, 2.40],
};

const image1k = (usd: number): RouterPrice => ({ usd, basis: 'One 1K output image, before any input charges' });
// OpenAI's image calculator, 1024 × 1024 at the adapter's medium quality.
const openAIImage = (outputTokens: number): RouterPrice => ({
  usd: outputTokens * 30 / 1_000_000,
  basis: 'One 1K square image at medium quality, before input charges',
});
const audioMinute = (usd: number): RouterPrice => ({ usd, basis: 'One connected minute, plus model tokens', minimum: true });
const unitPrices: Record<string, RouterPrice> = {
  'google/gemini-3.1-flash-lite-image': image1k(0.0336),
  'google/gemini-3.1-flash-image': image1k(0.067),
  'google/gemini-3-pro-image': image1k(0.134),
  'minimax/image-01': { usd: 0.0035, basis: 'One generated image' },
  'minimax/image-01-live': { usd: 0.0035, basis: 'One generated image' },
  'minimax/MiniMax-H3-Image': { usd: 0.02179, basis: 'Provider example for a 1K text-to-image request' },
  'minimax/MiniMax-H3-Image-Highspeed': { usd: 0.03529, basis: 'Provider example for a 1K text-to-image request' },
  'openai/gpt-image-2.6-flare': openAIImage(1452),
  'openai/gpt-image-2.6-sunburst': openAIImage(1452),
  'openai/gpt-image-2.5-flare': openAIImage(440),
  'openai/gpt-image-2.5-sunburst': openAIImage(440),
  'openrouter/openai/gpt-5.4-image-2': { usd: 0.1303, basis: 'Published OpenRouter example for a 1536 × 864 image' },
  'google/gemini-3.8-live': { usd: 0.023, basis: 'One minute of audio in both directions, before text charges' },
  'openai/gpt-live-1': audioMinute(0.05),
  'elevenlabs/eleven_realtime_v1_mini': audioMinute(0.08),
  'elevenlabs/eleven_realtime_v1_max': audioMinute(0.08),
  'lmstudio/loaded': { usd: 0, basis: 'Local inference has no provider API charge' },
};

export function publishedModelPrice(id: string): RouterPrice | undefined {
  if (id === 'google/gemini-3.7-flash' || id === 'google/gemini-3.8-flash') {
    return Date.now() < Date.UTC(2027, 0, 1) ? { input: 0.75, output: 3.75 } : { input: 1.50, output: 7.50 };
  }
  if (Object.hasOwn(textRates, id)) {
    const [input, output] = textRates[id];
    return { input, output };
  }
  return Object.hasOwn(unitPrices, id) ? unitPrices[id] : undefined;
}

type RoutedRates = ReadonlyMap<string, RouterPrice>;
let cached: { expires: number; rates: Promise<RoutedRates> } | undefined;

/** A public catalog read. Missing rates or an outage leave those routes unquoted. */
export function openRouterRates(): Promise<RoutedRates> {
  if (cached && cached.expires > Date.now()) return cached.rates;
  const rates = fetch('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(3000) })
    .then(async response => {
      if (!response.ok) throw new Error('Model prices unavailable');
      const catalog = await response.json() as { data: { id: string; pricing?: { prompt?: string; completion?: string } }[] };
      const result = new Map<string, RouterPrice>();
      for (const { id, pricing } of catalog.data) {
        if (typeof pricing?.prompt !== 'string' || !pricing.prompt.trim()
          || typeof pricing.completion !== 'string' || !pricing.completion.trim()) continue;
        const input = Number(pricing.prompt) * 1_000_000;
        const output = Number(pricing.completion) * 1_000_000;
        if ([input, output].every(rate => Number.isFinite(rate) && rate >= 0)) result.set('openrouter/' + id, { input, output });
      }
      return result;
    }).catch(() => {
      // Keep settings usable during an outage without retrying on every open.
      if (cached) cached.expires = Date.now() + 60_000;
      return new Map<string, RouterPrice>();
    });
  cached = { expires: Date.now() + 60 * 60_000, rates };
  return rates;
}
