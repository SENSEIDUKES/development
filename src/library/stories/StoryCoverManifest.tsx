import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Download } from 'lucide-react';
import { SEIDialog, SEIDialogContent, SEIDialogDescription, SEIDialogTitle } from '@seihouse/ui';
import { LibraryButton, LibraryManifestingIcon } from '@seihouse/library-ui';
import type { RevealedMediaAsset } from '@seihouse/sen/manifestations';
import GenerationOverlay from '../../components/chapter-manifestation/development/GenerationOverlay';
import type { LoadingAgentPresentation } from '../manifestations/taskCard';
import { STORY_COVER_CHOICES, type StoryCoverChoice, type StoryCoverRequest, type StoryCoverService } from './storyCover';
import { EnergyActionCost } from '../../components/energy/development/EnergyActionCost';
import { EnergySpendFloater, type EnergySpendBurst } from '../../components/energy/development/EnergySpendFloater';
import { getEnergyPriceEntry } from '../../components/energy/shared/energyContracts';
import './story-cover.css';

/** How long the revealed cover stays on the veil before World Info shows it. */
export const COVER_REVEAL_HOLD_MS = 2_600;

/** The veil stays open while a cover is made; there is no minimized state here. */
const keepVeilOpen = () => undefined;

type Phase = 'idle' | 'choosing' | 'making' | 'revealed' | 'picking';

const CHOICE_LABELS: Record<StoryCoverChoice, { title: string; detail: string }> = {
  1: { title: 'One cover', detail: 'Made and worn straight away.' },
  3: { title: 'Three to choose from', detail: 'Pick the one you love.' },
};

/** A file name for a downloaded cover, from the story's title. */
const coverFileName = (title: string, index?: number) =>
  `${title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'cover'}-cover${index === undefined ? '' : `-${index + 1}`}.png`;

/**
 * World Info's cover art, made on the cover itself. A story without a cover
 * shows Manifest across it; one with a cover keeps a small Manifest and a
 * download in its corner. Manifest asks for one cover or three to choose from
 * (each at an image's Energy price), then the media reveal unseals while they
 * are made. One cover is worn as soon as it is revealed; three open a picker
 * where the covers come alive and the reader keeps the one they want.
 *
 * Returns what sits on the cover (for World Info's cover slot) and what opens
 * above the page (the choice, the veil and the picker).
 */
export function useStoryCoverManifest({ covers, storyId, request, agent }: {
  covers: StoryCoverService;
  storyId: string;
  request: StoryCoverRequest;
  /** The Familiar's agent the veil shows; without one, the cover itself says it is manifesting. */
  agent?: LoadingAgentPresentation;
}): { onCover: ReactNode; overPage: ReactNode } {
  const [phase, setPhase] = useState<Phase>('idle');
  const [asset, setAsset] = useState<RevealedMediaAsset | null>(null);
  const [made, setMade] = useState<string[]>([]);
  const [chosen, setChosen] = useState(0);
  const [problem, setProblem] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [spent, setSpent] = useState<EnergySpendBurst>();
  const madeRef = useRef<string[]>([]);
  const coverUrl = covers.coverUrl(storyId);
  const imagePrice = getEnergyPriceEntry('image.generate').price ?? 0;

  // The revealed cover holds a moment, then the veil leaves and World Info wears it.
  useEffect(() => {
    if (phase !== 'revealed') return;
    const timer = setTimeout(() => setPhase('idle'), COVER_REVEAL_HOLD_MS);
    return () => clearTimeout(timer);
  }, [phase]);
  // Covers made and never kept are let go when World Info goes.
  useEffect(() => () => covers.letGo(madeRef.current), [covers]);

  const holdMade = (urls: string[]) => { madeRef.current = urls; setMade(urls); };

  const manifest = async (count: StoryCoverChoice) => {
    setPhase('making');
    setAsset(null);
    setProblem(undefined);
    try {
      const result = await covers.make(storyId, request, count);
      if (!result.urls.length) {
        setPhase('idle');
        setProblem(result.problem ?? 'The cover could not be made. Please try again.');
        return;
      }
      if (imagePrice) setSpent(previous => ({ key: (previous?.key ?? 0) + 1, amount: imagePrice, count: result.urls.length }));
      if (result.urls.length === 1) {
        // One cover is worn as soon as it is revealed.
        await covers.keep(storyId, result.urls[0]);
        setAsset({ src: covers.coverUrl(storyId) ?? result.urls[0], alt: `Cover art for ${request.title}` });
        setPhase(agent ? 'revealed' : 'idle');
        if (result.problem) setProblem(result.problem);
        return;
      }
      holdMade(result.urls);
      setChosen(0);
      setProblem(result.problem);
      setPhase('picking');
    } catch (error) {
      setPhase('idle');
      setProblem(error instanceof Error ? error.message : 'The cover could not be made. Please try again.');
    }
  };

  const keepChosen = async () => {
    const url = made[chosen];
    if (!url) return;
    setSaving(true);
    try {
      await covers.keep(storyId, url);
      covers.letGo(made.filter(other => other !== url));
      holdMade([]);
      setProblem(undefined);
      setPhase('idle');
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'The cover could not be kept. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const closePicker = () => {
    covers.letGo(made);
    holdMade([]);
    setProblem(undefined);
    setPhase('idle');
  };

  const making = phase === 'making';
  const onCover = <div className="story-cover-on" data-testid="story-cover" data-cover={coverUrl ? 'kept' : 'none'} data-phase={phase}>
    {!coverUrl
      ? <button type="button" className="story-cover-manifest" onClick={() => setPhase('choosing')} disabled={phase !== 'idle'}
          aria-label="Manifest cover art">
          <LibraryManifestingIcon size={34} aria-hidden="true" />
          <span>{making && !agent ? 'Manifesting…' : 'Manifest'}</span>
        </button>
      : <div className="story-cover-corner">
          <button type="button" className="story-cover-ghost" onClick={() => setPhase('choosing')} disabled={phase !== 'idle'}
            aria-label="Manifest a new cover" title="Manifest a new cover">
            <LibraryManifestingIcon size={17} aria-hidden="true" />
          </button>
          <a className="story-cover-ghost" href={coverUrl} download={coverFileName(request.title)}
            aria-label="Download cover" title="Download cover" data-testid="story-cover-download">
            <Download size={16} aria-hidden="true" />
          </a>
        </div>}
    {making && !agent && coverUrl && <span className="story-cover-busy" role="status">Manifesting…</span>}
    {problem && phase === 'idle' && <p className="story-cover-problem" role="alert">{problem}</p>}
    <EnergySpendFloater burst={spent} note="practice: nothing is taken yet" />
  </div>;

  const overPage = <>
    {/* One cover, or three to choose from: each at an image's price. */}
    <SEIDialog open={phase === 'choosing'} onOpenChange={open => { if (!open) setPhase('idle'); }}>
      <SEIDialogContent variant="dark" className="story-cover-dialog" bodyClassName="story-cover-dialog-body">
        <SEIDialogTitle className="story-cover-dialog-title">Manifest cover</SEIDialogTitle>
        <SEIDialogDescription className="story-cover-dialog-intro">Cover art made from your story's own words.</SEIDialogDescription>
        <div className="story-cover-options" role="group" aria-label="How many covers">
          {STORY_COVER_CHOICES.map(count => <button key={count} type="button" className="story-cover-option" data-count={count}
            onClick={() => void manifest(count)}>
            <span className="story-cover-option-stack" aria-hidden="true">
              {Array.from({ length: count }, (_, index) => <span key={index} />)}
            </span>
            <span className="story-cover-option-text">
              <strong>{CHOICE_LABELS[count].title}</strong>
              <small>{CHOICE_LABELS[count].detail}</small>
            </span>
            <EnergyActionCost price={imagePrice * count} />
          </button>)}
        </div>
      </SEIDialogContent>
    </SEIDialog>

    {/* Three made: they come alive one after another, and the reader keeps one. */}
    <SEIDialog open={phase === 'picking'} onOpenChange={open => { if (!open && !saving) closePicker(); }}>
      <SEIDialogContent variant="dark" className="story-cover-dialog story-cover-picker" bodyClassName="story-cover-dialog-body">
        <SEIDialogTitle className="story-cover-dialog-title">Choose your cover</SEIDialogTitle>
        <SEIDialogDescription className="story-cover-dialog-intro">Tap the one you want. The others are let go.</SEIDialogDescription>
        {problem && <p className="story-cover-dialog-note" role="status">{problem}</p>}
        <div className="story-cover-choices" role="group" aria-label="Covers to choose from">
          {made.map((url, index) => <div key={url} className="story-cover-choice-wrap" style={{ animationDelay: `${index * 180}ms` }}>
            <button type="button" className="story-cover-choice" aria-pressed={index === chosen}
              aria-label={`Cover ${index + 1}`} onClick={() => setChosen(index)} disabled={saving}>
              <img src={url} alt="" />
              {index === chosen && <Check size={18} aria-hidden="true" />}
            </button>
            {/* Every cover made can be kept, chosen or not. */}
            <a className="story-cover-ghost story-cover-choice-download" href={url} download={coverFileName(request.title, index)}
              aria-label={`Download cover ${index + 1}`} title="Download">
              <Download size={15} aria-hidden="true" />
            </a>
          </div>)}
        </div>
        <div className="story-cover-dialog-actions">
          <LibraryButton variant="secondary" onClick={closePicker} disabled={saving}>Not now</LibraryButton>
          <LibraryButton onClick={() => void keepChosen()} disabled={saving}>{saving ? 'Keeping…' : 'Use this cover'}</LibraryButton>
        </div>
      </SEIDialogContent>
    </SEIDialog>

    {agent && <GenerationOverlay agent={agent} isGenerating={making || phase === 'revealed'} completed={phase === 'revealed'}
      generationPhase="cover" generatingChapterNum={null} progress={null}
      mediaReveal={phase === 'revealed' ? 'revealed' : 'unsealing'} mediaAsset={asset}
      generationProgressMessage={null} estimatedSecondsRemaining={null} activeAgentId="versa"
      streamingBlocksCount={0} isVeilMinimized={false} setIsVeilMinimized={keepVeilOpen} />}
  </>;

  return { onCover, overPage };
}
