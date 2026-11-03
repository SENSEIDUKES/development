import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Download } from 'lucide-react';
import { SEIDialog, SEIDialogContent, SEIDialogDescription, SEIDialogTitle } from '@seihouse/ui';
import { LibraryButton, LibraryManifestingIcon, ManifestButton } from '@seihouse/library-ui';
import type { RevealedMediaAsset } from '@seihouse/sen/manifestations';
import GenerationOverlay from '../../components/chapter-manifestation/development/GenerationOverlay';
import type { LoadingAgentPresentation } from '../manifestations/taskCard';
import { STORY_COVER_CHOICES, type StoryCoverChoice, type StoryCoverRequest, type StoryCoverService } from './storyCover';
import { EnergyActionCost } from '../../components/energy/development/EnergyActionCost';
import { EnergySpendFloater, type EnergySpendBurst } from '../../components/energy/development/EnergySpendFloater';
import { useActionEnergyPrice } from '../../components/energy/shared/energyModels';
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
 * shows Manifest across it; one with a cover keeps only a small Manifest on its
 * top-left corner, in the same ghost glass as the hero's MP control (kept covers
 * will be recovered from the Codex, so the cover carries no download). Manifest
 * asks for one cover or three to choose from (each at an image's Energy price),
 * then the media reveal unseals while they are made. One cover is worn as soon
 * as it is revealed; three open a picker, in the Reader's glass, that shows the
 * chosen cover large over a row of all three (each with its download), and
 * the reader keeps the one they want.
 *
 * A cover's title is earned: until the story reaches its ending (destined or
 * failed) its covers carry no lettering, and once it has, Manifest offers to
 * regenerate the cover with its title.
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
  const imagePrice = useActionEnergyPrice('image.generate') ?? 0;

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
  const regenerateWithTitle = Boolean(coverUrl && request.titled);
  const recastLabel = regenerateWithTitle ? 'Regenerate with a title' : 'Manifest a new cover';
  const onCover = <div className="story-cover-on" data-testid="story-cover" data-cover={coverUrl ? 'kept' : 'none'} data-phase={phase}>
    {!coverUrl
      ? <button type="button" className="story-cover-manifest" onClick={() => setPhase('choosing')} disabled={phase !== 'idle'}
          aria-label="Manifest cover art">
          <LibraryManifestingIcon size={34} aria-hidden="true" />
          <span>{making && !agent ? 'Manifesting…' : 'Manifest'}</span>
        </button>
      : <button type="button" className="world-card-base-format story-cover-recast" onClick={() => setPhase('choosing')}
          disabled={phase !== 'idle'} aria-label={recastLabel} title={recastLabel}>
          <LibraryManifestingIcon size={17} aria-hidden="true" />
        </button>}
    {making && !agent && coverUrl && <span className="story-cover-busy" role="status">Manifesting…</span>}
    {problem && phase === 'idle' && <p className="story-cover-problem" role="alert">{problem}</p>}
    <EnergySpendFloater burst={spent} note="practice: nothing is taken yet" />
  </div>;

  const overPage = <>
    {/* One cover, or three to choose from: each at an image's price. */}
    <SEIDialog open={phase === 'choosing'} onOpenChange={open => { if (!open) setPhase('idle'); }}>
      <SEIDialogContent variant="dark" className="story-cover-dialog reader-glass" bodyClassName="story-cover-dialog-body">
        <span className="story-cover-dialog-seam" aria-hidden="true" />
        <SEIDialogTitle className="story-cover-dialog-title">{regenerateWithTitle ? 'Regenerate with a title' : 'Manifest cover'}</SEIDialogTitle>
        <SEIDialogDescription className="story-cover-dialog-intro">{request.titled
          ? 'Your story has reached its ending, so its cover now carries its title.'
          : "Cover art made from your story's own words. Its title is added when the story reaches its ending."}</SEIDialogDescription>
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
      <SEIDialogContent variant="dark" className="story-cover-dialog story-cover-picker reader-glass" bodyClassName="story-cover-dialog-body">
        <span className="story-cover-dialog-seam" aria-hidden="true" />
        <SEIDialogTitle className="story-cover-dialog-title">Choose your cover</SEIDialogTitle>
        <SEIDialogDescription className="story-cover-dialog-intro">Tap a cover to see it up close, then keep the one you love.</SEIDialogDescription>
        {problem && <p className="story-cover-dialog-note" role="status">{problem}</p>}
        {/* The chosen cover, large, as World Info will wear it. */}
        {made[chosen] && <figure className="story-cover-stage" data-testid="story-cover-stage">
          <img key={made[chosen]} src={made[chosen]} alt={`Cover ${chosen + 1} of ${made.length} for ${request.title}`} />
          <figcaption className="story-cover-stage-count">Cover {chosen + 1} of {made.length}</figcaption>
        </figure>}
        <div className="story-cover-choices" role="group" aria-label="Covers to choose from">
          {made.map((url, index) => <div key={url} className="story-cover-choice-wrap" style={{ animationDelay: `${index * 160}ms` }}>
            <button type="button" className="story-cover-choice" aria-pressed={index === chosen}
              aria-label={`Cover ${index + 1}`} onClick={() => setChosen(index)} disabled={saving}>
              <img src={url} alt="" />
              {index === chosen && <span className="story-cover-choice-mark" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>}
            </button>
            {/* Every cover made can be saved here, chosen or not; the ones not kept are let go. */}
            <a className="world-card-base-format story-cover-choice-download" href={url} download={coverFileName(request.title, index)}
              aria-label={`Download cover ${index + 1}`} title="Download">
              <Download size={14} aria-hidden="true" />
            </a>
          </div>)}
        </div>
        <div className="story-cover-dialog-actions">
          <LibraryButton variant="secondary" onClick={closePicker} disabled={saving}>Not now</LibraryButton>
          <ManifestButton size="md" icon={Check} className="story-cover-keep" onClick={() => void keepChosen()} disabled={saving}>{saving ? 'Keeping…' : 'Use this cover'}</ManifestButton>
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
