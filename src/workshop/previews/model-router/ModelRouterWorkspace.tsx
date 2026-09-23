/**
 * Workshop view of the universal Model Router: which models each capability
 * (Chapters, Images, TTS) can route to, which provider serves each, and which
 * provider keys the server has. Read-only; keys are set in Vercel.
 */
import { useCallback, useEffect, useState } from 'react';
import { BookOpenText, Image as ImageIcon, Router, Volume2 } from 'lucide-react';
import type {
  ModelRouterCapabilityStatus,
  ModelRouterStatus,
} from '../../../server/model-router/status';

type Load =
  | { state: 'loading' }
  | { state: 'ready'; status: ModelRouterStatus }
  | { state: 'error'; message: string };

const CAPABILITY_ICONS = { chapters: BookOpenText, images: ImageIcon, tts: Volume2 } as const;

const isStatus = (value: unknown): value is ModelRouterStatus =>
  Boolean(value) && typeof value === 'object' && Array.isArray((value as ModelRouterStatus).capabilities);

function CapabilityPanel({ capability }: { capability: ModelRouterCapabilityStatus }) {
  return (
    <div className="space-y-4" role="tabpanel" aria-label={`${capability.label} router`}>
      <p className="text-sm text-white/60">{capability.description}</p>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">Providers</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {capability.providers.map(provider => (
            <li key={provider.id} className={`rounded-lg border px-3 py-2 text-xs ${provider.configured
              ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
              : 'border-white/10 text-white/50'}`}>
              <span className="font-semibold">{provider.label}</span>
              <span className="ml-2 font-mono text-[10px]">
                {provider.configured ? 'key configured' : `needs ${provider.keyVariable}`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">Models</h2>
        <ul className="mt-3 divide-y divide-white/5">
          {capability.models.map(model => (
            <li key={model.id} data-model={model.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className={`text-sm ${model.available ? 'text-white/90' : 'text-white/45'}`}>{model.label}</p>
                <p className="truncate font-mono text-[10px] text-white/35">{model.id}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px] font-mono uppercase tracking-wider">
                {model.isDefault && <span className="rounded border border-cyan-400/35 bg-cyan-500/15 px-1.5 py-0.5 text-cyan-100">Default</span>}
                {model.stage !== 'current' && <span className="rounded border border-amber-400/30 px-1.5 py-0.5 text-amber-200">{model.stage}</span>}
                <span className={`rounded border px-1.5 py-0.5 ${model.available ? 'border-emerald-400/30 text-emerald-200' : 'border-white/10 text-white/40'}`}>
                  {model.available ? 'Ready' : 'No key'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">Used by</h2>
        <p className="mt-3 text-sm text-white/70">
          {capability.consumers.length ? capability.consumers.join(' · ') : 'No generation surface uses this router yet.'}
        </p>
      </section>
    </div>
  );
}

export function ModelRouterWorkspace({ endpoint = '/api/model-router' }: { endpoint?: string }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [active, setActive] = useState<ModelRouterCapabilityStatus['id']>('chapters');

  const refresh = useCallback(async () => {
    setLoad({ state: 'loading' });
    try {
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      const body: unknown = await response.json();
      if (!response.ok || !isStatus(body)) throw new Error(`The Model Router could not be read (${response.status}).`);
      setLoad({ state: 'ready', status: body });
    } catch (error) {
      setLoad({ state: 'error', message: error instanceof Error ? error.message : 'The Model Router could not be read.' });
    }
  }, [endpoint]);

  useEffect(() => { void refresh(); }, [refresh]);

  const capabilities = load.state === 'ready' ? load.status.capabilities : [];
  const current = capabilities.find(capability => capability.id === active);

  return (
    <main className="min-h-screen bg-[#05070d] px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-400/25 bg-cyan-500/10 text-cyan-200">
            <Router aria-hidden="true" size={22} />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Model Router</h1>
            <p className="text-xs text-white/50">One catalog for every generation model, separated by capability.</p>
          </div>
        </header>

        <div className="flex gap-2" role="tablist" aria-label="Router capabilities">
          {(['chapters', 'images', 'tts'] as const).map(id => {
            const Icon = CAPABILITY_ICONS[id];
            const label = capabilities.find(capability => capability.id === id)?.label
              ?? { chapters: 'Chapters', images: 'Images', tts: 'TTS' }[id];
            return (
              <button key={id} type="button" role="tab" aria-selected={active === id} onClick={() => setActive(id)}
                className={`workshop-touch-target flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${active === id
                  ? 'border-cyan-400/35 bg-cyan-500/15 text-cyan-100'
                  : 'border-white/10 text-white/55 hover:border-white/20 hover:bg-white/5 hover:text-white/85'}`}>
                <Icon aria-hidden="true" size={14} />
                {label}
              </button>
            );
          })}
        </div>

        {load.state === 'loading' && <p className="text-sm text-white/50">Reading the router…</p>}
        {load.state === 'error' && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
            <p>{load.message}</p>
            <button type="button" onClick={() => void refresh()} className="mt-2 underline">Try again</button>
          </div>
        )}
        {current && <CapabilityPanel capability={current} />}
      </div>
    </main>
  );
}
