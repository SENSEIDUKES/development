/**
 * Workshop preview for Achievements and Mystery Scrolls.
 *
 * There is no production original: achievements replace the story-scoped
 * Relic achievements, and Mystery Scrolls are new. The Achievements scene runs
 * the development economy in this tab — every goal, scroll and credit comes
 * from real server code; only the activity itself is simulated. The Scroll
 * reveal lab plays the reveal for any presentation, rarity and server answer
 * with sample contents, crediting nothing.
 */
import { useState } from 'react';
import {
  AchievementsPanel,
  MysteryScrollReveal,
  REWARD_RARITIES,
  type MysteryScrollPresentation,
  type MysteryScrollView,
  type OpenMysteryScrollResponse,
  type RewardGrant,
  type RewardRarity,
} from '@seihouse/library/rewards';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { ActivitySimulator } from '../rewards/ActivitySimulator';
import { DEVELOPED_CULTIVATOR_SEED, type WorkshopAccountSeed } from '../rewards/rewardScenarios';
import { BalanceStrip, LedgerFeed, WorkshopActionButton } from '../rewards/RewardWorkshopKit';
import { useRewardAccount, WorkshopEconomyProvider } from '../rewards/WorkshopEconomyProvider';

const entry = workshopEntries.find(candidate => candidate.id === 'achievements')!;

type Scene = 'achievements' | 'reveal';
type AccountState = 'fresh' | 'developed';
type RevealOutcome = 'opens' | 'fails' | 'slow';

const SEEDS: Record<AccountState, WorkshopAccountSeed | undefined> = {
  fresh: undefined,
  developed: { ...DEVELOPED_CULTIVATOR_SEED, openingDaoXp: 13_480 },
};

/** Sample contents per rarity for the reveal lab only. Not the catalogue's amounts. */
const SAMPLE_GRANTS: Record<RewardRarity, RewardGrant[]> = {
  Common: [{ type: 'dao-xp', amount: 25 }, { type: 'qi', amount: 100 }],
  Rare: [{ type: 'dao-xp', amount: 75 }, { type: 'qi', amount: 250 }],
  Epic: [{ type: 'dao-xp', amount: 150 }, { type: 'qi', amount: 400 }],
  Legendary: [{ type: 'dao-xp', amount: 500 }, { type: 'qi', amount: 1_500 }],
  Mythic: [{ type: 'dao-xp', amount: 250 }, { type: 'qi', amount: 600 }],
  Transcendent: [{ type: 'dao-xp', amount: 1_000 }, { type: 'qi', amount: 3_000 }],
};

function AchievementsScene() {
  const account = useRewardAccount();
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-6 text-neutral-200 sm:px-8">
      <BalanceStrip />
      <ActivitySimulator />
      <AchievementsPanel achievements={account.achievements} />
      <LedgerFeed />
    </div>
  );
}

function sampleScroll(presentation: MysteryScrollPresentation, rarity: RewardRarity): MysteryScrollView {
  const curated = presentation === 'curated';
  return {
    id: `sample-${presentation}-${rarity}`,
    achievementKey: 'sample.reveal-lab',
    achievementName: curated ? 'Keeper of the Long Arc' : 'Steady Lantern',
    category: 'reading',
    presentation,
    status: 'sealed',
    rarity: curated ? rarity : null,
    rewards: curated ? SAMPLE_GRANTS[rarity] : null,
    delivered: null,
    earnedAt: new Date().toISOString(),
    openedAt: null,
  };
}

function ScrollRevealLab({ presentation, rarity, outcome }: { presentation: MysteryScrollPresentation; rarity: RewardRarity; outcome: RevealOutcome }) {
  const [open, setOpen] = useState(false);
  const [failures, setFailures] = useState(0);
  const scroll = sampleScroll(presentation, rarity);
  const onOpen = async (scrollId: string): Promise<OpenMysteryScrollResponse> => {
    await new Promise(resolve => { setTimeout(resolve, outcome === 'slow' ? 3_000 : 250); });
    if (outcome === 'fails' && failures === 0) {
      setFailures(1);
      throw new Error('The Library could not open this scroll. Nothing was credited.');
    }
    const grants = SAMPLE_GRANTS[rarity];
    const now = new Date().toISOString();
    return {
      outcome: 'opened',
      message: 'Sample scroll opened.',
      scroll: {
        ...scroll, id: scrollId, status: 'opened', rarity, rewards: grants, openedAt: now,
        delivered: grants.map((grant, index) => ({ ...grant, transactionId: `sample-${index}`, balanceAfter: grant.amount })),
      },
      snapshot: { uid: 'reveal-lab', achievements: [], scrolls: [], delivery: 'on-open', creationDaoXp: { perActivity: {}, dailyCap: null }, updatedAt: now },
    };
  };
  return (
    <div className="flex min-h-[calc(100vh-11rem)] flex-col items-center justify-center gap-3 bg-black p-6 text-center text-white">
      <p className="max-w-sm text-xs text-white/50">
        {presentation === 'curated' ? 'A curated milestone scroll shows its reward before it is opened.' : 'A concealed scroll shows nothing about its contents until it is opened.'}
        {' '}These contents are samples; nothing is credited.
      </p>
      <button type="button" onClick={() => { setFailures(0); setOpen(true); }}
        className="min-h-11 rounded-full border border-amber-300/50 px-6 py-3 font-mono text-sm uppercase tracking-widest text-amber-100 transition-colors hover:bg-amber-300/10">
        Receive a {presentation === 'curated' ? `${rarity} milestone` : 'concealed'} scroll
      </button>
      {open ? <MysteryScrollReveal key={`${presentation}-${rarity}-${outcome}`} scroll={scroll} onOpen={onOpen} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function AchievementsReference() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-neutral-400 sm:px-8">
      Achievements and Mystery Scrolls have no production original. They replace the story-scoped
      achievements that earned Relics: goals are now Library-defined, recognize natural reading,
      creation and exploration, and each earning is a Mystery Scroll whose reward the server decides.
    </div>
  );
}

export function AchievementsWorkspace() {
  const [scene, setScene] = useState<Scene>('achievements');
  const [accountState, setAccountState] = useState<AccountState>('fresh');
  const [delivery, setDelivery] = useState<'on-open' | 'on-earn'>('on-open');
  const [creationCap, setCreationCap] = useState<number | null>(null);
  const [presentation, setPresentation] = useState<MysteryScrollPresentation>('concealed');
  const [rarity, setRarity] = useState<RewardRarity>('Epic');
  const [outcome, setOutcome] = useState<RevealOutcome>('opens');
  const [session, setSession] = useState(0);
  const economyKey = `${accountState}|${delivery}|${creationCap}|${session}`;

  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare={false}
      workshopControls={{
        description: 'The Achievements scene runs the development economy in this tab: goals, scrolls and every credit come from real server code. Only the activity is simulated.',
        defaultSection: 'scenes',
        sections: [
          {
            id: 'scenes',
            description: scene === 'achievements' ? 'Simulate activity, watch goals progress, and open the scrolls they earn.' : 'Play the scroll reveal for any presentation, rarity and server answer.',
            content: (
              <div className="flex flex-wrap gap-2">
                <WorkshopActionButton pressed={scene === 'achievements'} onClick={() => setScene('achievements')}>Achievements</WorkshopActionButton>
                <WorkshopActionButton pressed={scene === 'reveal'} onClick={() => setScene('reveal')}>Scroll reveal lab</WorkshopActionButton>
              </div>
            ),
          },
          scene === 'achievements' ? {
            id: 'states',
            description: accountState === 'fresh' ? 'A new cultivator: every goal locked, no scrolls.' : 'A developed cultivator: ten chapters read and a story created — one scroll opened, two sealed.',
            content: (
              <div className="flex flex-wrap gap-2">
                <WorkshopActionButton pressed={accountState === 'fresh'} onClick={() => setAccountState('fresh')}>New cultivator</WorkshopActionButton>
                <WorkshopActionButton pressed={accountState === 'developed'} onClick={() => setAccountState('developed')}>Developed cultivator</WorkshopActionButton>
                <WorkshopActionButton onClick={() => setSession(value => value + 1)}>Reset account</WorkshopActionButton>
              </div>
            ),
          } : {
            id: 'states',
            description: 'How the server answers the open.',
            content: (
              <div className="flex flex-wrap gap-2">
                <WorkshopActionButton pressed={outcome === 'opens'} onClick={() => setOutcome('opens')}>Opens</WorkshopActionButton>
                <WorkshopActionButton pressed={outcome === 'slow'} onClick={() => setOutcome('slow')}>Slow server</WorkshopActionButton>
                <WorkshopActionButton pressed={outcome === 'fails'} onClick={() => setOutcome('fails')}>Fails once</WorkshopActionButton>
              </div>
            ),
          },
          scene === 'achievements' ? {
            id: 'advanced',
            description: 'Open product decisions, configurable here. Changing one starts a fresh account.',
            content: (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-white/50">Scroll reward lands</span>
                  <WorkshopActionButton pressed={delivery === 'on-open'} onClick={() => setDelivery('on-open')}>When opened</WorkshopActionButton>
                  <WorkshopActionButton pressed={delivery === 'on-earn'} onClick={() => setDelivery('on-earn')}>When earned</WorkshopActionButton>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-white/50">Creation DAO XP per day</span>
                  <WorkshopActionButton pressed={creationCap === null} onClick={() => setCreationCap(null)}>No cap</WorkshopActionButton>
                  <WorkshopActionButton pressed={creationCap === 100} onClick={() => setCreationCap(100)}>Cap at 100</WorkshopActionButton>
                </div>
              </div>
            ),
          } : {
            id: 'effects',
            description: 'Presentation and rarity. Concealed scrolls hide their rarity until opened.',
            content: (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <WorkshopActionButton pressed={presentation === 'concealed'} onClick={() => setPresentation('concealed')}>Concealed</WorkshopActionButton>
                  <WorkshopActionButton pressed={presentation === 'curated'} onClick={() => setPresentation('curated')}>Curated milestone</WorkshopActionButton>
                </div>
                <div className="flex flex-wrap gap-2">
                  {REWARD_RARITIES.map(option => (
                    <WorkshopActionButton key={option} pressed={rarity === option} onClick={() => setRarity(option)}>{option}</WorkshopActionButton>
                  ))}
                </div>
              </div>
            ),
          },
        ],
      }}
      renderReference={() => <AchievementsReference />}
      renderDevelopment={() => scene === 'reveal'
        ? <ScrollRevealLab key={`${presentation}-${rarity}-${outcome}`} presentation={presentation} rarity={rarity} outcome={outcome} />
        : (
          <WorkshopEconomyProvider key={economyKey} seed={SEEDS[accountState]} options={{ scrollDelivery: delivery, creationDailyCap: creationCap }}>
            <AchievementsScene />
          </WorkshopEconomyProvider>
        )}
    />
  );
}

export default AchievementsWorkspace;
