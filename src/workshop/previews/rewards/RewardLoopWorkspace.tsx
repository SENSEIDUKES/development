/**
 * Workshop preview: the Reward Loop.
 *
 * One cultivator on one in-browser development economy, so every relationship
 * in the reward system can be tried end to end: activity earns achievements,
 * achievements mint Mystery Scrolls, scrolls and creation raise DAO XP (which
 * alone sets the rank and its colours), QI trains a Familiar until its
 * elemental title letters the name, Fate Survival grants a Relic worth DAO XP
 * and Energy, the Dao Pillar pays QI, and the Celestial Store sells Familiars
 * for QI or Energy. Every balance moves through real server code; only the
 * inputs a real host would supply are simulated.
 */
import { useRef, useState } from 'react';
import { LibraryElementalTitle } from '@seihouse/library-ui';
import { CelestialStorePanel, type CelestialStorePurchase } from '@seihouse/library/celestial-store';
import { getAuraTextStyle, getDaoRankData, getRankForDaoXp, rankBackground } from '@seihouse/library/cultivation';
import { DaoPillarView, useDaoPillarCalendar } from '@seihouse/library/dao-pillar';
import { activeFamiliarEffect, FamiliarTrainingPanel, useFamiliarStoreAccount } from '@seihouse/library/familiar';
import { FateSurvivalRelicsPanel, RelicReveal, type FateSurvivalOutcome, type FateSurvivalRelicView } from '@seihouse/library/relics';
import { AchievementsPanel } from '@seihouse/library/rewards';
import { allFamiliarOptions } from '../../../host/familiar/catalogue';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { ActivitySimulator } from './ActivitySimulator';
import { DEVELOPED_CULTIVATOR_SEED, QUILL, type WorkshopAccountSeed } from './rewardScenarios';
import { BalanceStrip, LedgerFeed, SimulatedBadge, WorkshopActionButton, WorkshopCard } from './RewardWorkshopKit';
import { useRewardAccount, WorkshopEconomyProvider } from './WorkshopEconomyProvider';

const entry = workshopEntries.find(candidate => candidate.id === 'reward-loop')!;

type LoopState = 'new' | 'developed';
type Tab = 'earn' | 'rewards' | 'familiar' | 'store';

const SEEDS: Record<LoopState, WorkshopAccountSeed> = {
  new: {},
  developed: { ...DEVELOPED_CULTIVATOR_SEED, openingDaoXp: 13_480 },
};
const DISPLAY_NAME = 'Kept Reading';
const formatWhole = (value: number) => value.toLocaleString('en-US');

const RELATIONSHIPS: ReadonlyArray<readonly [string, string]> = [
  ['Reading, creating, exploring', 'Achievements → Mystery Scrolls'],
  ['Mystery Scroll', 'DAO XP + QI'],
  ['Creating a story or chapter', 'DAO XP'],
  ['Fate Survival', 'Relic → DAO XP + Energy'],
  ['Daily Dao Pillar', 'QI'],
  ['DAO XP', 'Cultivator Rank → colours only'],
  ['QI offered to a Familiar', 'Tiers → forms and elemental titles'],
  ['QI or Energy in the Celestial Store', 'Familiars'],
];

function CultivatorCard({ equippedId }: { equippedId: string }) {
  const { daoXp, familiars } = useRewardAccount();
  const xp = daoXp.snapshot?.balance ?? 0;
  const data = getDaoRankData(xp);
  const rank = getRankForDaoXp(xp);
  const effect = activeFamiliarEffect(familiars.snapshot, equippedId);
  const nameStyle = getAuraTextStyle(`rank:${rank.id}`, xp);
  return (
    <section className="rounded-2xl border border-[#d4af37]/40 bg-[#03060c] p-4 text-center" aria-label="Cultivator" data-reward-loop-cultivator>
      {effect ? (
        <LibraryElementalTitle as="h2" size="lg" element={effect.element} intensity={effect.intensity}
          shadow={effect.intensity === 'legendary' ? 'outlined' : 'soft'} className="font-display" data-cultivator-effect={effect.id}>{DISPLAY_NAME}</LibraryElementalTitle>
      ) : (
        <h2 className={`font-display text-2xl ${nameStyle.className ?? ''}`} style={nameStyle.style} data-cultivator-effect="none">{DISPLAY_NAME}</h2>
      )}
      <p className="mt-1 text-[11px] text-white/50">{effect ? `${effect.label} from the equipped Familiar` : 'Rank colours · no Familiar effect active'}</p>
      <div className="mx-auto mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="DAO XP toward the next rank"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(data.progress)}>
        <span className="block h-full rounded-full" style={{ width: `${data.progress}%`, background: rankBackground(rank.visual) }} />
      </div>
      <p className="mt-1 font-mono text-[11px] text-white/60" data-cultivator-rank={rank.id}>
        {data.rank} · {formatWhole(xp)}{data.maxDaoXp !== null ? ` / ${formatWhole(data.maxDaoXp)} DAO XP to ${data.nextRank}` : ' DAO XP · maximum rank'}
      </p>
    </section>
  );
}

function FateSurvivalControls({ onRelic }: { onRelic: (relic: FateSurvivalRelicView) => void }) {
  const account = useRewardAccount();
  const challenge = useRef(0);
  const [message, setMessage] = useState<string | null>(null);
  const survive = async (outcome: FateSurvivalOutcome) => {
    if (!account.relicsStore) return;
    challenge.current += 1;
    try {
      const response = await account.relicsStore.recordFateSurvivalOutcomeDevelopment({ challengeId: `loop-challenge-${challenge.current}`, outcome });
      await account.refreshBalances();
      setMessage(response.message);
      if (response.outcome === 'granted' && response.relic) onRelic(response.relic);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The outcome could not be recorded.');
    }
  };
  return (
    <WorkshopCard title="Fate Survival" badge={<SimulatedBadge>Judge not built</SimulatedBadge>}
      description="The only source of Relics. Choose a challenge's outcome; the server grants the Relic and its DAO XP and Energy.">
      <div className="flex flex-wrap gap-2">
        <WorkshopActionButton onClick={() => void survive('FATE AVERTED')}>Fate averted</WorkshopActionButton>
        <WorkshopActionButton onClick={() => void survive('FATE SCARRED')}>Survived, scarred</WorkshopActionButton>
        <WorkshopActionButton onClick={() => void survive('DOOM MANIFESTED')}>Doom manifested</WorkshopActionButton>
      </div>
      {message ? <p role="status" className="mt-3 text-xs text-white/75">{message}</p> : null}
    </WorkshopCard>
  );
}

function DaoPillarCard() {
  const account = useRewardAccount();
  const calendar = useDaoPillarCalendar({ onRewardDelivered: () => { void account.qi.refresh(); } });
  return (
    <WorkshopCard title="Daily Dao Pillar" description="The recurring reward: today’s collection deposits QI through the server ledger.">
      <DaoPillarView calendar={calendar} />
    </WorkshopCard>
  );
}

function StoreTab({ equippedId, onEquip }: { equippedId: string; onEquip: (id: string) => void }) {
  const account = useRewardAccount();
  const store = useFamiliarStoreAccount();
  const purchase = async (attempt: CelestialStorePurchase) => {
    const result = await store.purchase(attempt);
    await Promise.all([account.refreshBalances(), account.familiars.refresh()]);
    return result;
  };
  return (
    <CelestialStorePanel
      options={allFamiliarOptions}
      cultivation={account.qi}
      energy={account.energy}
      equippedFamiliarId={equippedId}
      ownedFamiliarIds={store.ownedFamiliarIds}
      onEquip={onEquip}
      onPurchase={purchase}
      purchasePending={store.pending}
    />
  );
}

function RewardLoop() {
  const account = useRewardAccount();
  const [tab, setTab] = useState<Tab>('earn');
  const [equippedId, setEquippedId] = useState(QUILL);
  const [revealing, setRevealing] = useState<FateSurvivalRelicView | null>(null);
  const sealed = account.achievements.snapshot?.scrolls.filter(scroll => scroll.status === 'sealed').length ?? 0;
  const tabs: { id: Tab; label: string }[] = [
    { id: 'earn', label: 'Earn' },
    { id: 'rewards', label: sealed ? `Rewards · ${sealed} sealed` : 'Rewards' },
    { id: 'familiar', label: 'Familiar' },
    { id: 'store', label: 'Store' },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 text-neutral-200 sm:px-8">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <CultivatorCard equippedId={equippedId} />
          <BalanceStrip />
          <nav className="flex flex-wrap gap-2" aria-label="Reward Loop steps">
            {tabs.map(option => (
              <WorkshopActionButton key={option.id} pressed={tab === option.id} onClick={() => setTab(option.id)}>{option.label}</WorkshopActionButton>
            ))}
          </nav>
          {tab === 'earn' && (
            <div className="space-y-4">
              <ActivitySimulator compact />
              <FateSurvivalControls onRelic={setRevealing} />
              <DaoPillarCard />
            </div>
          )}
          {tab === 'rewards' && (
            <div className="space-y-4">
              <AchievementsPanel achievements={account.achievements} />
              <FateSurvivalRelicsPanel relics={account.relics} />
            </div>
          )}
          {tab === 'familiar' && (
            <FamiliarTrainingPanel familiars={account.familiars} options={allFamiliarOptions} qiBalance={account.qi.snapshot?.balance ?? null}
              displayName={DISPLAY_NAME} equippedFamiliarId={equippedId} onOffered={() => void account.refreshBalances()} />
          )}
          {tab === 'store' && <StoreTab equippedId={equippedId} onEquip={setEquippedId} />}
        </div>
        <aside className="min-w-0 space-y-4">
          <WorkshopCard title="What connects to what">
            <ul className="space-y-1.5 text-[11px] leading-snug" data-reward-relationships>
              {RELATIONSHIPS.map(([from, to]) => (
                <li key={from} className="flex flex-wrap items-baseline gap-x-1.5"><span className="text-white/80">{from}</span><span aria-hidden className="text-white/35">→</span><span className="text-sky-200/90">{to}</span></li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-white/40">No effect, rank or Relic grants a boost, multiplier, discount or other advantage.</p>
          </WorkshopCard>
          <LedgerFeed limit={12} />
        </aside>
      </div>
      {revealing ? <RelicReveal key={revealing.id} relic={revealing} onClose={() => setRevealing(null)} /> : null}
    </div>
  );
}

function RewardLoopReference() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-neutral-400 sm:px-8">
      The Reward Loop is a Workshop simulator, not a product page, so it has no production original.
      The product surfaces it drives — Achievements and Mystery Scrolls, Fate Survival Relics, Familiar
      training, the Dao Pillar and the Celestial Store — each have their own Rewards workspace and
      appear together in the User Profile preview.
    </div>
  );
}

export function RewardLoopWorkspace() {
  const [state, setState] = useState<LoopState>('new');
  const [session, setSession] = useState(0);
  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare={false}
      workshopControls={{
        description: 'One cultivator on a development economy running in this tab. Activity, the Fate Survival outcome, and the starting account are simulated; every reward, balance and unlock is decided by real server code.',
        defaultSection: 'states',
        sections: [{
          id: 'states',
          description: state === 'new'
            ? 'A new cultivator: Reader rank, no QI, nothing earned. Read and create to earn the first scrolls.'
            : 'A developed cultivator: a Leader with sealed scrolls, a Fate Survival Relic, a twelve-day Dao Pillar run, and Quill trained to Rare bond.',
          content: (
            <div className="flex flex-wrap gap-2">
              <WorkshopActionButton pressed={state === 'new'} onClick={() => { setState('new'); setSession(value => value + 1); }}>New cultivator</WorkshopActionButton>
              <WorkshopActionButton pressed={state === 'developed'} onClick={() => { setState('developed'); setSession(value => value + 1); }}>Developed cultivator</WorkshopActionButton>
              <WorkshopActionButton onClick={() => setSession(value => value + 1)}>Reset</WorkshopActionButton>
            </div>
          ),
        }],
      }}
      renderReference={() => <RewardLoopReference />}
      renderDevelopment={() => (
        <WorkshopEconomyProvider key={`${state}-${session}`} seed={SEEDS[state]} options={{ daoPillarDay: state === 'new' ? 1 : 13 }}>
          <RewardLoop />
        </WorkshopEconomyProvider>
      )}
    />
  );
}

export default RewardLoopWorkspace;
