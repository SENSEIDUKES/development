/**
 * Workshop preview for Familiar training.
 *
 * There is no production original: Familiars own the active-effect mechanic
 * now. Offering QI trains one Familiar; tiers unlock a radiant form and
 * elemental titles, and the equipped Familiar's chosen effect letters the
 * cultivator's name. Everything runs on the development economy in this tab —
 * only the QI faucet and the equipped choice (host profile state) are
 * simulated.
 */
import { useState } from 'react';
import { LibraryElementalTitle } from '@seihouse/library-ui';
import { getAuraTextStyle, getDaoRankData, getRankForDaoXp } from '@seihouse/library/cultivation';
import { activeFamiliarEffect, FamiliarTrainingPanel } from '@seihouse/library/familiar';
import { allFamiliarOptions } from '../../../host/familiar/catalogue';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { QUILL, type WorkshopAccountSeed } from '../rewards/rewardScenarios';
import { BalanceStrip, LedgerFeed, SimulatedBadge, WorkshopActionButton, WorkshopCard } from '../rewards/RewardWorkshopKit';
import { useRewardAccount, useWorkshopEconomy, WorkshopEconomyProvider } from '../rewards/WorkshopEconomyProvider';

const entry = workshopEntries.find(candidate => candidate.id === 'familiar-training')!;

type TrainingState = 'untrained' | 'rare' | 'legendary' | 'no-qi';

const STATES: { id: TrainingState; label: string; description: string; seed: WorkshopAccountSeed }[] = [
  { id: 'untrained', label: 'Untrained', description: 'Quill is Common and the cultivator has 1,500 QI to offer.',
    seed: { openingDaoXp: 3_200, qiGrant: 1_500 } },
  { id: 'rare', label: 'Rare', description: 'Quill reached Rare with its subtle lightning title on; Phoenix was bought and is untrained. 3,000 QI to offer.',
    seed: { openingDaoXp: 3_200, qiGrant: 4_000, ownedFamiliars: ['phoenix'], training: [{ familiarId: QUILL, qi: 1_000, effectId: 'elemental-title:lightning:subtle' }] } },
  { id: 'legendary', label: 'Fully trained', description: 'Quill is Legendary: its radiant form and legendary lightning title are on.',
    seed: { openingDaoXp: 13_480, qiGrant: 10_500, training: [{ familiarId: QUILL, qi: 10_000, effectId: 'elemental-title:lightning:legendary', formId: 'radiant' }] } },
  { id: 'no-qi', label: 'No QI', description: 'Nothing to offer: every offering is disabled until QI arrives.',
    seed: { openingDaoXp: 3_200 } },
];

const DISPLAY_NAME = 'Kept Reading';

function NamePreview({ equippedId }: { equippedId: string }) {
  const { daoXp, familiars } = useRewardAccount();
  const xp = daoXp.snapshot?.balance ?? 0;
  const effect = activeFamiliarEffect(familiars.snapshot, equippedId);
  const rank = getDaoRankData(xp).rank;
  const rankStyle = getAuraTextStyle(`rank:${getRankForDaoXp(xp).id}`, xp);
  return (
    <WorkshopCard title="The cultivator’s name" description="Rank chooses the colours. The equipped Familiar’s chosen effect, when there is one, letters the name in its element.">
      <div className="rounded-xl border border-white/10 bg-[#03060c] px-4 py-5 text-center" data-name-preview={effect?.id ?? 'rank'}>
        {effect ? (
          <LibraryElementalTitle as="p" size="lg" element={effect.element} intensity={effect.intensity}
            shadow={effect.intensity === 'legendary' ? 'outlined' : 'soft'} className="font-display">{DISPLAY_NAME}</LibraryElementalTitle>
        ) : (
          <p className={`font-display text-2xl ${rankStyle.className ?? ''}`} style={rankStyle.style}>{DISPLAY_NAME}</p>
        )}
        <p className="mt-2 text-[11px] text-white/45">{effect ? `${effect.label} · from ${allFamiliarOptions.find(option => option.id === equippedId)?.name ?? equippedId}` : `${rank} colours · no Familiar effect active`}</p>
      </div>
    </WorkshopCard>
  );
}

function TrainingScene({ equippedId, onEquip }: { equippedId: string; onEquip: (id: string) => void }) {
  const account = useRewardAccount();
  const { simulators } = useWorkshopEconomy();
  const [note, setNote] = useState<string | null>(null);
  const owned = account.familiars.snapshot?.ownedFamiliarIds ?? [];
  const grantQi = async () => {
    await simulators.grantQi(1_000);
    await account.refreshBalances();
    setNote('+1,000 QI from the Workshop grant.');
  };
  const bringHome = async (id: string) => {
    await simulators.grantFamiliar(id);
    await account.familiars.refresh();
    setNote(`${allFamiliarOptions.find(option => option.id === id)?.name ?? id} joined the cave (as if bought).`);
  };
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-6 text-neutral-200 sm:px-8">
      <BalanceStrip />
      <WorkshopCard title="Workshop controls" badge={<SimulatedBadge />}
        description="A QI faucet for testing (the real faucets are the Dao Pillar and Mystery Scrolls), ownership as if bought in the Celestial Store, and which Familiar the profile has equipped.">
        <div className="flex flex-wrap gap-2">
          <WorkshopActionButton onClick={() => void grantQi()}>Grant 1,000 QI</WorkshopActionButton>
          {!owned.includes('phoenix') && <WorkshopActionButton onClick={() => void bringHome('phoenix')}>Bring Phoenix home</WorkshopActionButton>}
          {!owned.includes('galaxy-octopus') && <WorkshopActionButton onClick={() => void bringHome('galaxy-octopus')}>Bring Galaxy Octopus home</WorkshopActionButton>}
        </div>
        {owned.length > 1 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-white/50">Equipped</span>
            {owned.map(id => (
              <WorkshopActionButton key={id} pressed={equippedId === id} onClick={() => onEquip(id)}>
                {allFamiliarOptions.find(option => option.id === id)?.name ?? id}
              </WorkshopActionButton>
            ))}
          </div>
        )}
        {note ? <p role="status" className="mt-3 text-xs text-white/70">{note}</p> : null}
      </WorkshopCard>
      <NamePreview equippedId={equippedId} />
      <FamiliarTrainingPanel
        familiars={account.familiars}
        options={allFamiliarOptions}
        qiBalance={account.qi.snapshot?.balance ?? null}
        displayName={DISPLAY_NAME}
        equippedFamiliarId={equippedId}
        onOffered={() => void account.refreshBalances()}
      />
      <LedgerFeed />
    </div>
  );
}

function FamiliarTrainingReference() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-neutral-400 sm:px-8">
      Familiar training has no production original. It replaces Relic attunement and status effects:
      active effects are now cosmetic, owned by Familiars, and unlocked by offering QI — never a boost,
      multiplier, discount or other advantage.
    </div>
  );
}

export function FamiliarTrainingWorkspace() {
  const [state, setState] = useState<TrainingState>('rare');
  const [equipped, setEquipped] = useState(QUILL);
  const [session, setSession] = useState(0);
  const current = STATES.find(option => option.id === state)!;
  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare={false}
      workshopControls={{
        description: 'Training, unlocks and every QI spend run on the development economy in this tab. The QI grant, Familiar ownership grants and the equipped choice are Workshop simulations.',
        defaultSection: 'states',
        sections: [{
          id: 'states',
          description: current.description,
          content: (
            <div className="flex flex-wrap gap-2">
              {STATES.map(option => (
                <WorkshopActionButton key={option.id} pressed={state === option.id} onClick={() => { setState(option.id); setEquipped(QUILL); setSession(value => value + 1); }}>
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
          <TrainingScene equippedId={equipped} onEquip={setEquipped} />
        </WorkshopEconomyProvider>
      )}
    />
  );
}

export default FamiliarTrainingWorkspace;
