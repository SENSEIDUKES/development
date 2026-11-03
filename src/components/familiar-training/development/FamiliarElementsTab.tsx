import { useState, type ReactNode } from 'react';
import {
  activeNameEffect,
  bondRankLabel,
  FAMILIAR_ELEMENT_LABELS,
  FAMILIAR_ELEMENTS,
  familiarTraining,
  type ActiveElementalEffectSelection,
} from '../../../library/familiars/contracts';
import { FamiliarNameEffect } from './FamiliarNameEffect';
import type { FamiliarsAccount } from './familiarsAccount';

const sameSelection = (a: ActiveElementalEffectSelection, b: ActiveElementalEffectSelection) =>
  a.source === b.source && (a.source !== 'mastered' || (b.source === 'mastered' && a.element === b.element));

export interface FamiliarElementsTabProps {
  familiars: FamiliarsAccount;
  /** The Active Familiar: the companion that follows the cultivator. */
  activeFamiliarId?: string | null;
  /** Display names by Familiar id, personalized where the cultivator renamed one. */
  nameOf: (familiarId: string) => string;
  displayName: string;
}

/**
 * The Elements tab: what letters the cultivator's name, and the collection
 * of mastered elements. Bond effects follow the Active Familiar; a mastered
 * element is the cultivator's for good and can be worn with any Familiar,
 * including a custom one later. SEIHouse Signatures belong to one Familiar
 * and never join the collection.
 */
export function FamiliarElementsTab({ familiars, activeFamiliarId, nameOf, displayName }: FamiliarElementsTabProps) {
  const [error, setError] = useState<string | null>(null);
  const snapshot = familiars.snapshot;
  if (!snapshot) return <p className="familiar-stage-note">Elements appear once your Familiar bonds are connected.</p>;
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
    <div className="space-y-4" data-elemental-effect-panel>
      <div className="familiar-title-preview" data-familiar-title-preview={resolved?.effect.id ?? 'none'} data-coupled={resolved?.coupled ?? undefined}>
        <FamiliarNameEffect as="p" size="lg" effect={resolved?.effect ?? null} className="font-display" plainClassName="text-2xl text-neutral-100">{displayName}</FamiliarNameEffect>
        <p className="mt-1 text-[11px] text-neutral-400">{caption}</p>
      </div>

      <div>
        <h4 className="familiar-stage-heading" id="familiar-elements-wear">Your name wears</h4>
        <div className="mt-2 grid gap-2" role="radiogroup" aria-labelledby="familiar-elements-wear">
          <EffectOption selected={current.source === 'bond'} disabled={familiars.pending} onSelect={() => void choose({ source: 'bond' })}
            title={`Follow ${activeName}`} detail={active ? `${active.bondEffect.label} · ${bondRankLabel(active.bondRank)}` : 'The Active Familiar’s bond effect'} />
          {active?.signature ? (
            <EffectOption selected={current.source === 'signature'} disabled={familiars.pending || !active.signature.unlocked} onSelect={() => void choose({ source: 'signature' })}
              title={`${activeName}’s SEIHouse Signature`}
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
      </div>

      <div>
        <h4 className="familiar-stage-heading">Mastered elements · {snapshot.masteredElements.length} of {FAMILIAR_ELEMENTS.length}</h4>
        <ul className="familiar-element-collection" aria-label="Mastered elements">
          {FAMILIAR_ELEMENTS.map(element => {
            const mastery = snapshot.masteredElements.find(entry => entry.element === element);
            return (
              <li key={element} data-element-mastery={element} data-mastered={Boolean(mastery)} data-element={element}
                title={mastery ? `Mastered with ${nameOf(mastery.masteredWith)}` : `Reach Legendary bond with a ${FAMILIAR_ELEMENT_LABELS[element].toLowerCase()} Familiar`}>
                <span className="familiar-element-collection-dot" aria-hidden />
                <span className="familiar-element-collection-name">{FAMILIAR_ELEMENT_LABELS[element]}</span>
                <span className="familiar-element-collection-state">{mastery ? `with ${nameOf(mastery.masteredWith)}` : 'Not yet'}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="familiar-stage-fineprint">
        Before you master an element, your name effect follows your Active Familiar and grows with your bond. Reach Legendary bond to master its element for good: it stays yours with every Familiar, including your own custom Familiar when that arrives. SEIHouse Signatures belong to their own Familiar and are never collected.
      </p>
    </div>
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
