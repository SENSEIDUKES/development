/**
 * Workshop preview for Fate Survival Relics.
 *
 * Reference: production's locked Relic Reveal for the retired inventory Relic.
 * Development: the rebuilt Relic — a lightweight Fate Survival reward read
 * from the Relics ledger on an in-browser development economy, with a
 * simulator standing in for the unbuilt Fate Survival judge, and a reveal lab
 * that plays the reveal at every rarity.
 */
import { useRef, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { FateSurvivalRelicsPanel, RelicReveal, type FateSurvivalOutcome, type FateSurvivalRelicView } from '@seihouse/library/relics';
import { REWARD_RARITIES, type RewardRarity } from '@seihouse/library/rewards';
import { RelicReveal as ReferenceRelicReveal } from '../../../components/relics/reference/RelicReveal';
import type { CosmicArtifact } from '../../../components/relics/shared/types';
import { FATE_SURVIVAL_RELICS } from '../../../server/relics/catalog';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { BalanceStrip, LedgerFeed, SimulatedBadge, WorkshopActionButton, WorkshopCard } from '../rewards/RewardWorkshopKit';
import { useRewardAccount, WorkshopEconomyProvider } from '../rewards/WorkshopEconomyProvider';
import { mockRelics } from './mockData';

const entry = workshopEntries.find(candidate => candidate.id === 'relics-gallery')!;

type Scene = 'relics' | 'reveal';

const OUTCOMES: { outcome: FateSurvivalOutcome; label: string }[] = [
  { outcome: 'FATE AVERTED', label: 'Fate averted' },
  { outcome: 'FATE SCARRED', label: 'Survived, scarred' },
  { outcome: 'DOOM MANIFESTED', label: 'Doom manifested' },
];

/** A catalogue Relic shaped as the view the ledger returns, for the reveal lab only. */
function sampleRelic(rarity: RewardRarity): FateSurvivalRelicView {
  const relic = FATE_SURVIVAL_RELICS.find(candidate => candidate.rarity === rarity) ?? FATE_SURVIVAL_RELICS[0];
  return {
    id: `sample-${relic.key}`, relicKey: relic.key, name: relic.name, description: relic.description, rarity: relic.rarity,
    challengeId: 'reveal-lab', storyId: null, outcome: 'FATE AVERTED', rewards: relic.rewards.map(grant => ({ ...grant })),
    delivered: [], earnedAt: new Date().toISOString(),
  };
}

function FateSurvivalScene() {
  const account = useRewardAccount();
  const challenge = useRef(0);
  const [revealing, setRevealing] = useState<FateSurvivalRelicView | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const outcomeRarity = account.relics.snapshot?.outcomeRarity;

  const survive = async (outcome: FateSurvivalOutcome) => {
    if (!account.relicsStore) return;
    setPending(true);
    try {
      challenge.current += 1;
      const response = await account.relicsStore.recordFateSurvivalOutcomeDevelopment({ challengeId: `workshop-challenge-${challenge.current}`, outcome });
      await account.refreshBalances();
      setMessage(response.message);
      if (response.outcome === 'granted' && response.relic) setRevealing(response.relic);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The outcome could not be recorded.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-6 text-neutral-200 sm:px-8">
      <BalanceStrip />
      <WorkshopCard title="Fate Survival challenge" badge={<SimulatedBadge>Judge not built</SimulatedBadge>}
        description="Fate Survival is the only source of Relics. Its judge does not exist yet, so choose the outcome a challenge would have reached; the server decides the Relic, delivers its DAO XP and Energy, and grants at most one per challenge.">
        <div className="flex flex-wrap gap-2">
          {OUTCOMES.map(option => (
            <WorkshopActionButton key={option.outcome} disabled={pending} onClick={() => void survive(option.outcome)}>
              {option.label}{outcomeRarity ? ` → ${outcomeRarity[option.outcome] ?? 'no Relic'}` : ''}
            </WorkshopActionButton>
          ))}
        </div>
        {message ? <p role="status" className="mt-3 text-xs text-white/70" data-relic-outcome-message>{message}</p> : null}
        <p className="mt-3 text-[11px] text-white/40">Outcome → rarity is a development default, not a product decision.</p>
      </WorkshopCard>
      <FateSurvivalRelicsPanel relics={account.relics} />
      <LedgerFeed />
      {revealing ? <RelicReveal key={revealing.id} relic={revealing} onClose={() => setRevealing(null)} /> : null}
    </div>
  );
}

function RevealLab({ rarity }: { rarity: RewardRarity }) {
  const [open, setOpen] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const relic = sampleRelic(rarity);
  return (
    <div className="flex min-h-[calc(100vh-11rem)] items-center justify-center bg-black p-6 text-white">
      {!open ? (
        <button type="button" onClick={() => { setReplayKey(0); setOpen(true); }}
          className="flex min-h-11 items-center gap-2 rounded-full border border-portal/40 px-6 py-3 font-mono text-sm uppercase tracking-widest text-portal transition-colors hover:border-portal/70 hover:bg-portal/10">
          <Sparkles size={14} /> Open the {rarity} reveal
        </button>
      ) : (
        <>
          <RelicReveal key={`${relic.id}-${rarity}`} relic={relic} replayKey={replayKey} onClose={() => setOpen(false)} />
          <button type="button" onClick={() => setReplayKey(key => key + 1)}
            className="fixed bottom-5 left-1/2 z-[130] flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full border border-neutral-600 bg-neutral-900/90 px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-neutral-200 shadow-lg backdrop-blur transition-colors hover:border-neutral-400 hover:text-white">
            <RotateCcw size={12} /> Replay effects
          </button>
        </>
      )}
    </div>
  );
}

function RelicsReference() {
  const [artifact, setArtifact] = useState<CosmicArtifact | null>(null);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-neutral-300 sm:px-8">
      <p className="text-sm leading-relaxed text-neutral-400">
        Production’s locked reveal for the retired inventory Relic: earned from story milestones, offered weekly for QI and Sect Merit, and attuned for status effects. Development retires all of that — Relics come only from Fate Survival.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {mockRelics.map(relic => (
          <button key={relic.id} type="button" onClick={() => setArtifact(relic)}
            className="workshop-touch-target min-h-11 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:border-white/25 hover:text-white">
            {relic.rarity} · {relic.name}
          </button>
        ))}
      </div>
      {artifact ? <ReferenceRelicReveal key={artifact.id} artifact={artifact} onClaim={() => setArtifact(null)} onDismiss={() => setArtifact(null)} /> : null}
    </div>
  );
}

export function RelicsWorkspace() {
  const [scene, setScene] = useState<Scene>('relics');
  const [rarity, setRarity] = useState<RewardRarity>('Legendary');
  const [session, setSession] = useState(0);
  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare={false}
      workshopControls={{
        description: 'The Relics scene runs the development economy in this tab: every Relic, DAO XP and Energy credit comes from real server code. Only the Fate Survival outcome is simulated.',
        defaultSection: 'scenes',
        sections: [
          {
            id: 'scenes',
            description: scene === 'relics' ? 'Earn Relics through the Fate Survival simulator and inspect the collection.' : 'Play the Relic Reveal at any rarity. The Relic shown is a catalogue sample; nothing is credited.',
            content: (
              <div className="flex flex-wrap gap-2">
                <WorkshopActionButton pressed={scene === 'relics'} onClick={() => setScene('relics')}>Relics</WorkshopActionButton>
                <WorkshopActionButton pressed={scene === 'reveal'} onClick={() => setScene('reveal')}>Reveal lab</WorkshopActionButton>
                {scene === 'relics' && <WorkshopActionButton onClick={() => setSession(value => value + 1)}>Reset account</WorkshopActionButton>}
              </div>
            ),
          },
          ...(scene === 'reveal' ? [{
            id: 'effects' as const,
            description: 'The rarity ladder: the accent colour and ambient effects scale; the card layout never changes.',
            content: (
              <div className="flex flex-wrap gap-2">
                {REWARD_RARITIES.map(option => (
                  <WorkshopActionButton key={option} pressed={rarity === option} onClick={() => setRarity(option)}>{option}</WorkshopActionButton>
                ))}
              </div>
            ),
          }] : []),
        ],
      }}
      renderReference={() => <RelicsReference />}
      renderDevelopment={() => scene === 'reveal'
        ? <RevealLab key={rarity} rarity={rarity} />
        : <WorkshopEconomyProvider key={session}><FateSurvivalScene /></WorkshopEconomyProvider>}
    />
  );
}

export default RelicsWorkspace;
