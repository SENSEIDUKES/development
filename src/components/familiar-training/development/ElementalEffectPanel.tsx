import { useState, type ReactNode } from 'react';
import { LibraryPanel } from '@seihouse/library-ui';
import type { FamiliarOption } from '../../familiar/shared/familiar';
import {
  activeNameEffect,
  bondRankLabel,
  FAMILIAR_ELEMENT_LABELS,
  FAMILIAR_ELEMENTS,
  familiarTraining,
  type ActiveElementalEffectSelection,
} from '../../../library/familiars/contracts';
import { FamiliarNameEffect } from './FamiliarNameEffect';
import type { FamiliarsAccount } from './FamiliarTrainingPanel';
import './familiarTraining.css';

export interface ElementalEffectPanelProps {
  familiars: FamiliarsAccount;
  options: readonly FamiliarOption[];
  /** The Active Familiar: the companion that follows the cultivator (host profile state). */
  activeFamiliarId?: string | null;
  /** The name the effect letters. */
  displayName: string;
}

const sameSelection = (a: ActiveElementalEffectSelection, b: ActiveElementalEffectSelection) =>
  a.source === b.source && (a.source !== 'mastered' || (b.source === 'mastered' && a.element === b.element));

/**
 * The Active Elemental Effect: what letters the cultivator's DAO name.
 *
 * Until an element is mastered, the effect is coupled to the Active Familiar —
 * its bond effect, or its signature piece. Legendary bond masters that
 * Familiar's element; a mastered element joins the permanent collection and
 * can be worn whichever Familiar is active. Elements are shared instruments
 * any cultivator can master; signatures belong to one Familiar and are never
 * collected.
 */
export function ElementalEffectPanel({ familiars, options, activeFamiliarId, displayName }: ElementalEffectPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const snapshot = familiars.snapshot;
  if (!snapshot) return null;
  const nameOf = (id: string) => options.find(option => option.id === id)?.name ?? id;
  const active = familiarTraining(snapshot, activeFamiliarId);
  const activeName = active ? nameOf(active.familiarId) : 'your Familiar';
  const resolved = activeNameEffect(snapshot, activeFamiliarId);
  const current = snapshot.activeEffect;
  const choose = async (selection: ActiveElementalEffectSelection) => {
    setError(null);
    try {
      await familiars.selectElementalEffect(selection);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'That effect could not be chosen.');
    }
  };
  const caption = !resolved
    ? 'No effect: your name keeps your rank colours.'
    : resolved.coupled
      ? `${resolved.effect.label} · follows ${activeName}${active ? ` (${bondRankLabel(active.bondRank)})` : ''}`
      : `${resolved.effect.label} · yours, whichever Familiar is active`;

  return (
    <LibraryPanel padding="md" as="section" aria-labelledby="familiar-name-effect" className="familiar-training" data-elemental-effect-panel>
      <h3 id="familiar-name-effect" className="reward-like-heading">Name effect</h3>
      <div className="familiar-title-preview mt-3" data-familiar-title-preview={resolved?.effect.id ?? 'none'} data-coupled={resolved?.coupled ?? undefined}>
        <FamiliarNameEffect as="p" size="lg" effect={resolved?.effect ?? null} className="font-display" plainClassName="text-2xl text-neutral-100">{displayName}</FamiliarNameEffect>
        <p className="mt-1 text-[11px] text-neutral-500">{caption}</p>
      </div>

      <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Active Elemental Effect">
        <EffectOption selected={current.source === 'bond'} disabled={familiars.pending} onSelect={() => void choose({ source: 'bond' })}
          title={`Follow ${activeName}`} detail={active ? `${active.bondEffect.label} · ${bondRankLabel(active.bondRank)}` : 'The Active Familiar’s bond effect'} />
        {active?.signature ? (
          <EffectOption selected={current.source === 'signature'} disabled={familiars.pending || !active.signature.unlocked} onSelect={() => void choose({ source: 'signature' })}
            title={`${activeName}’s signature`}
            detail={active.signature.unlocked ? active.signature.effect.label : `${active.signature.effect.label} · reach ${bondRankLabel(active.signature.requiredBondRank)}`} />
        ) : null}
        {snapshot.masteredElements.map(mastery => {
          const selection: ActiveElementalEffectSelection = { source: 'mastered', element: mastery.element };
          return (
            <EffectOption key={mastery.element} selected={sameSelection(current, selection)} disabled={familiars.pending} onSelect={() => void choose(selection)}
              title={mastery.effect.label} detail={`Mastered with ${nameOf(mastery.masteredWith)} · wear it with any Familiar`} />
          );
        })}
        <EffectOption selected={current.source === 'none'} disabled={familiars.pending} onSelect={() => void choose({ source: 'none' })}
          title="None" detail="Your rank colours" />
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}

      <h4 className="reward-like-heading mt-5">Mastered elements</h4>
      <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2" aria-label="Mastered elements">
        {FAMILIAR_ELEMENTS.map(element => {
          const mastery = snapshot.masteredElements.find(entry => entry.element === element);
          return (
            <li key={element} data-element-mastery={element} data-mastered={Boolean(mastery)} className={mastery ? 'text-neutral-200' : 'text-neutral-500'}>
              {FAMILIAR_ELEMENT_LABELS[element]}
              <span className="text-neutral-500"> · {mastery ? `mastered with ${nameOf(mastery.masteredWith)}` : `Legendary bond with a ${FAMILIAR_ELEMENT_LABELS[element].toLowerCase()} Familiar`}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[11px] leading-relaxed text-neutral-500">
        Before you master an element, your name effect follows your Active Familiar and grows with your bond. Reach Legendary bond to master its element for good, then wear it with any Familiar.
      </p>
    </LibraryPanel>
  );
}

function EffectOption({ selected, disabled, onSelect, title, detail }: { selected: boolean; disabled?: boolean; onSelect: () => void; title: string; detail: ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={onSelect}
      className={`familiar-training-chip familiar-effect-option${selected ? ' is-selected' : ''}`}>
      <span className="block text-sm">{title}</span>
      <span className="block text-[11px] text-neutral-400">{detail}</span>
    </button>
  );
}
