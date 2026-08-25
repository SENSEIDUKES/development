import React, { useState } from 'react';
import { RelicReveal as ReferenceRelicReveal } from '../../../components/relics/reference/RelicReveal';
import {
  RelicCard,
  RelicModal,
  RelicReveal as DevelopmentRelicReveal,
  type CosmicArtifact,
} from '@Seihouse/Library/relics';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { mockRelics } from './mockData';
import { Sparkles, RotateCcw } from 'lucide-react';

type Scene = 'cards' | 'reveal';

const RARITY_RANKS = ['Transcendent', 'Mythic', 'Legendary', 'Epic', 'Rare', 'Common'];

function RelicsScene({ scene, RevealComponent }: { scene: Scene; RevealComponent: typeof ReferenceRelicReveal }) {
  const [inspectArtifact, setInspectArtifact] = useState<CosmicArtifact | null>(null);
  const [revealArtifact, setRevealArtifact] = useState<CosmicArtifact | null>(null);
  const [replayKey, setReplayKey] = useState(0);

  const getRelicsByRarity = (rarity: string) => mockRelics.filter((r) => r.rarity === rarity);

  const openReveal = (relic: CosmicArtifact) => {
    setInspectArtifact(null);
    setReplayKey(0);
    setRevealArtifact(relic);
  };

  if (scene === 'reveal') {
    return (
      <div className="min-h-[calc(100vh-11rem)] bg-black text-white font-sans flex items-center justify-center p-6">
        {!revealArtifact ? (
          <button
            type="button"
            onClick={() => openReveal(mockRelics[0])}
            className="flex items-center gap-2 px-6 py-3 rounded-full border border-portal/40 text-portal text-sm uppercase tracking-widest font-mono hover:bg-portal/10 hover:border-portal/70 transition-colors"
          >
            <Sparkles size={14} /> Open Reveal Flow
          </button>
        ) : (
          <>
            <RevealComponent
              key={revealArtifact.id}
              artifact={revealArtifact}
              replayKey={replayKey}
              onClaim={() => setRevealArtifact(null)}
              onDismiss={() => setRevealArtifact(null)}
            />
            <button
              type="button"
              onClick={() => setReplayKey((k) => k + 1)}
              className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[130] flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900/90 border border-neutral-600 text-neutral-200 text-[11px] uppercase tracking-widest font-mono hover:bg-neutral-800 hover:text-white hover:border-neutral-400 transition-colors shadow-lg backdrop-blur"
            >
              <RotateCcw size={12} />
              Replay Effects
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-11rem)] bg-black text-white font-sans p-6 md:p-12 pb-24">
      <div className="space-y-16">
        {RARITY_RANKS.map((rarity) => {
          const relics = getRelicsByRarity(rarity);
          if (relics.length === 0) return null;

          return (
            <div key={rarity} className="space-y-4">
              <h2
                className={`text-lg font-bold uppercase tracking-widest font-sc pb-2 border-b border-neutral-900/50 ${
                  rarity === 'Transcendent'
                    ? 'text-cyan-400'
                    : rarity === 'Mythic'
                      ? 'text-red-500'
                      : rarity === 'Legendary'
                        ? 'text-amber-500'
                        : rarity === 'Epic'
                          ? 'text-purple-400'
                          : rarity === 'Rare'
                            ? 'text-emerald-400'
                            : 'text-neutral-500'
                }`}
              >
                {rarity} Rank
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {relics.map((relic) => (
                  <div key={relic.id} className="flex flex-col gap-2">
                    <RelicCard artifact={relic} onClick={setInspectArtifact} />
                    <button
                      type="button"
                      onClick={() => openReveal(relic)}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-full border border-portal/40 text-portal text-[10px] uppercase tracking-widest font-mono hover:bg-portal/10 hover:border-portal/70 transition-colors"
                    >
                      <Sparkles size={10} />
                      Reveal
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <RelicModal inspectArtifact={inspectArtifact} onClose={() => setInspectArtifact(null)} />
    </div>
  );
}

export function RelicsWorkspace() {
  const entry = workshopEntries.find((e) => e.id === 'relics-gallery')!;
  const [scene, setScene] = useState<Scene>('cards');

  return (
    <FeatureWorkspace
      entry={entry}
      workshopControls={{
        defaultSection: 'scenes',
        sections: [
          {
            id: 'scenes',
            description: 'Switch the Workshop canvas between the inventory gallery and the full reveal flow.',
            content: (
              <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={scene === 'cards'}
                onClick={() => setScene('cards')}
                className={`workshop-touch-target rounded-lg border px-4 py-2 text-sm transition-colors ${
                  scene === 'cards' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-100' : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'
                }`}
              >
                Compact Cards
              </button>
              <button
                type="button"
                aria-pressed={scene === 'reveal'}
                onClick={() => setScene('reveal')}
                className={`workshop-touch-target rounded-lg border px-4 py-2 text-sm transition-colors ${
                  scene === 'reveal' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-100' : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'
                }`}
              >
                Reveal Flow
              </button>
              </div>
            ),
          },
        ],
      }}
      renderReference={() => <RelicsScene scene={scene} RevealComponent={ReferenceRelicReveal} />}
      renderDevelopment={() => <RelicsScene scene={scene} RevealComponent={DevelopmentRelicReveal} />}
    />
  );
}

export default RelicsWorkspace;
