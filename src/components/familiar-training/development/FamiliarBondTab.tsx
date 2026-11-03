import { Check, Lock } from 'lucide-react';
import { LibraryButton } from '@seihouse/library-ui';
import { SEIInlineAlert, SEILoadingState } from '@seihouse/ui';
import {
  bondRankLabel,
  FAMILIAR_ELEMENT_LABELS,
  type FamiliarBondRank,
  type FamiliarTrainingView,
  type FamiliarUnlock,
} from '../../../library/familiars/contracts';
import type { FamiliarsAccount } from './familiarsAccount';

export const formatWhole = (value: number) => value.toLocaleString('en-US');

function unlockLine(unlock: FamiliarUnlock, name: string) {
  switch (unlock.kind) {
    case 'bond-effect': return `${unlock.effect.label} on your name while ${name} is active`;
    case 'form': return `Form: ${unlock.form.label}`;
    case 'mastery': return `Master ${FAMILIAR_ELEMENT_LABELS[unlock.element]}: ${unlock.effect.label} is yours for good, with any Familiar`;
    case 'signature': return `SEIHouse Signature: ${unlock.effect.label}, ${name}’s own piece`;
  }
}

/** Where this Familiar's bond stands: the band it is in and how far through it. */
export function bondProgress(view: FamiliarTrainingView) {
  const bandStart = view.bondRanks.reduce((floor, rank) => rank.reached ? rank.qiRequired : floor, 0);
  const percent = view.nextBondRank
    ? Math.round(((view.qiOffered - bandStart) / (view.nextBondRank.qiRequired - bandStart)) * 100)
    : 100;
  const remaining = view.nextBondRank ? view.bondRanks[view.bondRanks.length - 1].qiRequired - view.qiOffered : 0;
  return { percent, remaining };
}

export interface FamiliarBondTabProps {
  familiars: FamiliarsAccount;
  view: FamiliarTrainingView | null;
  name: string;
  owned: boolean;
  /** The rank picked on the stage's bond rail, shown highlighted. */
  focusedRank?: FamiliarBondRank | null;
  onChooseForm: (formId: string | null) => void;
}

/**
 * The Bond tab: every rank framed as what it does to this Familiar's element,
 * its forms, and the account states. Offering QI lives in the stage's action
 * bar, in the thumb's reach; this tab explains what the offering buys.
 */
export function FamiliarBondTab({ familiars, view, name, owned, focusedRank, onChooseForm }: FamiliarBondTabProps) {
  if (familiars.status === 'unavailable') {
    return <SEIInlineAlert tone="info" title="Familiar bonds not connected">Familiar ownership and bonds are not connected here.</SEIInlineAlert>;
  }
  if (!familiars.snapshot) {
    return familiars.status === 'error' ? (
      <SEIInlineAlert tone="danger" role="alert" title="Familiars unavailable">
        {familiars.error ?? 'Familiars are unavailable right now.'}
        <LibraryButton className="mt-3" size="sm" variant="secondary" onClick={() => void familiars.refresh()}>Try again</LibraryButton>
      </SEIInlineAlert>
    ) : <SEILoadingState size="sm" title="Loading Familiars" />;
  }
  if (!view) return <p className="familiar-stage-note">{name} has no bond to cultivate yet.</p>;
  const element = FAMILIAR_ELEMENT_LABELS[view.element];
  return (
    <div className="space-y-4" data-familiar-bond-tab={view.familiarId}>
      <p className="familiar-stage-note">
        {owned
          ? `Offer QI to deepen your bond. Each rank strengthens ${name}’s ${element} effect on your name; Legendary bond masters ${element} for good.`
          : `Bring ${name} home to start a bond. Bonding grows its ${element} effect on your name and, at Legendary bond, masters ${element} for good.`}
      </p>
      <ol className="familiar-bond-ladder" aria-label={`${name} bond ranks`}>
        {view.bondRanks.map(rank => (
          <li key={rank.rank} id={`familiar-bond-rank-${rank.rank}`} data-familiar-bond-row={rank.rank} data-reached={rank.reached}
            data-focused={focusedRank === rank.rank || undefined} data-current={owned && view.bondRank === rank.rank || undefined}>
            <span aria-hidden className="familiar-bond-ladder-mark">{rank.reached && owned ? <Check size={12} /> : <Lock size={10} />}</span>
            <span className="min-w-0">
              <span className="familiar-bond-ladder-title">{bondRankLabel(rank.rank)}</span>
              <span className="familiar-bond-ladder-qi"> · {formatWhole(rank.qiRequired)} QI</span>
              {rank.unlocks.map(unlock => (
                <span key={`${unlock.kind}:${unlock.kind === 'form' ? unlock.form.id : unlock.effect.id}`} className="familiar-bond-ladder-unlock" data-familiar-unlock={unlock.kind}>
                  {unlockLine(unlock, name)}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ol>
      {owned && view.unlockedForms.length ? (
        <div>
          <h4 className="familiar-stage-heading">{name}’s form</h4>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={`${name}’s form`}>
            <FormButton selected={!view.selection.formId} disabled={familiars.pending} onSelect={() => onChooseForm(null)}>Base</FormButton>
            {view.unlockedForms.map(form => (
              <FormButton key={form.id} selected={view.selection.formId === form.id} disabled={familiars.pending} onSelect={() => onChooseForm(form.id)}>{form.label}</FormButton>
            ))}
          </div>
        </div>
      ) : null}
      <p className="familiar-stage-fineprint">Bonds change only how your Familiar and your name look. They never grant a boost, discount, or other advantage.</p>
    </div>
  );
}

function FormButton({ selected, disabled, onSelect, children }: { selected: boolean; disabled?: boolean; onSelect: () => void; children: string }) {
  return <button type="button" aria-pressed={selected} disabled={disabled} onClick={onSelect}
    className={`familiar-training-chip${selected ? ' is-selected' : ''}`}>{children}</button>;
}
