import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, Lock, Sparkles } from 'lucide-react';
import { LibraryButton, LibraryPanel } from '@seihouse/library-ui';
import { SEIInlineAlert, SEILoadingState } from '@seihouse/ui';
import { familiarRarityLabel, type FamiliarOption } from '../../familiar/shared/familiar';
import {
  bondRankLabel,
  FAMILIAR_ELEMENT_LABELS,
  familiarFormFilter,
  type ActiveElementalEffectSelection,
  type FamiliarUnlock,
  type OfferQiResponse,
  type SelectFamiliarFormInput,
} from '../../../library/familiars/contracts';
import type { FamiliarsState } from '../../../library/familiars/familiarsClient';
import './familiarTraining.css';

/** What `useFamiliars()` returns; any host adapter with the same shape works. */
export type FamiliarsAccount = FamiliarsState & {
  refresh(): Promise<void>;
  offerQi(familiarId: string, amount: number): Promise<OfferQiResponse>;
  selectForm(input: SelectFamiliarFormInput): Promise<unknown>;
  selectElementalEffect(selection: ActiveElementalEffectSelection): Promise<unknown>;
  connected: boolean;
};

const DEFAULT_OFFERS = [100, 500, 1_000] as const;
const formatWhole = (value: number) => value.toLocaleString('en-US');

function unlockLine(unlock: FamiliarUnlock, name: string) {
  switch (unlock.kind) {
    case 'bond-effect': return `${unlock.effect.label} on your name while ${name} is active`;
    case 'form': return unlock.form.label;
    case 'mastery': return `Master ${FAMILIAR_ELEMENT_LABELS[unlock.element]}: ${unlock.effect.label} joins your collection, wearable with any Familiar`;
    case 'signature': return `Signature: ${unlock.effect.label}, ${name}’s own piece`;
  }
}

export interface FamiliarTrainingPanelProps {
  familiars: FamiliarsAccount;
  /** The host's Familiar catalogue: names, rarity and artwork. Ownership comes from the server. */
  options: readonly FamiliarOption[];
  /** The cultivator's spendable QI, from the QI ledger; null while unknown. */
  qiBalance: number | null;
  /** The Active Familiar: the companion that follows the cultivator (host profile state). */
  activeFamiliarId?: string | null;
  /** Called after an offering lands, so the host can refresh its QI projection. */
  onOffered?: (response: OfferQiResponse) => void;
  offerAmounts?: readonly number[];
}

/**
 * Cultivating a Familiar's bond with QI. The Familiar's rarity is catalogue
 * content and never changes here; its Bond Rank is how far this cultivator
 * has cultivated it. Bond ranks lend stronger elemental titles, forms and
 * any signature piece, and Legendary bond masters the element. The server
 * decides every spend and unlock; this panel asks and shows the answer.
 * Nothing here grants a boost, discount, or other advantage.
 */
export function FamiliarTrainingPanel({
  familiars, options, qiBalance, activeFamiliarId, onOffered, offerAmounts = DEFAULT_OFFERS,
}: FamiliarTrainingPanelProps) {
  const snapshot = familiars.snapshot;
  const owned = useMemo(() => (snapshot?.familiars ?? []).filter(view => view.owned), [snapshot]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  useEffect(() => {
    if (!owned.length) return;
    if (!selectedId || !owned.some(view => view.familiarId === selectedId)) {
      setSelectedId(owned.find(view => view.familiarId === activeFamiliarId)?.familiarId ?? owned[0].familiarId);
    }
  }, [owned, selectedId, activeFamiliarId]);

  if (familiars.status === 'unavailable') {
    return <SEIInlineAlert tone="info" title="Familiar bonds not connected">Familiar ownership and bonds are not connected here.</SEIInlineAlert>;
  }
  if (!snapshot) {
    return familiars.status === 'error' ? (
      <SEIInlineAlert tone="danger" role="alert" title="Familiars unavailable">
        {familiars.error ?? 'Familiars are unavailable right now.'}
        <LibraryButton className="mt-3" size="sm" variant="secondary" onClick={() => void familiars.refresh()}>Try again</LibraryButton>
      </SEIInlineAlert>
    ) : <SEILoadingState size="sm" title="Loading Familiars" />;
  }

  const view = owned.find(entry => entry.familiarId === selectedId) ?? owned[0];
  if (!view) return <p className="text-sm text-neutral-400">No Familiars yet. Bring one home from the Celestial Store.</p>;
  const option = options.find(entry => entry.id === view.familiarId);
  const name = option?.name ?? view.familiarId;
  const form = view.unlockedForms.find(entry => entry.id === view.selection.formId) ?? null;
  const active = view.familiarId === activeFamiliarId;
  const bandStart = view.bondRanks.reduce((floor, rank) => rank.reached ? rank.qiRequired : floor, 0);
  const percent = view.nextBondRank ? Math.round(((view.qiOffered - bandStart) / (view.nextBondRank.qiRequired - bandStart)) * 100) : 100;
  const remaining = view.nextBondRank ? view.bondRanks[view.bondRanks.length - 1].qiRequired - view.qiOffered : 0;
  const identity = [option ? familiarRarityLabel(option.rarity) : 'Familiar', `${FAMILIAR_ELEMENT_LABELS[view.element]} element`, active ? 'Active Familiar' : null].filter(Boolean).join(' · ');

  const offer = async (amount: number) => {
    setMessage(null);
    try {
      const response = await familiars.offerQi(view.familiarId, amount);
      onOffered?.(response);
      setMessage({ tone: 'success', text: response.message });
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'The offering could not be made. No QI was spent.' });
    }
  };
  const chooseForm = async (formId: string | null) => {
    setMessage(null);
    try {
      await familiars.selectForm({ familiarId: view.familiarId, formId });
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'That form could not be chosen.' });
    }
  };

  return (
    <div className="familiar-training min-w-0 space-y-4" data-familiar-training={view.familiarId}>
      {owned.length > 1 && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Familiar to cultivate">
          {owned.map(entry => {
            const label = options.find(candidate => candidate.id === entry.familiarId)?.name ?? entry.familiarId;
            return (
              <button key={entry.familiarId} type="button" role="radio" aria-checked={entry.familiarId === view.familiarId}
                onClick={() => { setSelectedId(entry.familiarId); setMessage(null); }}
                className={`familiar-training-chip${entry.familiarId === view.familiarId ? ' is-selected' : ''}`}>
                {label}<span className="text-neutral-500"> · {bondRankLabel(entry.bondRank)}</span>
              </button>
            );
          })}
        </div>
      )}

      <LibraryPanel padding="md" as="section" aria-labelledby="familiar-training-name">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="familiar-training-portrait" data-familiar-form={form?.id ?? 'base'}>
            {option?.heroUrl || option?.stillUrl ? (
              <img src={option.heroUrl || option.stillUrl} alt={`${name}${form ? `, ${form.label}` : ''}`}
                style={{ filter: familiarFormFilter(form) }} />
            ) : <Sparkles size={40} aria-hidden className="text-neutral-600" />}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="reward-like-heading" data-familiar-identity>{identity}</p>
            <h3 id="familiar-training-name" className="mt-1 font-display text-xl text-neutral-100">{name}</h3>
            <p className="mt-1 font-serif text-lg text-sky-300" data-familiar-bond={view.bondRank}>{bondRankLabel(view.bondRank)}</p>
            <div className="familiar-training-track mt-2" role="progressbar" aria-label={`${name} bond`}
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
              aria-valuetext={view.nextBondRank ? `${formatWhole(view.qiOffered)} of ${formatWhole(view.nextBondRank.qiRequired)} QI toward ${bondRankLabel(view.nextBondRank.rank)}` : 'Legendary bond reached'}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-1 font-mono text-[11px] text-neutral-400" data-familiar-qi-offered>
              {view.nextBondRank
                ? `${formatWhole(view.qiOffered)} / ${formatWhole(view.nextBondRank.qiRequired)} QI · ${formatWhole(view.nextBondRank.qiRemaining)} to ${bondRankLabel(view.nextBondRank.rank)}`
                : `${formatWhole(view.qiOffered)} QI offered · ${FAMILIAR_ELEMENT_LABELS[view.element]} mastered`}
            </p>
          </div>
        </div>
      </LibraryPanel>

      <LibraryPanel padding="md" as="section" aria-labelledby="familiar-training-offer">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="familiar-training-offer" className="reward-like-heading">Cultivate the bond</h3>
          <p className="font-mono text-[11px] text-neutral-400" data-familiar-qi-balance>
            {qiBalance === null ? 'QI balance unavailable' : `${formatWhole(qiBalance)} QI available`}
          </p>
        </div>
        {view.nextBondRank ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {offerAmounts.map(amount => (
              <LibraryButton key={amount} size="sm" variant="secondary"
                disabled={familiars.pending || (qiBalance !== null && qiBalance < Math.min(amount, remaining))}
                onClick={() => void offer(amount)} data-familiar-offer={amount}>
                Offer {formatWhole(Math.min(amount, remaining))} QI
              </LibraryButton>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-neutral-300">{name} has reached Legendary bond. Every bond reward is yours.</p>}
        {message ? (
          <p role={message.tone === 'error' ? 'alert' : 'status'} aria-live="polite"
            className={`mt-3 text-sm ${message.tone === 'error' ? 'text-red-300' : 'text-emerald-200'}`} data-familiar-message>{message.text}</p>
        ) : null}
        <ol className="mt-4 space-y-2" aria-label={`${name} bond ranks`}>
          {view.bondRanks.map(rank => (
            <li key={rank.rank} className="flex items-start gap-3 text-sm" data-familiar-bond-row={rank.rank} data-reached={rank.reached}>
              <span aria-hidden className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${rank.reached ? 'border-sky-300/60 text-sky-200' : 'border-white/15 text-neutral-600'}`}>
                {rank.reached ? <Check size={12} /> : <Lock size={10} />}
              </span>
              <span className="min-w-0">
                <span className={rank.reached ? 'text-neutral-100' : 'text-neutral-400'}>{bondRankLabel(rank.rank)}</span>
                <span className="font-mono text-[11px] text-neutral-500"> · {formatWhole(rank.qiRequired)} QI</span>
                {rank.unlocks.map(unlock => (
                  <span key={`${unlock.kind}:${unlock.kind === 'form' ? unlock.form.id : unlock.effect.id}`} className="block text-xs text-neutral-400" data-familiar-unlock={unlock.kind}>
                    {unlockLine(unlock, name)}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ol>
      </LibraryPanel>

      <LibraryPanel padding="md" as="section" aria-labelledby="familiar-training-form">
        <h3 id="familiar-training-form" className="reward-like-heading">{name}’s form</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <OptionButton selected={!view.selection.formId} onSelect={() => void chooseForm(null)} disabled={familiars.pending}>Base</OptionButton>
          {view.unlockedForms.map(entry => (
            <OptionButton key={entry.id} selected={view.selection.formId === entry.id} onSelect={() => void chooseForm(entry.id)} disabled={familiars.pending}>{entry.label}</OptionButton>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-neutral-500">
          Bonds change only how your Familiar and your name look. They never grant a boost, discount, or other advantage.
        </p>
      </LibraryPanel>
    </div>
  );
}

function OptionButton({ selected, onSelect, disabled, children }: { selected: boolean; onSelect: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} disabled={disabled} onClick={onSelect}
      className={`familiar-training-chip${selected ? ' is-selected' : ''}`}>{children}</button>
  );
}
