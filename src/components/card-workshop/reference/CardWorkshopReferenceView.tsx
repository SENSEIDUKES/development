import React from 'react';
import { SystemBlock } from '../../reader-chamber/reference/SystemBlock';
import { ManifestationImage } from '../../reader-chamber/reference/ManifestationImage';
import type { Chapter, SystemEvent } from '../../reader-chamber/shared/types';
import { CodexRevealCardReference } from './CodexRevealCardReference';

const REFERENCE_HUMAN_REVEAL = {
  type: 'character',
  entry: {
    id: 'char-ye-chen-ref',
    name: 'Ye Chen',
    role: 'Former Core Disciple',
    status: 'alive',
    relationshipToMC: 'protagonist',
    description: 'Stripped of his core cultivation after unearthing the sect’s prohibited ninth meridian ledger.',
    portraitKind: 'human',
    imageUrl: '/card-workshop/test-images/ye_chen_portrait.png',
  },
};

const REFERENCE_SYSTEM_CONTENT = '[ SYSTEM NOTIFICATION: Meridian Resonance 84% — Minor Bottleneck Cleared ]';
const REFERENCE_SYSTEM_EVENT: SystemEvent = {
  kind: 'system_prompt',
  title: 'Meridian Status & Vitality Flow',
  rarity: 'First Witness Core Resonance',
  rows: [
    { label: 'Cultivation Stage', value: 'Foundation Establishment — Stage 4' },
    { label: 'Spiritual Qi Pool', value: '1,420 / 1,500 (+12/min in Rain)' },
    { label: 'Soul Seam Sight', value: 'Active (Radius: 30 paces)' },
    { label: 'Dao Alignment', value: 'Unbroken Celestial Truth' },
  ],
};

const REFERENCE_FATE_CONTENT = '[ FATE SCARRED: Rin shattered the Magistrate\'s Blood Oath at great personal cost ]';
const REFERENCE_FATE_EVENT: SystemEvent = {
  kind: 'fate_system_prompt',
  title: 'Destiny Divergence Manifested',
  fateResult: {
    outcome: 'FATE SCARRED',
    timelineScar: 'Left arm spiritual meridians permanently sealed against celestial Qi.',
    permanentCosts: [
      'Cannot channel direct lightning or thunderstorm arts without severe backlash.',
      'Disabled off-hand spellcasting',
      'Rain sight limited to right eye',
    ],
    newStoryState: 'First false oath exposed before the Rain Court',
    newActiveStats: ['Willpower +25', 'Left Arm Flow: 0%', 'Karmic Weight: Heavy'],
  },
};

const manifestationChapter: Chapter = {
  number: 1,
  title: 'Manifestation Image',
  premise: 'Legacy chapter-level artwork retained only for the locked production Reference pane.',
  status: 'read',
  summary: '"Your oath has a seam, Magistrate."',
  generatedContent: '',
  assetManifest: { heroImage: '/card-workshop/test-images/sergeant_anya_petrova_portrait.png' },
};

function ReferencePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-950/50 p-4">
      <h2 className="mb-3 text-[11px] font-mono uppercase tracking-widest text-white/50">{title}</h2>
      {children}
    </section>
  );
}

/** Production presentation baseline. Workshop controls intentionally live only in Development. */
export function CardWorkshopReferenceView() {
  return (
    <div className="min-h-screen bg-[#01070e] px-4 py-8 text-signal sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">Locked production baseline</p>
          <h1 className="mt-1 font-display text-xl text-white">Reader card presentations</h1>
          <p className="mt-2 max-w-2xl text-xs text-neutral-400">
            Representative production components as inspected on 2026-08-14. State controls and developer annotations belong to the Development pane.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ReferencePanel title="Inline Codex Reveal">
            <CodexRevealCardReference
              revealTerm={REFERENCE_HUMAN_REVEAL}
              backdropUrl="/card-workshop/reveal-backdrop.svg"
            />
          </ReferencePanel>
          <ReferencePanel title="SystemBlock">
            <SystemBlock content={REFERENCE_SYSTEM_CONTENT} system={REFERENCE_SYSTEM_EVENT} />
          </ReferencePanel>
          <ReferencePanel title="FateResultCard through SystemBlock">
            <SystemBlock content={REFERENCE_FATE_CONTENT} system={REFERENCE_FATE_EVENT} />
          </ReferencePanel>
        </div>

        <ReferencePanel title="Chapter-level ManifestationImage">
          <ManifestationImage selectedChapter={manifestationChapter} />
        </ReferencePanel>
      </div>
    </div>
  );
}
