/**
 * Workshop-wide Model Router: a gear button that opens the router from any
 * Workshop page. Pick a capability, then a provider, then a model. Chapters
 * models are selectable; the choice is saved in this browser and the features
 * marked "follows router" use it. Images and TTS are shown for reference.
 * "Used by" comes from `GENERATION_CONSUMERS` in the server catalog.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpenText, Check, Image as ImageIcon, Settings, Volume2, X } from 'lucide-react';
import type {
  ModelRouterCapabilityStatus,
  ModelRouterStatus,
} from '../server/model-router/status';
import { useModelPreference } from '../host/generation/modelPreference';

type Load =
  | { state: 'loading' }
  | { state: 'ready'; status: ModelRouterStatus }
  | { state: 'error'; message: string };

const CAPABILITY_ICONS = { chapters: BookOpenText, images: ImageIcon, tts: Volume2 } as const;
const CAPABILITY_LABELS = { chapters: 'Chapters', images: 'Images', tts: 'TTS' } as const;

/** Why a capability's model is not chosen here. */
const SERVER_OWNED_NOTE: Partial<Record<ModelRouterCapabilityStatus['id'], string>> = {
  images: 'No Workshop surface generates images yet. These are the models the router will offer once one does.',
  tts: 'The voice model is set on the server (ELEVENLABS_MODEL_ID). Codex voice requests never accept a model from the browser.',
};

const isStatus = (value: unknown): value is ModelRouterStatus =>
  Boolean(value) && typeof value === 'object' && Array.isArray((value as ModelRouterStatus).capabilities);

type RouterModel = ModelRouterCapabilityStatus['models'][number];
type RouterProvider = ModelRouterCapabilityStatus['providers'][number];

function ModelRow({ model, selected, selectable, onSelect }: {
  model: RouterModel;
  selected: boolean;
  selectable: boolean;
  onSelect: () => void;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1 text-left">
        <span className={`block truncate text-[13px] leading-tight ${model.available ? 'text-white/90' : 'text-white/40'}`}>{model.label.replace(/ · OpenRouter$/, '')}</span>
        <span className="block truncate font-mono text-[10px] leading-tight text-white/30">{model.id}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 font-mono text-[9px] uppercase tracking-wider">
        {model.stage !== 'current' && <span className="rounded border border-amber-400/30 px-1 py-px text-amber-200">{model.stage}</span>}
        {model.isDefault && !selected && <span className="rounded border border-white/15 px-1 py-px text-white/50">Default</span>}
        {!model.available && <span className="rounded border border-white/10 px-1 py-px text-white/40">No key</span>}
        {selected && <Check aria-label="Selected" className="text-cyan-300" size={15} />}
      </span>
    </>
  );
  if (!selectable) {
    return <li data-model={model.id} className="flex items-center gap-2 px-2.5 py-1.5">{body}</li>;
  }
  return (
    <li data-model={model.id}>
      <button type="button" role="radio" aria-checked={selected} disabled={!model.available} onClick={onSelect}
        className={`workshop-touch-target flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors disabled:cursor-not-allowed ${selected
          ? 'border-cyan-400/40 bg-cyan-500/10'
          : 'border-transparent hover:bg-white/5'}`}>
        {body}
      </button>
    </li>
  );
}

function ProviderPicker({ providers, models, active, onPick }: {
  providers: RouterProvider[];
  models: RouterModel[];
  active: string;
  onPick: (provider: RouterProvider['id']) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Providers">
      {providers.map(provider => {
        const count = models.filter(model => model.provider === provider.id).length;
        return (
          <button key={provider.id} type="button" role="tab" aria-selected={active === provider.id} data-provider={provider.id}
            onClick={() => onPick(provider.id)}
            title={provider.configured ? 'Key configured' : `Needs ${provider.keyVariable}`}
            className={`workshop-touch-target flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${active === provider.id
              ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-50'
              : 'border-white/10 text-white/60 hover:bg-white/5'}`}>
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${provider.configured ? 'bg-emerald-400' : 'bg-white/25'}`} />
            {provider.label}
            <span className="font-mono text-[10px] text-white/40">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function CapabilityPanel({ capability }: { capability: ModelRouterCapabilityStatus }) {
  const [saved, setSaved] = useModelPreference('chapters');
  const selectable = capability.id === 'chapters';
  const savedIsOffered = selectable && capability.models.some(model => model.id === saved && model.available);
  const selectedId = selectable && savedIsOffered ? saved : capability.defaultModel;
  const selectedProvider = capability.models.find(model => model.id === selectedId)?.provider;
  const [provider, setProvider] = useState<RouterProvider['id']>(
    () => selectedProvider ?? capability.providers.find(item => item.configured)?.id ?? capability.providers[0].id,
  );
  const activeProvider = capability.providers.find(item => item.id === provider) ?? capability.providers[0];
  const models = capability.models.filter(model => model.provider === activeProvider.id);
  const note = SERVER_OWNED_NOTE[capability.id];

  return (
    <div className="space-y-2.5" role="tabpanel" aria-label={`${capability.label} router`}>
      <ProviderPicker providers={capability.providers} models={capability.models} active={activeProvider.id} onPick={setProvider} />
      {!activeProvider.configured && (
        <p className="text-[11px] text-white/45">Add <span className="font-mono">{activeProvider.keyVariable}</span> in Vercel to use these models.</p>
      )}
      {note && <p className="text-[11px] leading-snug text-white/45">{note}</p>}
      <ul className="space-y-0.5 rounded-lg border border-white/10 bg-white/[0.02] p-1"
        role={selectable ? 'radiogroup' : undefined} aria-label={selectable ? `${activeProvider.label} chapter models` : undefined}>
        {models.map(model => (
          <ModelRow key={model.id} model={model} selectable={selectable}
            selected={model.id === selectedId} onSelect={() => setSaved(model.id)} />
        ))}
        {!models.length && <li className="px-2.5 py-1.5 text-xs text-white/40">No models from this provider.</li>}
      </ul>
      <section aria-label="Used by" className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
        <h3 className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">Used by</h3>
        {capability.consumers.length ? (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {capability.consumers.map(consumer => (
              <li key={consumer.name} className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-white/75">
                {consumer.name}
                <span className={`ml-1.5 font-mono text-[9px] uppercase ${consumer.modelChoice === 'router' ? 'text-cyan-300' : 'text-white/35'}`}>
                  {consumer.modelChoice === 'router' ? 'follows router' : 'server default'}
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-1 text-[11px] text-white/45">No Workshop feature generates with this yet.</p>}
      </section>
    </div>
  );
}

/** The router's content: capability tabs over live server status. */
export function ModelRouterPanel({ endpoint = '/api/model-router' }: { endpoint?: string }) {
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
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-0.5" role="tablist" aria-label="Router capabilities">
        {(['chapters', 'images', 'tts'] as const).map(id => {
          const Icon = CAPABILITY_ICONS[id];
          return (
            <button key={id} type="button" role="tab" aria-selected={active === id} onClick={() => setActive(id)}
              className={`workshop-touch-target flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors ${active === id
                ? 'bg-cyan-500/15 text-cyan-100'
                : 'text-white/55 hover:bg-white/5 hover:text-white/85'}`}>
              <Icon aria-hidden="true" size={13} />
              {CAPABILITY_LABELS[id]}
            </button>
          );
        })}
      </div>

      {load.state === 'loading' && <p className="text-xs text-white/50">Reading the router…</p>}
      {load.state === 'error' && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <p>{load.message}</p>
          <button type="button" onClick={() => void refresh()} className="mt-2 underline">Try again</button>
        </div>
      )}
      {current && <CapabilityPanel key={current.id} capability={current} />}
    </div>
  );
}

/** Gear button that opens the Model Router over any Workshop page. */
export function ModelRouterGear({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      trigger.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={trigger} type="button" aria-label="Model Router settings" title="Model Router" aria-haspopup="dialog" aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`workshop-touch-target inline-grid h-9 w-9 shrink-0 place-items-center rounded-full border border-neutral-700/50 bg-neutral-900/80 text-neutral-300 shadow-lg backdrop-blur transition-colors hover:bg-neutral-800 hover:text-white ${className}`}>
        <Settings aria-hidden="true" size={17} />
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby={titleId}
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-[#05070d] px-3 pb-[calc(0.9rem+env(safe-area-inset-bottom,0px))] pt-3 text-white shadow-2xl sm:rounded-2xl sm:px-4"
            style={{ fontFamily: 'var(--font-sans)' }}>
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <h2 id={titleId} className="text-sm font-semibold tracking-wide">Model Router</h2>
              <button ref={closeButton} type="button" aria-label="Close Model Router" onClick={() => setOpen(false)}
                className="workshop-touch-target grid h-8 w-8 place-items-center rounded-full border border-white/10 text-white/60 hover:bg-white/5 hover:text-white">
                <X aria-hidden="true" size={15} />
              </button>
            </div>
            <ModelRouterPanel />
          </div>
        </div>,
        // Rendered at the body so a blurred or sticky header cannot trap the overlay.
        document.body,
      )}
    </>
  );
}
