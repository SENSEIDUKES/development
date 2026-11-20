import { useCallback, useEffect, useState } from 'react';
import { Check, Settings } from 'lucide-react';
import type {
  ModelRouterCapabilityStatus,
  ModelRouterStatus,
} from '../../server/model-router/status';
import { quotedEnergyGrade, EnergyActionCost, ENERGY_GRADE_LABELS, ENERGY_GRADES, ENERGY_TIER_MODELS, ENERGY_USD, GENERATION_ENERGY_MARGIN, type GradedEnergyKind } from '@seihouse/library/energy';
import { selectQuotedModel, useModelPreference, useReasoningPreferences, useTextRolePreference, useTierPreference, writeTierModel, writeTierPreference, type ModelPreferenceCapability } from '../generation/modelPreference';
import { BLUEPRINT_DEFAULT_MODEL, BLUEPRINT_DEFAULT_REASONING, TAGGER_DEFAULT_MODEL, TAGGER_DEFAULT_REASONING, type ImageJob } from '../generation/modelDefaults';
import { useUsageLog } from '../usage/usageLog';
import { TierBadge } from './TierBadge';
import { HostDialog } from '../dialog/HostDialog';

type Load =
  | { state: 'loading' }
  | { state: 'ready'; status: ModelRouterStatus }
  | { state: 'error'; message: string };

const CAPABILITY_LABELS = {
  chapters: 'Text',
  images: 'Images',
  tts: 'Text to speech',
  live: 'Live speech',
  audio: 'Audio',
  video: 'Video',
  '3d': '3D',
} as const;

/** Why a capability's model is not chosen here. */
const SERVER_OWNED_NOTE: Partial<Record<ModelRouterCapabilityStatus['id'], string>> = {
  tts: 'Reads written lines aloud. Codex quotes use their curated ElevenLabs voices and server model (ELEVENLABS_MODEL_ID). MiniMax speech is available to server integrations using MiniMax voice IDs.',
  audio: 'Gemini Lyria models are listed for reference; audio generation is not connected to a Workshop feature yet.',
  video: 'MiniMax video models have a server adapter; Veo is catalog only. No Workshop feature generates video yet. MiniMax model access depends on your subscription tier.',
  '3d': 'Tripo models are listed for reference; 3D generation is not connected to a Workshop feature yet.',
};

const isStatus = (value: unknown): value is ModelRouterStatus =>
  Boolean(value) && typeof value === 'object' && Array.isArray((value as ModelRouterStatus).capabilities);

type RouterModel = ModelRouterCapabilityStatus['models'][number];
type RouterProvider = ModelRouterCapabilityStatus['providers'][number];

const field = 'block min-h-11 w-full min-w-0 rounded-lg border border-white/15 bg-[#0c1018] px-3 text-base text-white/90 sm:text-sm';
const label = 'mb-1 block text-xs font-medium text-white/65';
const disclosure = 'min-h-11 cursor-pointer content-center text-sm font-medium text-white/75';
const nameOf = (model: RouterModel) => model.label.replace(/ · OpenRouter$/, '');

type TextJob = 'Chapter' | 'Tagger' | 'Blueprint';

function useQuoteWorkload(job: TextJob) {
  const entries = useUsageLog();
  // Use a comparable, reported workload at standard context rates. Without a
  // receipt, the reference is the measured chapter scale in HARNESS_PRINCIPLES.
  const receipt = entries.slice().reverse().find(entry => !entry.tokensEstimated
    && (job === 'Chapter' ? entry.kind === 'chapter' : job === 'Tagger' ? entry.task === 'Tagging' : entry.kind === 'blueprint')
    && Number.isSafeInteger(entry.inputTokens) && entry.inputTokens! > 0 && entry.inputTokens! < 100_000
    && Number.isSafeInteger(entry.outputTokens) && entry.outputTokens! > 0);
  const input = receipt?.inputTokens ?? 9000;
  const output = receipt ? Math.max(receipt.outputTokens!, (receipt.totalTokens ?? 0) - input) : 3500;
  const basis = (receipt ? 'Last ' + job.toLowerCase() + ' receipt' : 'Reference workload') +
    ' · ' + input.toLocaleString() + ' input / ' + output.toLocaleString() + ' output tokens';
  return { input, output, basis };
}

type Workload = ReturnType<typeof useQuoteWorkload>;

function quote(model: RouterModel | undefined, workload: Workload) {
  const price = model?.price;
  if (!price) return { amount: undefined, minimum: false, basis: 'No verified estimate for this model.' };
  const usd = 'usd' in price ? price.usd : (price.input * workload.input + price.output * workload.output) / 1_000_000;
  const energy = Math.ceil(Number((usd * GENERATION_ENERGY_MARGIN / ENERGY_USD).toPrecision(15)));
  const minimum = 'minimum' in price && price.minimum;
  return {
    amount: energy, minimum,
    basis: ('basis' in price ? price.basis : workload.basis) + ' · $' + Number(usd.toPrecision(4)) + ' provider cost',
  };
}

function EnergyQuote({ estimate, perMinute = false }: { estimate: ReturnType<typeof quote>; perMinute?: boolean }) {
  const { amount, minimum } = estimate;
  if (amount === undefined) return <span className="text-xs text-amber-200">Price unavailable</span>;
  const description = (minimum ? 'From ' : 'Approximately ') + amount + ' Energy' + (perMinute ? '/min' : '');
  return <span role="img" aria-label={description} title={description} className="inline-flex shrink-0 items-center gap-1 text-xs text-amber-200">
    <span aria-hidden="true">{minimum ? 'From' : '≈'}</span>
    <EnergyActionCost price={amount} projected />
    {perMinute && <span aria-hidden="true">/min</span>}
  </span>;
}

const byName = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const sortedProviders = (capability: ModelRouterCapabilityStatus) =>
  [...capability.providers].sort((a, b) => byName.compare(a.label, b.label));
const providerModels = (capability: ModelRouterCapabilityStatus, provider: RouterProvider['id']) =>
  capability.models.filter(model => model.provider === provider).sort((a, b) => byName.compare(nameOf(a), nameOf(b)));

function ModelOptions({ capability }: { capability: ModelRouterCapabilityStatus }) {
  return sortedProviders(capability).map(provider => {
    const models = providerModels(capability, provider.id).filter(model => model.available);
    return models.length ? <optgroup key={provider.id} label={provider.label}>
      {models.map(model => <option key={model.id} value={model.id}>{nameOf(model)}</option>)}
    </optgroup> : null;
  });
}

function Reasoning({ model, value, defaultLevel, onChange }: {
  model?: RouterModel; value?: string; defaultLevel?: string; onChange: (level?: string) => void;
}) {
  const reasoning = model?.reasoning;
  if (!reasoning) return null;
  return <label className="block">
    <span className={label}>Reasoning</span>
    <select aria-label="Reasoning" className={field} value={reasoning.levels.some(level => level === value) ? value : ''}
      onChange={event => onChange(event.target.value || undefined)}>
      <option value="">Default ({defaultLevel ?? reasoning.defaultLevel})</option>
      {reasoning.levels.map(level => <option key={level} value={level}>{level}</option>)}
    </select>
  </label>;
}

function QuoteDetails({ model, workload, kind }: { model?: RouterModel; workload: Workload; kind?: GradedEnergyKind }) {
  const estimate = quote(model, workload);
  const grade = quotedEnergyGrade(kind, estimate.amount);
  return <div className="rounded-lg bg-white/[0.04] px-3 py-2.5 text-xs text-white/65">
    <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2">Estimated Energy {grade && <TierBadge grade={grade} />}</span><EnergyQuote estimate={estimate} /></div>
    <p className="mt-1">{estimate.basis}</p>
    {model?.price && <p className="mt-1">Provider cost × {GENERATION_ENERGY_MARGIN}, rounded up at ${ENERGY_USD.toFixed(2)} per Energy.</p>}
  </div>;
}

function TextRoleSettings({ job, capability, chapter, workload }: {
  job: 'Tagger' | 'Blueprint'; capability: ModelRouterCapabilityStatus; chapter?: RouterModel; workload: Workload;
}) {
  const [choice, setChoice] = useTextRolePreference(job === 'Tagger' ? 'tagger' : 'blueprint');
  const own = capability.models.find(model => model.available && model.id === choice.model);
  const unavailable = !!choice.model && !own;
  const defaultId = capability.textDefaults?.[job];
  const defaultModel = capability.models.find(item => item.id === defaultId) ?? (job === 'Tagger' ? chapter : undefined);
  const model = unavailable ? (job === 'Tagger' ? chapter : undefined) : own ?? defaultModel;
  const providers = sortedProviders(capability).filter(item => capability.models.some(model => model.available && model.provider === item.id));
  const [provider, setProvider] = useState(model?.available ? model.provider : providers[0]?.id);
  const browsingOther = !!own && own.provider !== provider;
  const defaultLevel = job === 'Tagger'
    ? model?.id === TAGGER_DEFAULT_MODEL ? TAGGER_DEFAULT_REASONING : model?.reasoning?.levels[0]
    : model?.id === BLUEPRINT_DEFAULT_MODEL ? BLUEPRINT_DEFAULT_REASONING : undefined;
  return <div className="space-y-3">
    <label className="block"><span className={label}>Provider</span>
      <select aria-label="Provider" className={field} value={provider ?? ''} onChange={event => setProvider(event.target.value as RouterProvider['id'])}>
        {providers.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
    <label className="block"><span className={label}>{job} model</span>
      <select aria-label={job + ' model'} className={field} value={browsingOther ? 'browse' : choice.model ?? ''} onChange={event => {
        const next = event.target.value || undefined;
        const nextModel = capability.models.find(item => item.id === next) ?? defaultModel;
        const level = nextModel?.reasoning?.levels.find(level => level === choice.reasoningLevel);
        setChoice({ model: next, reasoningLevel: level });
      }}>
        {browsingOther && <option value="browse" disabled>Current · {nameOf(own)}</option>}
        <option value="">Default · {defaultModel ? nameOf(defaultModel) : defaultId ?? 'Unavailable'}{defaultModel && !defaultModel.available ? ' · unavailable' : ''}</option>
        {unavailable && <option value={choice.model} disabled>{choice.model} · unavailable{job === 'Tagger' && model ? ` · using ${nameOf(model)}` : ''}</option>}
        {provider && providerModels(capability, provider).filter(item => item.available).map(item =>
          <option key={item.id} value={item.id}>{nameOf(item)}</option>)}
      </select>
    </label>
    <Reasoning model={model} value={choice.reasoningLevel} defaultLevel={defaultLevel}
      onChange={reasoningLevel => setChoice({ model: choice.model, reasoningLevel })} />
    <QuoteDetails kind="chapter" model={model} workload={workload} />
  </div>;
}

/** Capabilities whose model the reader chooses here; the rest are set on the server. */
const SELECTABLE: Partial<Record<ModelRouterCapabilityStatus['id'], { preference: ModelPreferenceCapability; note?: string }>> = {
  chapters: { preference: 'chapters' },
  live: { preference: 'live', note: 'Hears and answers in one conversation: the Familiar\'s live talk (Familiar page → settings → Live talk) uses the model chosen here.' },
};

const ENERGY_KIND: Partial<Record<ModelRouterCapabilityStatus['id'], GradedEnergyKind>> = {
  chapters: 'chapter', images: 'image', live: 'live-minute',
};

function TierSettings({ capability, kind, preference, selected, workload }: {
  capability: ModelRouterCapabilityStatus; kind: GradedEnergyKind; preference: ModelPreferenceCapability;
  selected?: RouterModel; workload: Workload;
}) {
  const tiers = useTierPreference(preference);
  return <section aria-label="Tiers" className="space-y-2">
    <h3 className={label}>Generation tier</h3>
    <div className="space-y-1" role="group" aria-label="Choose tier">
      {ENERGY_GRADES.map(grade => {
        const model = capability.models.find(item => item.id === tiers.models[grade]);
        const active = !tiers.exact && (tiers.tier ?? 'mortal') === grade && !!selected && selected.id === model?.id;
        return <button key={grade} type="button" data-tier={grade} aria-pressed={active} disabled={!model?.available}
          onClick={() => writeTierPreference(preference, grade)}
          className={'flex min-h-12 w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left disabled:opacity-50 ' +
            (active ? 'border-cyan-400/45 bg-cyan-400/10' : 'border-white/10 bg-white/[0.025]')}>
          <span className="min-w-0 flex-1">
            <TierBadge grade={grade} className="text-[10px] uppercase tracking-wider" />
            <span className="mt-0.5 block break-words text-xs text-white/75">{model ? nameOf(model) : 'Unassigned'}{model && !model.available && ' · unavailable'}</span>
          </span>
          <EnergyQuote estimate={quote(model, workload)} perMinute={kind === 'live-minute'} />
          {active && <Check size={15} aria-hidden="true" className="text-cyan-300" />}
        </button>;
      })}
    </div>
    <details className="border-b border-white/10">
      <summary className={disclosure}>Edit tier models</summary>
      <div className="space-y-2 pb-3">
        {ENERGY_GRADES.map(grade => {
          const team = capability.models.find(model => model.id === ENERGY_TIER_MODELS[kind][grade]);
          return <label key={grade} className="block"><span className={label}>{ENERGY_GRADE_LABELS[grade]} model</span>
            <select aria-label={ENERGY_GRADE_LABELS[grade] + ' model'} className={field} value={tiers.local[grade] ?? ''} onChange={event => writeTierModel(preference, grade, event.target.value || undefined,
                grade === 'mortal' && !tiers.exact && !tiers.tier && !!selected && selected.id === tiers.models[grade])}>
              <option value="">Team default · {team ? nameOf(team) : 'Unassigned'}</option>
              <ModelOptions capability={capability} />
            </select>
          </label>;
        })}
        <p className="text-xs text-white/55">Tier assignments are saved on this device.</p>
      </div>
    </details>
  </section>;
}

function CapabilitySettings({ capability, imageJob }: { capability: ModelRouterCapabilityStatus; imageJob?: ImageJob }) {
  const choice = imageJob ? { preference: imageJob } : SELECTABLE[capability.id];
  const [saved, setSaved] = useModelPreference(choice?.preference ?? 'chapters');
  const defaultModel = imageJob ? capability.imageDefaults?.[imageJob] : capability.defaultModel;
  const selected = capability.models.find(model => model.available && model.id === saved)
    ?? capability.models.find(model => model.id === defaultModel);
  const [provider, setProvider] = useState(selected?.provider ?? capability.providers[0].id);
  const activeProvider = capability.providers.find(item => item.id === provider)!;
  const [reasoning, setReasoning] = useReasoningPreferences();
  const [job, setJob] = useState<TextJob>('Chapter');
  const workload = useQuoteWorkload(job);
  const isText = capability.id === 'chapters';
  const kind = ENERGY_KIND[capability.id];
  const note = choice?.note ?? SERVER_OWNED_NOTE[capability.id];
  const consumers = capability.consumers.filter(consumer => (!isText || (consumer.textJob ?? 'Chapter') === job)
    && (!imageJob || consumer.imageJob === imageJob));
  const browser = <div className="space-y-2 pb-2">
    <label className="block"><span className={label}>Provider</span>
      <select aria-label="Provider" className={field} value={provider} onChange={event => setProvider(event.target.value as RouterProvider['id'])}>
        {sortedProviders(capability).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
    {!activeProvider.configured && <p className="text-xs text-white/60">Add {activeProvider.keyVariable} in Vercel to use these models.</p>}
    {provider === 'lmstudio' && <p className="text-xs text-white/60">Uses the model loaded in LM Studio on port 1234.</p>}
    <h3 className={label}>{activeProvider.label} models</h3>
    <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
      {providerModels(capability, provider).map(model => {
        const estimate = quote(model, workload);
        const grade = quotedEnergyGrade(kind, estimate.amount);
        const selectedHere = selected?.id === model.id;
        const body = <><span className="min-w-0 flex-1">
          <span className="block text-sm">{nameOf(model)}</span>
          <span className="block break-all font-mono text-[10px] text-white/55">{model.id}</span>
          {model.stage !== 'current' && <span className="text-xs text-amber-200">{model.stage} </span>}
          {!model.implemented && <span className="text-xs text-white/55">Catalog only</span>}
        </span>
        {grade && <TierBadge grade={grade} className="text-[10px]" />}
        {kind && <EnergyQuote estimate={estimate} perMinute={kind === 'live-minute'} />}
        {selectedHere && <Check size={14} aria-label="Selected" className="shrink-0 text-cyan-300" />}</>;
        return <li key={model.id} data-model={model.id}>{choice
          ? <button type="button" aria-pressed={selectedHere} disabled={!model.available} onClick={() => {
              if (choice.preference !== 'live') selectQuotedModel(choice.preference, model.id, grade);
              else setSaved(model.id);
            }}
              className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left disabled:opacity-45">{body}</button>
          : <div className="flex items-center gap-2 px-3 py-2">{body}</div>}</li>;
      })}
    </ul>
  </div>;

  return <div className="space-y-3" aria-label={capability.label + ' router'}>
    {isText && <div role="group" aria-label="Text task" className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/[0.025] p-1">
      {(['Chapter', 'Tagger', 'Blueprint'] as const).map(item => <button key={item} type="button" aria-pressed={job === item}
        className={'min-h-11 rounded-md text-sm ' + (job === item ? 'bg-cyan-400/15 font-semibold text-cyan-100' : 'text-white/65')}
        onClick={() => setJob(item)}>{item}</button>)}
    </div>}
    {isText && job !== 'Chapter' ? <TextRoleSettings key={job} job={job} capability={capability} chapter={selected} workload={workload} /> : <>
      {choice && kind && <>
        <p className="text-sm text-white/80"><span className="text-white/55">Active model · </span>{selected ? nameOf(selected) : 'None selected'}</p>
        {browser}
        {kind === 'live-minute' && <TierSettings capability={capability} preference={choice.preference} kind={kind} selected={selected} workload={workload} />}
        <div className="space-y-2">
          {isText && <Reasoning model={selected} value={selected && reasoning[selected.id]} onChange={level => selected && setReasoning(selected.id, level)} />}
          <QuoteDetails kind={kind} model={selected} workload={workload} />
        </div>
      </>}
      {!choice && browser}
      {note && <p className="text-xs text-white/60">{note}</p>}
    </>}
    <details aria-label="Used by" className="border-t border-white/10">
      <summary className={disclosure}>Used by</summary>
      {consumers.length ? <ul className="space-y-1.5 pb-2 text-xs text-white/70">
        {consumers.map(consumer => <li key={consumer.name}>{consumer.name} · {consumer.modelChoice === 'router' ? 'follows router' : 'server default'}</li>)}
      </ul> : <p className="text-xs text-white/55">No connected feature yet.</p>}
    </details>
  </div>;
}

const IMAGE_JOB_LABELS: Record<ImageJob, string> = { images: 'Cover art / profile', 'codex-images': 'Codex' };

function CapabilityPanel({ capability }: { capability: ModelRouterCapabilityStatus }) {
  const [imageJob, setImageJob] = useState<ImageJob>('images');
  if (capability.id !== 'images') return <CapabilitySettings capability={capability} />;
  return <div className="space-y-3">
    <div role="group" aria-label="Image task" className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/[0.025] p-1">
      {(Object.keys(IMAGE_JOB_LABELS) as ImageJob[]).map(item => <button key={item} type="button" aria-pressed={imageJob === item}
        className={'min-h-11 rounded-md px-2 text-sm ' + (imageJob === item ? 'bg-cyan-400/15 font-semibold text-cyan-100' : 'text-white/65')}
        onClick={() => setImageJob(item)}>{IMAGE_JOB_LABELS[item]}</button>)}
    </div>
    <CapabilitySettings key={imageJob} capability={capability} imageJob={imageJob} />
  </div>;
}

/** The router's content: capability and task selection over live server status. */
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
      <label className="block"><span className={label}>Capability</span>
        <select aria-label="Capability" className={field} value={active} onChange={event => setActive(event.target.value as typeof active)}>
          {Object.entries(CAPABILITY_LABELS).map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select>
      </label>

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
  return <HostDialog fullScreen open={open} onClose={onClose} title="Model Router"><ModelRouterPanel /></HostDialog>;
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
