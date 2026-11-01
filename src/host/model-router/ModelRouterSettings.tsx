/**
 * The Model Router: pick a capability, then a provider, then a model. Opened
 * from the Workshop's gear and from the app's Settings → Advanced → Model
 * Router, one router for both. Chapters, Images and Live speech models are
 * selectable; the choice is saved in this browser and the features marked
 * "follows router" use it. Text to speech and the rest are shown for
 * reference.
 * "Used by" comes from `GENERATION_CONSUMERS` in the server catalog. The
 * Advanced button tunes the selected model's reasoning level.
 */
import { useCallback, useEffect, useState } from 'react';
import { AudioLines, BookOpenText, Box, Check, Image as ImageIcon, Music2, Settings, SlidersHorizontal, Video, Volume2 } from 'lucide-react';
import type {
  ModelRouterCapabilityStatus,
  ModelRouterStatus,
} from '../../server/model-router/status';
import { ENERGY_GRADE_LABELS, ENERGY_GRADES, GRADED_ENERGY_PRICES, modelEnergyGrade, type EnergyGrade, type GradedEnergyKind } from '@seihouse/library/energy';
import { useModelPreference, useReasoningPreferences, useTaggerPreference, type ModelPreferenceCapability } from '../generation/modelPreference';
import { HostDialog } from '../dialog/HostDialog';

type Load =
  | { state: 'loading' }
  | { state: 'ready'; status: ModelRouterStatus }
  | { state: 'error'; message: string };

const CAPABILITY_ICONS = {
  chapters: BookOpenText,
  images: ImageIcon,
  tts: Volume2,
  live: AudioLines,
  audio: Music2,
  video: Video,
  '3d': Box,
} as const;
const CAPABILITY_LABELS = {
  chapters: 'Chapters',
  images: 'Images',
  tts: 'Text to speech',
  live: 'Live speech',
  audio: 'Audio',
  video: 'Video',
  '3d': '3D',
} as const;

/** Why a capability's model is not chosen here. */
const SERVER_OWNED_NOTE: Partial<Record<ModelRouterCapabilityStatus['id'], string>> = {
  tts: 'Reads written lines aloud. The voice model is set on the server (ELEVENLABS_MODEL_ID); Codex voice requests never accept a model from the browser.',
  audio: 'Gemini Lyria models are listed for reference; audio generation is not connected to a Workshop feature yet.',
  video: 'MiniMax video models have a server adapter; Veo is catalog only. No Workshop feature generates video yet. MiniMax model access depends on your subscription tier.',
  '3d': 'Tripo models are listed for reference; 3D generation is not connected to a Workshop feature yet.',
};

const isStatus = (value: unknown): value is ModelRouterStatus =>
  Boolean(value) && typeof value === 'object' && Array.isArray((value as ModelRouterStatus).capabilities);

type RouterModel = ModelRouterCapabilityStatus['models'][number];
type RouterProvider = ModelRouterCapabilityStatus['providers'][number];

/** The capabilities priced in Energy by grade, and how one is counted. */
const ENERGY_PRICED: Partial<Record<ModelRouterCapabilityStatus['id'], { kind: GradedEnergyKind; per: string }>> = {
  chapters: { kind: 'chapter', per: 'a chapter' },
  images: { kind: 'image', per: 'an image' },
  live: { kind: 'live-minute', per: 'a minute' },
};
const GRADE_STYLES: Record<EnergyGrade, string> = {
  mortal: 'border-slate-300/25 text-slate-200',
  immortal: 'border-violet-400/40 text-violet-200',
  heaven: 'border-amber-300/45 text-amber-200',
};

/** A model's grade and what one costs on it, e.g. "Immortal · 4 Energy". */
function EnergyBadge({ model, kind }: { model: string; kind: GradedEnergyKind }) {
  const grade = modelEnergyGrade(model);
  return (
    <span data-energy-grade={grade} className={`rounded border px-1 py-px ${GRADE_STYLES[grade]}`}>
      {ENERGY_GRADE_LABELS[grade]} · {GRADED_ENERGY_PRICES[kind][grade]}{kind === 'live-minute' ? '/min' : ''}
    </span>
  );
}

function ModelRow({ model, selected, selectable, reasoningLevel, energy, onSelect }: {
  model: RouterModel;
  /** Present when the capability costs Energy by grade. */
  energy?: GradedEnergyKind;
  selected: boolean;
  selectable: boolean;
  /** A non-default reasoning level saved in Advanced settings. */
  reasoningLevel?: string;
  onSelect: () => void;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1 text-left">
        <span className={`block truncate text-[13px] leading-tight ${model.available ? 'text-white/90' : 'text-white/40'}`}>{model.label.replace(/ · OpenRouter$/, '')}</span>
        <span className="block truncate font-mono text-[10px] leading-tight text-white/30">{model.id}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 font-mono text-[9px] uppercase tracking-wider">
        {energy && <EnergyBadge model={model.id} kind={energy} />}
        {model.stage !== 'current' && <span className="rounded border border-amber-400/30 px-1 py-px text-amber-200">{model.stage}</span>}
        {model.isDefault && !selected && <span className="rounded border border-white/15 px-1 py-px text-white/50">Default</span>}
        {reasoningLevel && <span className="rounded border border-violet-400/35 px-1 py-px text-violet-200" title="Reasoning level">{reasoningLevel}</span>}
        {!model.available && <span className="rounded border border-white/10 px-1 py-px text-white/40">No key</span>}
        {!model.implemented && <span className="rounded border border-white/10 px-1 py-px text-white/40">Catalog only</span>}
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
        className={`host-touch flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors disabled:cursor-not-allowed ${selected
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
            title={provider.id === 'lmstudio' ? 'Local development · no API key needed' : provider.configured ? 'Key configured' : `Needs ${provider.keyVariable}`}
            className={`host-touch flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${active === provider.id
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

/** Advanced settings for the selected model: its reasoning level, when it has one. */
function AdvancedSettings({ model, level, onChange }: {
  model?: RouterModel;
  level?: string;
  onChange: (level: string | undefined) => void;
}) {
  const reasoning = model?.reasoning;
  const option = (value: string | undefined, label: string) => {
    const active = (level ?? undefined) === value;
    return (
      <button key={label} type="button" role="radio" aria-checked={active} onClick={() => onChange(value)}
        className={`host-touch rounded-md border px-2 py-1 text-[11px] capitalize transition-colors ${active
          ? 'border-violet-400/45 bg-violet-500/15 text-violet-50'
          : 'border-white/10 text-white/60 hover:bg-white/5'}`}>
        {label}
      </button>
    );
  };
  return (
    <section aria-label="Advanced settings" className="rounded-lg border border-violet-400/20 bg-violet-500/[0.04] px-2.5 py-2">
      <h3 className="font-mono text-[9px] uppercase tracking-[0.2em] text-violet-200/70">
        Reasoning{model ? ` · ${model.label.replace(/ · OpenRouter$/, '')}` : ''}
      </h3>
      {reasoning ? (
        <>
          <div className="mt-1.5 flex flex-wrap gap-1" role="radiogroup" aria-label="Reasoning level">
            {option(undefined, `Default (${reasoning.defaultLevel})`)}
            {reasoning.levels.map(value => option(value, value))}
          </div>
          <p className="mt-1.5 text-[10px] leading-snug text-white/40">
            Higher levels think longer before writing: slower and costlier, often more careful. Saved per model in this browser.
          </p>
        </>
      ) : (
        <p className="mt-1 text-[11px] text-white/45">{model ? 'This model has no reasoning controls.' : 'Select a model first.'}</p>
      )}
    </section>
  );
}

/**
 * The Chapter Tagger's own choice: the model that reads each finished chapter
 * for its tags, and how hard it thinks. By default it is the chapter's own
 * writer, thinking as little as it allows; the owner's experiment (2026-10-29)
 * is whether a cheap model with high reasoning tags better than an expensive
 * one with none. Saved in this browser, apart from the chapter model's level,
 * so one model can write at one level and tag at another.
 */
function TaggerSettings({ models, chapterModel }: { models: RouterModel[]; chapterModel?: RouterModel }) {
  const [tagger, setTagger] = useTaggerPreference();
  const offered = models.filter(model => model.available);
  const chosen = tagger.model && offered.some(model => model.id === tagger.model) ? tagger.model : '';
  const reads = chosen ? offered.find(model => model.id === chosen) : chapterModel;
  const reasoning = reads?.reasoning;
  const level = tagger.reasoningLevel && reasoning?.levels.some(value => value === tagger.reasoningLevel) ? tagger.reasoningLevel : undefined;
  const lowest = reasoning?.levels[0];
  const option = (value: string | undefined, label: string) => {
    const active = level === value;
    return (
      <button key={label} type="button" role="radio" aria-checked={active} onClick={() => setTagger({ ...(chosen ? { model: chosen } : {}), ...(value ? { reasoningLevel: value } : {}) })}
        className={`host-touch rounded-md border px-2 py-1 text-[11px] capitalize transition-colors ${active
          ? 'border-violet-400/45 bg-violet-500/15 text-violet-50'
          : 'border-white/10 text-white/60 hover:bg-white/5'}`}>
        {label}
      </button>
    );
  };
  const providers = [...new Set(offered.map(model => model.provider))];
  const providerLabel: Record<RouterModel['provider'], string> = {
    gemini: 'Google Gemini', openrouter: 'OpenRouter', minimax: 'MiniMax', anthropic: 'Anthropic', lmstudio: 'Local (LM Studio)', elevenlabs: 'ElevenLabs', tripo: 'Tripo AI', openai: 'OpenAI',
  };
  return (
    <section aria-label="Chapter Tagger" className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
      <h3 className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">Chapter Tagger</h3>
      <p className="mt-1 text-[10px] leading-snug text-white/40">Reads each finished chapter for its tags: who speaks, sounds, holdings, appearances. By default the chapter's own writer, thinking as little as it allows.</p>
      <label className="mt-1.5 block">
        <span className="sr-only">Chapter Tagger model</span>
        <select aria-label="Chapter Tagger model" value={chosen}
          onChange={event => setTagger({ ...(event.target.value ? { model: event.target.value } : {}), ...(tagger.reasoningLevel ? { reasoningLevel: tagger.reasoningLevel } : {}) })}
          className="host-touch w-full rounded-md border border-white/10 bg-[#0b0e16] px-2 py-1.5 text-base text-white/85 sm:text-[12px]">
          <option value="">Same as chapters{chapterModel ? ` (${chapterModel.label.replace(/ · OpenRouter$/, '')})` : ''}</option>
          {providers.map(provider => (
            <optgroup key={provider} label={providerLabel[provider]}>
              {offered.filter(model => model.provider === provider).map(model => (
                <option key={model.id} value={model.id}>{model.label.replace(/ · OpenRouter$/, '')}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {reasoning ? (
        <div className="mt-1.5 flex flex-wrap gap-1" role="radiogroup" aria-label="Chapter Tagger reasoning level">
          {option(undefined, `Default (${lowest})`)}
          {reasoning.levels.map(value => option(value, value))}
        </div>
      ) : (
        <p className="mt-1.5 text-[11px] text-white/45">{reads ? 'This model has no reasoning controls.' : 'Choose a chapter model first.'}</p>
      )}
    </section>
  );
}

/** Capabilities whose model the reader chooses here; the rest are set on the server. */
const SELECTABLE: Partial<Record<ModelRouterCapabilityStatus['id'], { preference: ModelPreferenceCapability; noun: string; note?: string }>> = {
  chapters: { preference: 'chapters', noun: 'chapter' },
  images: { preference: 'images', noun: 'image' },
  live: { preference: 'live', noun: 'live speech', note: 'Hears and answers in one conversation: the Familiar\'s live talk (Settings → Familiar → Live talk) uses the model chosen here.' },
};

function CapabilityPanel({ capability }: { capability: ModelRouterCapabilityStatus }) {
  const choice = SELECTABLE[capability.id];
  const selectable = Boolean(choice);
  const [saved, setSaved] = useModelPreference(choice?.preference ?? 'chapters');
  const savedIsOffered = selectable && capability.models.some(model => model.id === saved && model.available);
  const selectedId = selectable && savedIsOffered ? saved : capability.defaultModel;
  const selectedProvider = capability.models.find(model => model.id === selectedId)?.provider;
  const [provider, setProvider] = useState<RouterProvider['id']>(
    () => selectedProvider ?? capability.providers.find(item => item.configured)?.id ?? capability.providers[0].id,
  );
  const activeProvider = capability.providers.find(item => item.id === provider) ?? capability.providers[0];
  const models = capability.models.filter(model => model.provider === activeProvider.id);
  const note = choice?.note ?? SERVER_OWNED_NOTE[capability.id];
  const [reasoning, setReasoning] = useReasoningPreferences();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const selectedModel = capability.models.find(model => model.id === selectedId);
  const priced = ENERGY_PRICED[capability.id];

  return (
    <div className="space-y-2.5" role="tabpanel" aria-label={`${capability.label} router`}>
      <div className="flex items-start justify-between gap-2">
        <ProviderPicker providers={capability.providers} models={capability.models} active={activeProvider.id} onPick={setProvider} />
        {capability.id === 'chapters' && (
          <button type="button" aria-label="Advanced settings" aria-expanded={advancedOpen} title="Advanced settings"
            onClick={() => setAdvancedOpen(open => !open)}
            className={`host-touch grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors ${advancedOpen
              ? 'border-violet-400/45 bg-violet-500/15 text-violet-100'
              : 'border-white/10 text-white/55 hover:bg-white/5 hover:text-white/85'}`}>
            <SlidersHorizontal aria-hidden="true" size={13} />
          </button>
        )}
      </div>
      {capability.id === 'chapters' && advancedOpen && (
        <AdvancedSettings model={selectedModel} level={selectedModel ? reasoning[selectedModel.id] : undefined}
          onChange={level => selectedModel && setReasoning(selectedModel.id, level)} />
      )}
      {!activeProvider.configured && (
        <p className="text-[11px] text-white/45">Add <span className="font-mono">{activeProvider.keyVariable}</span> in Vercel to use these models.</p>
      )}
      {activeProvider.id === 'lmstudio' && <p className="text-[11px] leading-snug text-white/45">Uses the text model currently loaded in LM Studio at localhost:1234. Start its server and keep one text model loaded. No API key needed; local development only.</p>}
      {note && <p className="text-[11px] leading-snug text-white/45">{note}</p>}
      {priced && (
        <p data-energy-prices className="text-[11px] leading-snug text-white/45">
          Energy {priced.per}: {ENERGY_GRADES.map(grade => `${ENERGY_GRADE_LABELS[grade]} ${GRADED_ENERGY_PRICES[priced.kind][grade]}`).join(' · ')}
        </p>
      )}
      <ul className="space-y-0.5 rounded-lg border border-white/10 bg-white/[0.02] p-1"
        role={selectable ? 'radiogroup' : undefined} aria-label={choice ? `${activeProvider.label} ${choice.noun} models` : undefined}>
        {models.map(model => (
          <ModelRow key={model.id} model={model} selectable={selectable} energy={priced?.kind}
            reasoningLevel={selectable && model.reasoning?.levels.some(level => level === reasoning[model.id]) ? reasoning[model.id] : undefined}
            selected={model.id === selectedId} onSelect={() => setSaved(model.id)} />
        ))}
        {!models.length && <li className="px-2.5 py-1.5 text-xs text-white/40">No models from this provider.</li>}
      </ul>
      {capability.id === 'chapters' && <TaggerSettings models={capability.models} chapterModel={selectedModel} />}
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
      {/* Words and pictures, then speech (read aloud, and live), then the rest. */}
      <div className="grid grid-cols-6 gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-0.5" role="tablist" aria-label="Router capabilities">
        {(['chapters', 'images', 'tts', 'live', 'audio', 'video', '3d'] as const).map(id => {
          const Icon = CAPABILITY_ICONS[id];
          return (
            <button key={id} type="button" role="tab" aria-selected={active === id} onClick={() => setActive(id)}
              className={`host-touch flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors ${['audio', 'video', '3d'].includes(id) ? 'col-span-2' : 'col-span-3'} ${active === id
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

/** The Model Router over the page (see `HostDialog`). */
export function ModelRouterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <HostDialog open={open} onClose={onClose} title="Model Router"><ModelRouterPanel /></HostDialog>;
}

/** Gear button that opens the Model Router over any Workshop page. */
export function ModelRouterGear({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label="Model Router settings" title="Model Router" aria-haspopup="dialog" aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`host-touch inline-grid h-9 w-9 shrink-0 place-items-center rounded-full border border-neutral-700/50 bg-neutral-900/80 text-neutral-300 shadow-lg backdrop-blur transition-colors hover:bg-neutral-800 hover:text-white ${className}`}>
        <Settings aria-hidden="true" size={17} />
      </button>
      <ModelRouterDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
