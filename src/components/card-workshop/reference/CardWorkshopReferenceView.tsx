import React from 'react';
import { SystemBlock } from '../../reader-chamber/reference/SystemBlock';
import { ManifestationImage } from '../../reader-chamber/reference/ManifestationImage';
import type { Chapter } from '../../reader-chamber/shared/types';
import { CARD_PRESETS } from '../../../workshop/previews/card-workshop/previewData';
import { CodexRevealCardReference } from './CodexRevealCardReference';

const preset = (id: string) => CARD_PRESETS.find(candidate => candidate.id === id)!;

const human = preset('preset-human-character');
const system = preset('preset-system-status');
const fate = preset('preset-fate-result');
const manifestation = preset('preset-manifestation-image');

const manifestationChapter = {
  number: manifestation.manifestationImage?.chapterNumber ?? 1,
  title: manifestation.title,
  premise: manifestation.description,
  status: 'read',
  summary: manifestation.manifestationImage?.quote ?? manifestation.description,
  generatedContent: '',
  assetManifest: manifestation.manifestationImage?.url
    ? { heroImage: manifestation.manifestationImage.url }
    : undefined,
} satisfies Chapter;

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
            {human.codexReveal && (
              <CodexRevealCardReference
                revealTerm={human.codexReveal}
                backdropUrl="/card-workshop/reveal-backdrop.svg"
              />
            )}
          </ReferencePanel>
          <ReferencePanel title="SystemBlock">
            <SystemBlock content={system.systemContent ?? ''} system={system.systemEvent} />
          </ReferencePanel>
          <ReferencePanel title="FateResultCard through SystemBlock">
            <SystemBlock content={fate.systemContent ?? ''} system={fate.systemEvent} />
          </ReferencePanel>
        </div>

        <ReferencePanel title="Chapter-level ManifestationImage">
          <ManifestationImage selectedChapter={manifestationChapter} />
        </ReferencePanel>
      </div>
    </div>
  );
}
