/**
 * Workshop preview for Familiar bonds and element mastery.
 *
 * There is no production original. Familiar rarity (catalogue content) and
 * Bond Rank (how far the cultivator has cultivated a Familiar) are shown side
 * by side. Offering QI raises the bond; Common, Rare and Epic bond lend the
 * Active Familiar's elemental title, and Legendary bond masters the element
 * so it can be worn with any Familiar. Everything runs on the development
 * economy in this tab — only the QI faucet, ownership grants and the Active
 * Familiar (host profile state) are simulated.
 */
import { useState } from 'react';
import { ElementalEffectPanel, FamiliarTrainingPanel } from '@seihouse/library/familiar';
import { allFamiliarOptions } from '../../../host/familiar/catalogue';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { QUILL, type WorkshopAccountSeed } from '../rewards/rewardScenarios';
import { BalanceStrip, LedgerFeed, SimulatedBadge, WorkshopActionButton, WorkshopCard } from '../rewards/RewardWorkshopKit';
import { useRewardAccount, useWorkshopEconomy, WorkshopEconomyProvider } from '../rewards/WorkshopEconomyProvider';

const entry = workshopEntries.find(candidate => candidate.id === 'familiar-training')!;

type BondState = 'common' | 'rare' | 'mastered' | 'no-qi';

const STATES: { id: BondState; label: string; description: string; active: string; seed: WorkshopAccountSeed }[] = [
  { id: 'common', label: 'Common bond', active: QUILL,
    description: 'Quill (a Common familiar) at Common bond: its Lightning Title · Whisper letters the name while Quill is active. 1,500 QI to offer.',
    seed: { openingDaoXp: 3_200, qiGrant: 1_500 } },
  { id: 'rare', label: 'Rare bond', active: QUILL,
    description: 'Quill at Rare bond, and Phoenix (an Epic familiar) at Common bond. Make Phoenix active and the name follows it: nothing is mastered yet, so the effect is coupled.',
    seed: { openingDaoXp: 3_200, qiGrant: 4_000, ownedFamiliars: ['phoenix'], training: [{ familiarId: QUILL, qi: 1_000 }] } },
  { id: 'mastered', label: 'Lightning mastered', active: 'phoenix',
    description: 'Quill reached Legendary bond, so Lightning is mastered. Phoenix is the Active Familiar while the name wears Lightning Mastery — the two choices have separated.',
    seed: {
      openingDaoXp: 13_480, qiGrant: 10_500, ownedFamiliars: ['phoenix'],
      training: [{ familiarId: QUILL, qi: 10_000, formId: 'radiant' }], activeEffect: { source: 'mastered', element: 'lightning' },
    } },
  { id: 'no-qi', label: 'No QI', active: QUILL, description: 'Nothing to offer: every offering is disabled until QI arrives.',
    seed: { openingDaoXp: 3_200 } },
];

const DISPLAY_NAME = 'Kept Reading';

function BondScene({ activeId, onActivate }: { activeId: string; onActivate: (id: string) => void }) {
  const account = useRewardAccount();
  const { simulators } = useWorkshopEconomy();
  const [note, setNote] = useState<string | null>(null);
  const owned = account.familiars.snapshot?.ownedFamiliarIds ?? [];
  const nameOf = (id: string) => allFamiliarOptions.find(option => option.id === id)?.name ?? id;
  const grantQi = async () => {
    await simulators.grantQi(1_000);
    await account.refreshBalances();
    setNote('+1,000 QI from the Workshop grant.');
  };
  const bringHome = async (id: string) => {
    await simulators.grantFamiliar(id);
    await account.familiars.refresh();
    setNote(`${nameOf(id)} joined the cave (as if bought).`);
  };
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-6 text-neutral-200 sm:px-8">
      <BalanceStrip />
      <WorkshopCard title="Workshop controls" badge={<SimulatedBadge />}
        description="A QI faucet for testing (the real faucets are the Dao Pillar and Mystery Scrolls), ownership as if bought in the Celestial Store, and which Familiar is the Active Familiar (host profile state).">
        <div className="flex flex-wrap gap-2">
          <WorkshopActionButton onClick={() => void grantQi()}>Grant 1,000 QI</WorkshopActionButton>
          {!owned.includes('phoenix') && <WorkshopActionButton onClick={() => void bringHome('phoenix')}>Bring Phoenix home</WorkshopActionButton>}
          {!owned.includes('galaxy-octopus') && <WorkshopActionButton onClick={() => void bringHome('galaxy-octopus')}>Bring Galaxy Octopus home</WorkshopActionButton>}
        </div>
        {owned.length > 1 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-white/50">Active Familiar</span>
            {owned.map(id => (
              <WorkshopActionButton key={id} pressed={activeId === id} onClick={() => onActivate(id)}>{nameOf(id)}</WorkshopActionButton>
            ))}
          </div>
        )}
        {note ? <p role="status" className="mt-3 text-xs text-white/70">{note}</p> : null}
      </WorkshopCard>
      <ElementalEffectPanel familiars={account.familiars} options={allFamiliarOptions} activeFamiliarId={activeId} displayName={DISPLAY_NAME} />
      <FamiliarTrainingPanel
        familiars={account.familiars}
        options={allFamiliarOptions}
        qiBalance={account.qi.snapshot?.balance ?? null}
        activeFamiliarId={activeId}
        onOffered={() => void account.refreshBalances()}
      />
      <LedgerFeed />
    </div>
  );
}

function FamiliarTrainingReference() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-neutral-400 sm:px-8">
      Familiar bonds have no production original. They replace Relic attunement and status effects:
      name effects are now cosmetic, lent by Familiars, and cultivated with QI — never a boost,
      multiplier, discount or other advantage.
    </div>
  );
}

export function FamiliarTrainingWorkspace() {
  const [state, setState] = useState<BondState>('rare');
  const current = STATES.find(option => option.id === state)!;
  const [active, setActive] = useState(current.active);
  const [session, setSession] = useState(0);
  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare={false}
      workshopControls={{
        description: 'Bonds, mastery and every QI spend run on the development economy in this tab. The QI grant, Familiar ownership grants and the Active Familiar are Workshop simulations.',
        defaultSection: 'states',
        sections: [{
          id: 'states',
          description: current.description,
          content: (
            <div className="flex flex-wrap gap-2">
              {STATES.map(option => (
                <WorkshopActionButton key={option.id} pressed={state === option.id}
                  onClick={() => { setState(option.id); setActive(option.active); setSession(value => value + 1); }}>
                  {option.label}
                </WorkshopActionButton>
              ))}
            </div>
          ),
        }],
      }}
      renderReference={() => <FamiliarTrainingReference />}
      renderDevelopment={() => (
        <WorkshopEconomyProvider key={`${state}-${session}`} seed={current.seed}>
          <BondScene activeId={active} onActivate={setActive} />
        </WorkshopEconomyProvider>
      )}
    />
  );
}

export default FamiliarTrainingWorkspace;
