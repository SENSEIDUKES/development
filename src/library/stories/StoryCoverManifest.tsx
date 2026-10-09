import { useEffect, useState } from 'react';
import { Download, ImagePlus } from 'lucide-react';
import type { RevealedMediaAsset } from '@seihouse/sen/manifestations';
import GenerationOverlay from '../../components/chapter-manifestation/development/GenerationOverlay';
import type { LoadingAgentPresentation } from '../manifestations/taskCard';
import type { StoryCoverRequest, StoryCoverService } from './storyCover';
import { EnergyActionCost } from '../../components/energy/development/EnergyActionCost';
import { EnergySpendFloater, type EnergySpendBurst } from '../../components/energy/development/EnergySpendFloater';
import { getEnergyPriceEntry } from '../../components/energy/shared/energyContracts';

/** How long the revealed cover stays on the veil before World Info shows it. */
export const COVER_REVEAL_HOLD_MS = 2_600;

/** The veil stays open while a cover is made; there is no minimized state here. */
const keepVeilOpen = () => undefined;

type Phase = 'idle' | 'making' | 'revealed';

/**
 * Story View's cover art: Manifest cover makes one from the story's own words
 * through the host's cover service, behind the media reveal (the scroll
 * unseals while it is made and opens on the finished cover). The host keeps
 * it, so World Info and Home show it. A reader who does not like it makes
 * another.
 */
export function StoryCoverManifest({ covers, storyId, request, agent }: {
  covers: StoryCoverService;
  storyId: string;
  request: StoryCoverRequest;
  /** The Familiar's agent the veil shows; without one, the button says it is making the cover. */
  agent?: LoadingAgentPresentation;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [asset, setAsset] = useState<RevealedMediaAsset | null>(null);
  const [problem, setProblem] = useState<string>();
  const coverUrl = covers.coverUrl(storyId);
  const hasCover = Boolean(coverUrl);
  const [spent, setSpent] = useState<EnergySpendBurst>();
  const imagePrice = getEnergyPriceEntry('image.generate').price ?? 0;

  // The revealed cover holds a moment, then the veil leaves and World Info wears it.
  useEffect(() => {
    if (phase !== 'revealed') return;
    const timer = setTimeout(() => setPhase('idle'), COVER_REVEAL_HOLD_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const manifest = async () => {
    setPhase('making');
    setAsset(null);
    setProblem(undefined);
    try {
      const src = await covers.manifest(storyId, request);
      setAsset({ src, alt: `Cover art for ${request.title}` });
      setPhase('revealed');
      if (imagePrice) setSpent(previous => ({ key: (previous?.key ?? 0) + 1, amount: imagePrice, count: 1 }));
    } catch (error) {
      setPhase('idle');
      setProblem(error instanceof Error ? error.message : 'The cover could not be made. Please try again.');
    }
  };

  return <>
    <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2" data-testid="story-cover">
      <span className="relative inline-flex">
        <button type="button" onClick={() => void manifest()} disabled={phase !== 'idle'}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d4af37]/45 bg-[#d4af37]/10 px-4 text-sm font-semibold text-[#f3dc8a] hover:border-[#d4af37]/80 disabled:opacity-60">
          <ImagePlus size={16} aria-hidden="true" />
          {phase === 'making' && !agent ? 'Making the cover…' : hasCover ? 'New cover' : 'Manifest cover'}
        </button>
        <EnergySpendFloater burst={spent} note="practice: nothing is taken yet" />
      </span>
      {imagePrice > 0 && <EnergyActionCost actionId="image.generate" />}
      {coverUrl && <a href={coverUrl} download={`${request.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'cover'}-cover.png`}
        aria-label="Download cover" title="Download cover" data-testid="story-cover-download"
        className="inline-grid h-11 w-11 place-items-center rounded-full border border-[#d4af37]/45 text-[#f3dc8a] hover:border-[#d4af37]/80">
        <Download size={16} aria-hidden="true" />
      </a>}
      <p className="min-w-0 flex-1 text-xs text-neutral-400">
        {hasCover
          ? 'Made from your story\'s own words. Make another whenever you like; the new one replaces it.'
          : 'Cover art made from your story\'s own words, shown here and on Home.'}
      </p>
      {problem && <p role="alert" className="w-full text-xs text-amber-200">{problem}</p>}
    </div>
    {agent && <GenerationOverlay agent={agent} isGenerating={phase !== 'idle'} completed={phase === 'revealed'}
      generationPhase="cover" generatingChapterNum={null} progress={null}
      mediaReveal={phase === 'revealed' ? 'revealed' : 'unsealing'} mediaAsset={asset}
      generationProgressMessage={null} estimatedSecondsRemaining={null} activeAgentId="versa"
      streamingBlocksCount={0} isVeilMinimized={false} setIsVeilMinimized={keepVeilOpen} />}
  </>;
}
