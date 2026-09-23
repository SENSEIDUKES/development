/**
 * Workshop-wide Model Router: a gear button that opens the router from any
 * Workshop page. Chapters models are selectable here; the choice is saved in
 * this browser and every chapter surface (Harness Generation, Chapter
 * Generation) starts from it. Images and TTS are shown for reference.
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

function ModelRow({ model, selected, selectable, onSelect }: {
  model: ModelRouterCapabilityStatus['models'][number];
  selected: boolean;
  selectable: boolean;
  onSelect: () => void;
}) {
  const badges = (
    <div className="flex flex-wrap gap-1.5 text-[10px] font-mono uppercase tracking-wider">
      {selected && <span className="inline-flex items-center gap-1 rounded border border-cyan-400/40 bg-cyan-500/20 px-1.5 py-0.5 text-cyan-100"><Check aria-hidden="true" size={10} />Selected</span>}
      {model.isDefault && !selected && <span className="rounded border border-white/15 px-1.5 py-0.5 text-white/55">Server default</span>}
      {model.stage !== 'current' && <span className="rounded border border-amber-400/30 px-1.5 py-0.5 text-amber-200">{model.stage}</span>}
      <span className={`rounded border px-1.5 py-0.5 ${model.available ? 'border-emerald-400/30 text-emerald-200' : 'border-white/10 text-white/40'}`}>
        {model.available ? 'Ready' : 'No key'}
      </span>
    </div>
  );
  const body = (
    <>
      <div className="min-w-0 text-left">
        <p className={`text-sm ${model.available ? 'text-white/90' : 'text-white/45'}`}>{model.label}</p>
        <p className="truncate font-mono text-[10px] text-white/35">{model.id}</p>
      </div>
      {badges}
    </>
  );
  if (!selectable) {
    return <li data-model={model.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">{body}</li>;
  }
  return (
    <li data-model={model.id}>
      <button type="button" role="radio" aria-checked={selected} disabled={!model.available} onClick={onSelect}
        className={`workshop-touch-target my-1 flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5 transition-colors disabled:cursor-not-allowed ${selected
          ? 'border-cyan-400/40 bg-cyan-500/10'
          : 'border-transparent hover:border-white/15 hover:bg-white/5'}`}>
        {body}
      </button>
    </li>
  );
}

function CapabilityPanel({ capability }: { capability: ModelRouterCapabilityStatus }) {
  const [saved, setSaved] = useModelPreference('chapters');
  const selectable = capability.id === 'chapters';
  const savedIsOffered = selectable && capability.models.some(model => model.id === saved && model.available);
  const selectedId = selectable ? (savedIsOffered ? saved : capability.defaultModel) : capability.defaultModel;
  const note = SERVER_OWNED_NOTE[capability.id];

  return (
    <div className="space-y-4" role="tabpanel" aria-label={`${capability.label} router`}>
      <p className="text-sm text-white/60">{capability.description}</p>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h3 className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">Providers</h3>
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
        <h3 className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">
          {selectable ? 'Choose a model' : 'Models'}
        </h3>
        {selectable && (
          <p className="mt-2 text-xs text-white/50">
            Tap a model to route every chapter generation through it. Saved in this browser.
          </p>
        )}
        {note && <p className="mt-2 text-xs text-white/50">{note}</p>}
        <ul className="mt-2 divide-y divide-white/5" role={selectable ? 'radiogroup' : undefined} aria-label={selectable ? 'Chapter model' : undefined}>
          {capability.models.map(model => (
            <ModelRow key={model.id} model={model} selectable={selectable}
              selected={model.id === selectedId} onSelect={() => setSaved(model.id)} />
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h3 className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40">Used by</h3>
        <p className="mt-3 text-sm text-white/70">
          {selectable
            ? 'Harness Generation · Chapter Generation. Story Seed Blueprint and Reader Translation use the server default.'
            : capability.consumers.length ? capability.consumers.join(' · ') : 'No generation surface uses this router yet.'}
        </p>
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
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Router capabilities">
        {(['chapters', 'images', 'tts'] as const).map(id => {
          const Icon = CAPABILITY_ICONS[id];
          return (
            <button key={id} type="button" role="tab" aria-selected={active === id} onClick={() => setActive(id)}
              className={`workshop-touch-target flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${active === id
                ? 'border-cyan-400/35 bg-cyan-500/15 text-cyan-100'
                : 'border-white/10 text-white/55 hover:border-white/20 hover:bg-white/5 hover:text-white/85'}`}>
              <Icon aria-hidden="true" size={14} />
              {CAPABILITY_LABELS[id]}
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
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-white/10 bg-[#05070d] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-5 text-white shadow-2xl sm:rounded-2xl sm:px-6"
            style={{ fontFamily: 'var(--font-sans)' }}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id={titleId} className="text-lg font-semibold">Model Router</h2>
                <p className="text-xs text-white/50">Choose which model the Workshop generates with.</p>
              </div>
              <button ref={closeButton} type="button" aria-label="Close Model Router" onClick={() => setOpen(false)}
                className="workshop-touch-target grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/60 hover:bg-white/5 hover:text-white">
                <X aria-hidden="true" size={16} />
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
