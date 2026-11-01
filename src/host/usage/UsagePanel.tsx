/**
 * Usage: what this device has made and what it cost in Energy, in the
 * reader's words. "Behind the scenes" shows the models and the providers' own
 * counts. Opened from Settings → Advanced Tools → Usage in the app and its
 * Workshop preview. Reads the device's usage record (`usageLog.ts`).
 */
import { useEffect, useMemo, useState } from 'react';
import { AudioLines, BookOpenText, Image as ImageIcon, Map as MapIcon, type LucideIcon } from 'lucide-react';
import { ENERGY_GRADE_LABELS, modelEnergyGrade, type EnergyGrade } from '@seihouse/library/energy';
import type { ModelRouterStatus } from '../../server/model-router/status';
import { HostDialog } from '../dialog/HostDialog';
import { usageEnergy, useUsageLog, type UsageEntry, type UsageKind } from './usageLog';

type Range = 'today' | 'week' | 'month';
type View = 'energy' | 'behind';

const RANGES: { id: Range; label: string; days: number; phrase: string }[] = [
  { id: 'today', label: 'Today', days: 1, phrase: 'today' },
  { id: 'week', label: '7 days', days: 7, phrase: 'in the last 7 days' },
  { id: 'month', label: '30 days', days: 30, phrase: 'in the last 30 days' },
];

/** The reader-facing groups. Story upkeep belongs to its chapter. */
type Group = 'chapters' | 'pictures' | 'familiar' | 'worlds';
const GROUP_OF: Record<UsageKind, Group> = { chapter: 'chapters', 'story-upkeep': 'chapters', image: 'pictures', live: 'familiar', blueprint: 'worlds' };
const GROUPS: { id: Group; icon: LucideIcon; color: string; tint: string; legend: string }[] = [
  { id: 'chapters', icon: BookOpenText, color: 'bg-violet-400', tint: 'bg-violet-400/15', legend: 'Chapters' },
  { id: 'pictures', icon: ImageIcon, color: 'bg-cyan-400', tint: 'bg-cyan-400/15', legend: 'Pictures' },
  { id: 'familiar', icon: AudioLines, color: 'bg-amber-300', tint: 'bg-amber-300/15', legend: 'Familiar talk' },
  { id: 'worlds', icon: MapIcon, color: 'bg-emerald-300', tint: 'bg-emerald-300/15', legend: 'Worlds' },
];

const GRADE_STYLES: Record<EnergyGrade, string> = {
  mortal: 'border-slate-300/25 text-slate-200',
  immortal: 'border-violet-400/40 text-violet-200',
  heaven: 'border-amber-300/45 text-amber-200',
};

/** Model names from the Model Router's own status (the same list it shows); a model's id until they arrive. */
function useModelLabels(endpoint = '/api/model-router'): Map<string, string> {
  const [labels, setLabels] = useState(() => new Map<string, string>());
  useEffect(() => {
    let current = true;
    void fetch(endpoint, { headers: { Accept: 'application/json' } })
      .then(response => (response.ok ? response.json() as Promise<ModelRouterStatus> : undefined))
      .then(status => {
        if (!current || !Array.isArray(status?.capabilities)) return;
        setLabels(new Map(status.capabilities.flatMap(capability => capability.models.map(model => [model.id, model.label.replace(/ · OpenRouter$/, '')] as const))));
      })
      .catch(() => undefined);
    return () => { current = false; };
  }, [endpoint]);
  return labels;
}

const number = new Intl.NumberFormat('en-US');
const plural = (count: number, one: string, many: string) => `${number.format(count)} ${count === 1 ? one : many}`;
/** "4 min 20 s": the exact time, the same in both views. */
const talkTime = (seconds: number) => (seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60} s` : ''}`);

/** Local midnight `offset` calendar days from `time`'s day. Calendar arithmetic, so a 23- or 25-hour day (daylight saving) is still one whole day. */
const midnight = (time: number, offset = 0) => { const day = new Date(time); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() + offset); return day.getTime(); };

/** "8 chapters written", in the reader's words. */
function describe(group: Group, entries: UsageEntry[]): string {
  if (group === 'chapters') return plural(entries.filter(entry => entry.kind === 'chapter').length, 'chapter written', 'chapters written');
  if (group === 'pictures') return plural(entries.length, 'picture made', 'pictures made');
  if (group === 'familiar') return `${talkTime(entries.reduce((sum, entry) => sum + (entry.seconds ?? 0), 0))} talking with your Familiar`;
  return plural(entries.length, 'world planned', 'worlds planned');
}

function EnergyView({ entries, range, now }: { entries: UsageEntry[]; range: typeof RANGES[number]; now: number }) {
  const total = entries.reduce((sum, entry) => sum + usageEnergy(entry), 0);
  const byGroup = GROUPS.map(group => ({ ...group, entries: entries.filter(entry => GROUP_OF[entry.kind] === group.id) }))
    .filter(group => group.entries.some(entry => entry.kind !== 'story-upkeep'));
  const days = range.days > 1 ? Array.from({ length: range.days }, (_, index) => {
    const start = midnight(now, index - (range.days - 1));
    const end = midnight(now, index - (range.days - 1) + 1);
    const dayEntries = entries.filter(entry => entry.at >= start && entry.at < end);
    return { start, parts: GROUPS.map(group => ({ group, energy: dayEntries.filter(entry => GROUP_OF[entry.kind] === group.id).reduce((sum, entry) => sum + usageEnergy(entry), 0) })) };
  }) : [];
  const highest = Math.max(1, ...days.map(day => day.parts.reduce((sum, part) => sum + part.energy, 0)));

  if (!byGroup.length) {
    return <p className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-6 text-center text-[13px] text-white/55">Nothing made {range.phrase}. Chapters, pictures and talks with your Familiar show here.</p>;
  }
  return (
    <div className="space-y-3">
      <div data-usage-total className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3">
        <p className="text-3xl font-semibold tabular-nums text-amber-200">{number.format(total)} <span className="text-base font-normal text-white/70">Energy</span></p>
        <p className="text-[12px] text-white/55">used {range.phrase}</p>
      </div>
      {days.length > 0 && (
        <figure className="rounded-lg border border-white/10 bg-white/[0.02] px-3 pb-2 pt-3">
          <div className="flex h-24 items-end gap-[3px]" role="img"
            aria-label={`Energy each day ${range.phrase}: ${days.map(day => day.parts.reduce((sum, part) => sum + part.energy, 0)).join(', ')}`}>
            {days.map(day => (
              <div key={day.start} className="flex h-full flex-1 flex-col-reverse overflow-hidden rounded-sm bg-white/[0.04]"
                title={`${new Date(day.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${day.parts.reduce((sum, part) => sum + part.energy, 0)} Energy`}>
                {day.parts.filter(part => part.energy > 0).map(part => (
                  <div key={part.group.id} className={part.group.color} style={{ height: `${(part.energy / highest) * 100}%` }} />
                ))}
              </div>
            ))}
          </div>
          <figcaption className="mt-1.5 space-y-1.5 text-[10px] text-white/40">
            <span className="flex justify-between">
              <span>{new Date(days[0].start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              <span>Today</span>
            </span>
            <span className="flex flex-wrap gap-x-3 gap-y-1" data-usage-legend>
              {GROUPS.filter(group => days.some(day => day.parts.some(part => part.group.id === group.id && part.energy > 0))).map(group => (
                <span key={group.id} className="flex items-center gap-1 text-white/55"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${group.color}`} />{group.legend}</span>
              ))}
            </span>
          </figcaption>
        </figure>
      )}
      <ul className="divide-y divide-white/5 rounded-lg border border-white/10 bg-white/[0.02]" aria-label="What you made">
        {byGroup.map(group => {
          const energy = group.entries.reduce((sum, entry) => sum + usageEnergy(entry), 0);
          const Icon = group.icon;
          return (
            <li key={group.id} data-usage-group={group.id} className="flex items-center gap-2.5 px-3 py-2.5">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${group.tint}`}><Icon aria-hidden="true" size={14} className="text-white/85" /></span>
              <span className="min-w-0 flex-1 text-[13px] text-white/85">{describe(group.id, group.entries)}</span>
              <span className="shrink-0 text-[13px] tabular-nums text-amber-200">{number.format(energy)} Energy</span>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] leading-snug text-white/40">
        Preview: Energy is counted here but not taken from your balance yet.
        {byGroup.some(group => group.id === 'familiar') ? ' Familiar talk counts every started 20 seconds.' : ''} Kept on this device for 90 days.
      </p>
    </div>
  );
}

function BehindTheScenes({ entries }: { entries: UsageEntry[] }) {
  const labels = useModelLabels();
  // A short name, with the model's id beneath it: "Nano Banana 2 Lite" over "google/gemini-3.1-flash-lite-image".
  const modelName = (model?: string) => (model ? (labels.get(model) ?? model).replace(/\s*\([^)]*\)$/, '') : 'Default model');
  const models = useMemo(() => {
    const grouped = new Map<string, UsageEntry[]>();
    for (const entry of entries) grouped.set(entry.model ?? '', [...(grouped.get(entry.model ?? '') ?? []), entry]);
    return [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [entries]);
  if (!models.length) return <p className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-6 text-center text-[13px] text-white/55">No model calls in this time.</p>;
  return (
    <div className="space-y-2">
      <ul className="space-y-2" aria-label="By model">
        {models.map(([model, calls]) => {
          const grade = modelEnergyGrade(model || undefined);
          const tokensIn = calls.reduce((sum, entry) => sum + (entry.inputTokens ?? 0), 0);
          const about = calls.some(entry => entry.tokensEstimated) ? '≈ ' : '';
          const tokensOut = calls.reduce((sum, entry) => sum + (entry.outputTokens ?? 0), 0);
          const chapters = calls.filter(entry => entry.kind === 'chapter').length;
          const upkeep = calls.filter(entry => entry.kind === 'story-upkeep');
          const images = calls.filter(entry => entry.kind === 'image').length;
          const blueprints = calls.filter(entry => entry.kind === 'blueprint').length;
          const seconds = calls.reduce((sum, entry) => sum + (entry.seconds ?? 0), 0);
          const energy = calls.reduce((sum, entry) => sum + usageEnergy(entry), 0);
          const parts = [
            chapters && plural(chapters, 'chapter', 'chapters'),
            upkeep.length && `${plural(upkeep.length, 'upkeep call', 'upkeep calls')} (${[...new Set(upkeep.map(entry => entry.task))].join(', ')})`,
            blueprints && plural(blueprints, 'Blueprint', 'Blueprints'),
            images && plural(images, 'image', 'images'),
            seconds && `${talkTime(seconds)} of live talk`,
          ].filter(Boolean);
          return (
            <li key={model} data-usage-model={model} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-white/90">{modelName(model || undefined)}</span>
                  {model && <span className="block truncate font-mono text-[10px] text-white/30">{model}</span>}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className={`rounded border px-1 py-px font-mono text-[9px] uppercase tracking-wider ${GRADE_STYLES[grade]}`}>{ENERGY_GRADE_LABELS[grade]}</span>
                  <span data-usage-model-energy className="text-[12px] tabular-nums text-amber-200">{number.format(energy)} Energy</span>
                </span>
              </div>
              <p className="text-[11px] text-white/55">{parts.join(' · ')}</p>
              {(tokensIn > 0 || tokensOut > 0) && (
                <p data-usage-tokens className="font-mono text-[10px] text-white/40">{about}{number.format(tokensIn)} tokens in · {number.format(tokensOut)} out</p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] leading-snug text-white/40">
        Token counts are each provider's own{entries.some(entry => entry.tokensEstimated) ? '; ≈ marks an estimate where a provider gave none' : ''}. A token is about three quarters of a word.
      </p>
    </div>
  );
}

export function UsagePanel({ now: fixedNow }: { now?: number }) {
  const [openedAt] = useState(() => Date.now());
  const now = fixedNow ?? openedAt;
  const log = useUsageLog();
  const [view, setView] = useState<View>('energy');
  const [rangeId, setRangeId] = useState<Range>('week');
  const range = RANGES.find(item => item.id === rangeId)!;
  const since = midnight(now, -(range.days - 1));
  const entries = useMemo(() => log.filter(entry => entry.at >= since), [log, since]);
  const pill = (active: boolean) => `host-touch rounded-md px-2.5 py-1.5 text-[12px] transition-colors ${active ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white/85'}`;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Usage view" className="flex rounded-lg border border-white/10 p-0.5">
          <button type="button" role="tab" aria-selected={view === 'energy'} className={pill(view === 'energy')} onClick={() => setView('energy')}>Energy</button>
          <button type="button" role="tab" aria-selected={view === 'behind'} className={pill(view === 'behind')} onClick={() => setView('behind')}>Behind the scenes</button>
        </div>
        <div role="radiogroup" aria-label="Time" className="flex rounded-lg border border-white/10 p-0.5">
          {RANGES.map(item => (
            <button key={item.id} type="button" role="radio" aria-checked={item.id === rangeId} className={pill(item.id === rangeId)} onClick={() => setRangeId(item.id)}>{item.label}</button>
          ))}
        </div>
      </div>
      {view === 'energy' ? <EnergyView entries={entries} range={range} now={now} /> : <BehindTheScenes entries={entries} />}
    </div>
  );
}

/** Usage over the page (see `HostDialog`). */
export function UsageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <HostDialog open={open} onClose={onClose} title="Usage"><UsagePanel /></HostDialog>;
}
