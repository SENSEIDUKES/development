import { useEffect, useState } from 'react';
import type { FamiliarLive } from '@seihouse/library/familiar';
import { createFamiliarGeminiLive } from './live';
import { createFamiliarOpenAiLive } from './openaiLive';

export type FamiliarLiveProvider = 'openai' | 'gemini';

/** Which provider the server's live talk runs on, if any. Any failure reads as none, so the device voice stays. */
export async function familiarLiveProvider(request: typeof fetch = fetch): Promise<FamiliarLiveProvider | undefined> {
  try {
    const response = await request('/api/familiar-live', { headers: { Accept: 'application/json' } });
    if (!response.ok) return undefined;
    const body = await response.json() as { configured?: unknown; provider?: unknown };
    if (body.configured !== true) return undefined;
    return body.provider === 'openai' ? 'openai' : 'gemini';
  } catch {
    return undefined;
  }
}

/**
 * Live talk on the provider the server's Model Router chose (GPT-Live or
 * Gemini Live), once the server says it can; until then, or without it, the
 * device voice.
 */
export function useFamiliarLive(): FamiliarLive | undefined {
  const [live, setLive] = useState<FamiliarLive>();
  useEffect(() => {
    let current = true;
    void familiarLiveProvider().then(provider => {
      if (current && provider) setLive(provider === 'openai' ? createFamiliarOpenAiLive() : createFamiliarGeminiLive());
    });
    return () => { current = false; };
  }, []);
  return live;
}
