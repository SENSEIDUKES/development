import React, { useEffect, useMemo, useState } from 'react';
import { Check, Lock, Sparkles } from 'lucide-react';
import { LibraryButton, LibraryElementalTitle, LibraryPanel } from '@seihouse/library-ui';
import { SEIInlineAlert, SEILoadingState } from '@seihouse/ui';
import type { FamiliarOption } from '../../familiar/shared/familiar';
import {
  familiarFormFilter,
  type FamiliarCosmeticEffect,
  type FamiliarElement,
  type FamiliarForm,
  type FamiliarUnlock,
  type OfferQiResponse,
  type SelectFamiliarCosmeticsInput,
} from '../../../library/familiars/contracts';
import type { FamiliarsState } from '../../../library/familiars/familiarsClient';
import './familiarTraining.css';

/** What `useFamiliars()` returns; any host adapter with the same shape works. */
export type FamiliarsAccount = FamiliarsState & {
  refresh(): Promise<void>;
  offerQi(familiarId: string, amount: number): Promise<OfferQiResponse>;
  selectCosmetics(input: SelectFamiliarCosmeticsInput): Promise<unknown>;
  connected: boolean;
};

const ELEMENT_LABELS: Record<FamiliarElement, string> = {
  fire: 'Fire', lightning: 'Lightning', frost: 'Frost', celestial: 'Celestial', void: 'Void',
};
const DEFAULT_OFFERS = [100, 500, 1_000] as const;
const formatWhole = (value: number) => value.toLocaleString('en-US');
const unlockLabel = (unlock: FamiliarUnlock) => unlock.kind === 'form' ? unlock.form.label : unlock.effect.label;

function effectPreview(effect: FamiliarCosmeticEffect | null) {
  return effect
    ? { element: effect.element, intensity: effect.intensity, shadow: effect.intensity === 'legendary' ? 'outlined' as const : 'soft' as const }
    : { element: 'none' as const, intensity: 'subtle' as const, shadow: 'none' as const };
}

export interface FamiliarTrainingPanelProps {
  familiars: FamiliarsAccount;
  /** The host's Familiar catalogue: names and artwork. Ownership comes from the server. */
  options: readonly FamiliarOption[];
  /** The cultivator's spendable QI, from the QI ledger; null while unknown. */
  qiBalance: number | null;
  /** The name the elemental title letters. */
  displayName: string;
  /** The equipped Familiar; only its selected effect is active on the cultivator's name. */
  equippedFamiliarId?: string | null;
  /** Called after an offering lands, so the host can refresh its QI projection. */
  onOffered?: (response: OfferQiResponse) => void;
  offerAmounts?: readonly number[];
}

/**
 * Training a Familiar with QI. Offering QI raises the Familiar's tier; tiers
 * unlock alternate forms and cosmetic effects such as an elemental title on
 * the cultivator's name. The server decides every spend and unlock; this
 * panel asks and shows the answer. Nothing here grants a boost, discount, or
 * other advantage.
 */
export function FamiliarTrainingPanel({
  familiars, options, qiBalance, displayName, equippedFamiliarId, onOffered, offerAmounts = DEFAULT_OFFERS,
}: FamiliarTrainingPanelProps) {
  const snapshot = familiars.snapshot;
  const owned = useMemo(() => (snapshot?.familiars ?? []).filter(view => view.owned), [snapshot]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  useEffect(() => {
    if (!owned.length) return;
    if (!selectedId || !owned.some(view => view.familiarId === selectedId)) {
      setSelectedId(owned.find(view => view.familiarId === equippedFamiliarId)?.familiarId ?? owned[0].familiarId);
    }
  }, [owned, selectedId, equippedFamiliarId]);

  if (familiars.status === 'unavailable') {
    return <SEIInlineAlert tone="info" title="Familiar training not connected">Familiar ownership and training are not connected here.</SEIInlineAlert>;
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
  const effect = view.unlockedEffects.find(entry => entry.id === view.selection.effectId) ?? null;
  const equipped = view.familiarId === equippedFamiliarId;
  const preview = effectPreview(effect);
  const top = view.tiers[view.tiers.length - 1];
  const bandStart = view.tiers.reduce((floor, tier) => tier.reached ? tier.qiRequired : floor, 0);
  const percent = view.nextTier ? Math.round(((view.qiOffered - bandStart) / (view.nextTier.qiRequired - bandStart)) * 100) : 100;

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
  const choose = async (next: Partial<Pick<SelectFamiliarCosmeticsInput, 'formId' | 'effectId'>>) => {
    setMessage(null);
    try {
      await familiars.selectCosmetics({ familiarId: view.familiarId, formId: view.selection.formId, effectId: view.selection.effectId, ...next });
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'That look could not be chosen.' });
    }
  };
  const remaining = view.nextTier ? top.qiRequired - view.qiOffered : 0;

  return (
    <div className="familiar-training min-w-0 space-y-4" data-familiar-training={view.familiarId}>
      {owned.length > 1 && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Familiar to train">
          {owned.map(entry => {
            const label = options.find(candidate => candidate.id === entry.familiarId)?.name ?? entry.familiarId;
            return (
              <button key={entry.familiarId} type="button" role="radio" aria-checked={entry.familiarId === view.familiarId}
                onClick={() => { setSelectedId(entry.familiarId); setMessage(null); }}
                className={`familiar-training-chip${entry.familiarId === view.familiarId ? ' is-selected' : ''}`}>
                {label}<span className="text-neutral-500"> · {entry.tierName}</span>
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
            <p className="reward-like-heading">{ELEMENT_LABELS[view.element]} Familiar{equipped ? ' · Equipped' : ''}</p>
            <h3 id="familiar-training-name" className="mt-1 font-display text-xl text-neutral-100">{name}</h3>
            <p className="mt-1 font-serif text-lg text-sky-300" data-familiar-tier={view.tier}>{view.tierName}</p>
            <div className="familiar-training-track mt-2" role="progressbar" aria-label={`${name} training`}
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
              aria-valuetext={view.nextTier ? `${formatWhole(view.qiOffered)} of ${formatWhole(view.nextTier.qiRequired)} QI toward ${view.nextTier.name}` : 'Fully trained'}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-1 font-mono text-[11px] text-neutral-400" data-familiar-qi-offered>
              {view.nextTier
                ? `${formatWhole(view.qiOffered)} / ${formatWhole(view.nextTier.qiRequired)} QI · ${formatWhole(view.nextTier.qiRemaining)} to ${view.nextTier.name}`
                : `${formatWhole(view.qiOffered)} QI offered · fully trained`}
            </p>
          </div>
        </div>
      </LibraryPanel>

      <LibraryPanel padding="md" as="section" aria-labelledby="familiar-training-offer">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="familiar-training-offer" className="reward-like-heading">Offer QI</h3>
          <p className="font-mono text-[11px] text-neutral-400" data-familiar-qi-balance>
            {qiBalance === null ? 'QI balance unavailable' : `${formatWhole(qiBalance)} QI available`}
          </p>
        </div>
        {view.nextTier ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {offerAmounts.map(amount => (
              <LibraryButton key={amount} size="sm" variant="secondary"
                disabled={familiars.pending || (qiBalance !== null && qiBalance < Math.min(amount, remaining))}
                onClick={() => void offer(amount)} data-familiar-offer={amount}>
                Offer {formatWhole(Math.min(amount, remaining))} QI
              </LibraryButton>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-neutral-300">{name} is fully trained. Every form and effect is unlocked.</p>}
        {message ? (
          <p role={message.tone === 'error' ? 'alert' : 'status'} aria-live="polite"
            className={`mt-3 text-sm ${message.tone === 'error' ? 'text-red-300' : 'text-emerald-200'}`} data-familiar-message>{message.text}</p>
        ) : null}
        <ol className="mt-4 space-y-2" aria-label={`${name} training tiers`}>
          {view.tiers.map(tier => (
            <li key={tier.tier} className="flex items-start gap-3 text-sm" data-familiar-tier-row={tier.tier} data-reached={tier.reached}>
              <span aria-hidden className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${tier.reached ? 'border-sky-300/60 text-sky-200' : 'border-white/15 text-neutral-600'}`}>
                {tier.reached ? <Check size={12} /> : <Lock size={10} />}
              </span>
              <span className="min-w-0">
                <span className={tier.reached ? 'text-neutral-100' : 'text-neutral-400'}>{tier.name}</span>
                <span className="font-mono text-[11px] text-neutral-500"> · {formatWhole(tier.qiRequired)} QI</span>
                <span className="block text-xs text-neutral-400">{tier.unlocks.length ? tier.unlocks.map(unlockLabel).join(' · ') : 'Bonded — where every Familiar starts'}</span>
              </span>
            </li>
          ))}
        </ol>
      </LibraryPanel>

      <LibraryPanel padding="md" as="section" aria-labelledby="familiar-training-look">
        <h3 id="familiar-training-look" className="reward-like-heading">Look</h3>
        <div className="familiar-title-preview mt-3" data-familiar-title-preview={effect?.id ?? 'none'}>
          <LibraryElementalTitle as="p" element={preview.element} intensity={preview.intensity} shadow={preview.shadow} size="lg"
            className="font-display">{displayName}</LibraryElementalTitle>
          <p className="mt-1 text-[11px] text-neutral-500">
            {effect ? (equipped ? `${effect.label} is active on your name.` : `Equip ${name} to wear ${effect.label} on your name.`) : 'No effect chosen: your name keeps your rank colours.'}
          </p>
        </div>
        <fieldset className="mt-4">
          <legend className="text-xs text-neutral-400">Effect</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <OptionButton selected={!view.selection.effectId} onSelect={() => void choose({ effectId: null })} disabled={familiars.pending}>None</OptionButton>
            {view.unlockedEffects.map(entry => (
              <OptionButton key={entry.id} selected={view.selection.effectId === entry.id} onSelect={() => void choose({ effectId: entry.id })} disabled={familiars.pending}>{entry.label}</OptionButton>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-4">
          <legend className="text-xs text-neutral-400">Form</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <OptionButton selected={!view.selection.formId} onSelect={() => void choose({ formId: null })} disabled={familiars.pending}>Base</OptionButton>
            {view.unlockedForms.map((entry: FamiliarForm) => (
              <OptionButton key={entry.id} selected={view.selection.formId === entry.id} onSelect={() => void choose({ formId: entry.id })} disabled={familiars.pending}>{entry.label}</OptionButton>
            ))}
          </div>
        </fieldset>
        <p className="mt-4 text-[11px] leading-relaxed text-neutral-500">
          Training changes only how your Familiar and your name look. It never grants a boost, discount, or other advantage.
        </p>
      </LibraryPanel>
    </div>
  );
}

function OptionButton({ selected, onSelect, disabled, children }: { selected: boolean; onSelect: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} disabled={disabled} onClick={onSelect}
      className={`familiar-training-chip${selected ? ' is-selected' : ''}`}>{children}</button>
  );
}

