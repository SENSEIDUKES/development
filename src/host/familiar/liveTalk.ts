import { useEffect, useState } from 'react';
import type { FamiliarLive } from '@seihouse/library/familiar';
import { useModelPreference } from '../generation/modelPreference';
import { recordUsage } from '../usage/usageLog';
import { createFamiliarGeminiLive } from './live';
import { createFamiliarOpenAiLive } from './openaiLive';

export type FamiliarLiveProvider = 'openai' | 'gemini';

/** What the server offers for live talk: its own choice and every model it can run. */
export interface FamiliarLiveOffer {
  model: string;
  provider: FamiliarLiveProvider;
  models: { id: string; provider: FamiliarLiveProvider }[];
}

const asProvider = (value: unknown): FamiliarLiveProvider => value === 'openai' ? 'openai' : 'gemini';

/** The server's live talk offer, if any. Any failure reads as none, so the device voice stays. */
export async function familiarLiveOffer(request: typeof fetch = fetch): Promise<FamiliarLiveOffer | undefined> {
  try {
    const response = await request('/api/familiar-live', { headers: { Accept: 'application/json' } });
    if (!response.ok) return undefined;
    const body = await response.json() as { configured?: unknown; provider?: unknown; model?: unknown; models?: unknown };
    if (body.configured !== true) return undefined;
    const models = Array.isArray(body.models)
      ? body.models.filter((entry): entry is { id: string; provider: unknown } => Boolean(entry) && typeof entry.id === 'string')
        .map(entry => ({ id: entry.id, provider: asProvider(entry.provider) }))
      : [];
    return { model: typeof body.model === 'string' ? body.model : '', provider: asProvider(body.provider), models };
  } catch {
    return undefined;
  }
}

/** The live model to run: the reader's Router choice when the server offers it, otherwise the server's. */
export const chooseLiveModel = (offer: FamiliarLiveOffer, preferred?: string) =>
  offer.models.find(model => model.id === preferred) ?? { id: offer.model, provider: offer.provider };

/**
 * Records each conversation for the Usage page: its model and how long it ran,
 * from the moment it connected until it ended or the reader hung up. A talk
 * that never connected is not recorded.
 */
export function withLiveUsage(live: FamiliarLive, model: string, now: () => number = Date.now): FamiliarLive {
  return {
    start(brief, events, options) {
      let connectedAt: number | undefined;
      let recorded = false;
      const record = () => {
        if (recorded || connectedAt === undefined) return;
        recorded = true;
        recordUsage({ kind: 'live', model, seconds: Math.max(0, Math.round((now() - connectedAt) / 1_000)) });
      };
      const session = live.start(brief, {
        ...events,
        connected: () => { connectedAt ??= now(); events.connected(); },
        ended: (problem, unavailable) => { record(); events.ended(problem, unavailable); },
      }, options);
      return { ...session, end: () => { record(); session.end(); }, send: text => session.send(text) };
    },
  };
}

/**
 * Live talk on the model the Router chose (Model Router → Live speech), or the
 * server's own (GPT-Live or Gemini Live), once the server says it can; until
 * then, or without it, the device voice.
 */
export function useFamiliarLive(): FamiliarLive | undefined {
  const [offer, setOffer] = useState<FamiliarLiveOffer>();
  const [preferred] = useModelPreference('live');
  useEffect(() => {
    let current = true;
    void familiarLiveOffer().then(found => { if (current) setOffer(found); });
    return () => { current = false; };
  }, []);
  const [live, setLive] = useState<FamiliarLive>();
  useEffect(() => {
    if (!offer) { setLive(undefined); return; }
    const chosen = chooseLiveModel(offer, preferred);
    setLive(withLiveUsage(chosen.provider === 'openai' ? createFamiliarOpenAiLive({ model: chosen.id }) : createFamiliarGeminiLive({ model: chosen.id }), chosen.id));
  }, [offer, preferred]);
  return live;
}
