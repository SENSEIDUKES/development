import { CharacterPortrait } from './CharacterPortrait';
import type { PortraitCharacter } from '../story-seed/blueprintPictures';
import type { CodexPictureMaker } from '@seihouse/sen/harness-generation';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type TouchEvent } from 'react';
import { Check, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { SEIDialog, SEIDialogContent, SEIDialogDescription, SEIDialogTitle } from '@seihouse/ui';
import { LibraryManifestingIcon, ManifestButton } from '@seihouse/ui/sen';
import type { RevealedMediaAsset } from '@seihouse/sen/manifestations';
import GenerationOverlay from '../../components/chapter-manifestation/development/GenerationOverlay';
import type { LoadingAgentPresentation } from '../manifestations/taskCard';
import { STORY_COVER_CHANCES, STORY_COVER_CHOICES, type StoryCoverChoice, type StoryCoverRequest, type StoryCoverService } from './storyCover';
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
  1: { title: 'One cover', detail: 'Worn straight away.' },
  3: { title: 'Three to choose from', detail: 'Keep the one you love.' },
};

/** A file name for a downloaded cover, from the story's title. */
const coverFileName = (title: string, index?: number) =>
  `${title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'cover'}-cover${index === undefined ? '' : `-${index + 1}`}.png`;

/**
 * World Info's cover art, made on the cover itself. A story without a cover
 * shows Manifest across it. Manifest asks only what the cover needs: whether it
 * carries the story's title, an optional second character, and one cover or
 * three to choose from (each at an image's Energy price); then the media reveal
 * unseals while they are made. One cover is worn as soon as it is revealed;
 * three open a picker, in the Reader's glass, that shows one cover at a time,
 * large, to cycle through (swipe, arrows or keys), and the reader keeps one.
 *
 * A story has three chances to make cover art (`STORY_COVER_CHANCES`; each
 * time is one cover or three to choose from). The sheet says so and shows how
 * many are left. While any are, a kept cover keeps a small Manifest on its
 * top-left corner, in the hero's ghost glass; once they are used the cover is
 * locked and carries nothing. Only a host that says so (`unlimited`, the
 * Workshop's cover test) has no limit.
 *
 * Returns what sits on the cover (for World Info's cover slot) and what opens
 * above the page (the choice, the veil and the picker).
 */
export function useStoryCoverManifest({ covers, storyId, request, agent, characters = [], pictures, referenceOf, unlimited = false }: {
  covers: StoryCoverService;
  storyId: string;
  request: StoryCoverRequest;
  characters?: PortraitCharacter[];
  pictures?: CodexPictureMaker;
  referenceOf?: (key: string) => Promise<{ data: string; mimeType: string } | undefined>;
  /** The Familiar's agent the veil shows; without one, the cover itself says it is manifesting. */
  agent?: LoadingAgentPresentation;
  /** A special circumstance the host allows: no limit on how many times covers are made. */
  unlimited?: boolean;
}): { onCover: ReactNode; overPage: ReactNode } {
  const swipeStart = useRef(0);
  const coverPending = useRef(false);
  const [secondKey, setSecondKey] = useState<string>();
  const protagonist = characters.find(character => character.mainCharacter);
  const others = characters.filter(character => !character.mainCharacter && pictures?.pictureOf(character.key));
  const second = others.find(character => character.key === secondKey);
  const choices = [undefined, ...others];
  const chooseSecond = (step: number) => {
    const index = choices.findIndex(character => character?.key === second?.key);
    setSecondKey(choices[(index + step + choices.length) % choices.length]?.key);
  };
  const [titled, setTitled] = useState(false);
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
  const letGo = covers.letGo;
  useEffect(() => () => letGo(madeRef.current), [letGo]);

  const holdMade = (urls: string[]) => { madeRef.current = urls; setMade(urls); };

  const manifest = async (count: StoryCoverChoice) => {
    if (coverPending.current || chancesLeft <= 0) return;
    coverPending.current = true;
    setPhase('making');
    setAsset(null);
    setProblem(undefined);
    try {
      if (!protagonist || !pictures?.pictureOf(protagonist.key) || !referenceOf) throw new Error('Manifest the main character before making a cover.');
      const references: NonNullable<StoryCoverRequest['characters']> = [];
      for (const character of [protagonist, ...(second ? [second] : [])]) {
        const image = await referenceOf(character.key);
        if (!image) throw new Error(`The portrait for ${character.name} could not be opened. Please try again.`);
        references.push({ name: character.name, role: character.mainCharacter ? 'protagonist' : 'counterpart', relationship: character.relationship, image });
      }
      const result = await covers.make(storyId, { ...request, ...(titled ? { titled: true } : {}), characters: references }, count);
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
    } finally { coverPending.current = false; }
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
  const chancesLeft = unlimited ? Infinity : Math.max(0, STORY_COVER_CHANCES - covers.madeCount(storyId));
  const ready = Boolean(protagonist && pictures?.pictureOf(protagonist.key) && referenceOf) && chancesLeft > 0;
  // Not while the chosen cover is being kept: what is shown is what is kept.
  const cycle = (step: number) => { if (!saving) setChosen(index => (index + step + made.length) % made.length); };
  const swipe = (step: (direction: number) => void) => ({
    onTouchStart: (event: TouchEvent) => { swipeStart.current = event.touches[0].clientX; },
    onTouchEnd: (event: TouchEvent) => { const delta = event.changedTouches[0].clientX - swipeStart.current; if (Math.abs(delta) > 40) step(delta < 0 ? 1 : -1); },
    onKeyDown: (event: KeyboardEvent) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1); } },
  });
  const onCover = <div className="story-cover-on" data-testid="story-cover" data-cover={coverUrl ? 'kept' : 'none'} data-phase={phase}>
    {!coverUrl
      ? <button type="button" className="story-cover-manifest" onClick={() => setPhase('choosing')} disabled={phase !== 'idle'}
          aria-label="Manifest cover art">
          <LibraryManifestingIcon size={34} aria-hidden="true" />
          <span>{making && !agent ? 'Manifesting…' : 'Manifest'}</span>
        </button>
      : chancesLeft > 0 && <button type="button" className="world-card-base-format story-cover-recast" onClick={() => setPhase('choosing')}
          disabled={phase !== 'idle'} aria-label="Manifest a new cover" title="Manifest a new cover">
          <LibraryManifestingIcon size={17} aria-hidden="true" />
        </button>}
    {making && !agent && coverUrl && <span className="story-cover-busy" role="status">Manifesting…</span>}
    {problem && phase === 'idle' && <p className="story-cover-problem" role="alert">{problem}</p>}
    <EnergySpendFloater burst={spent} note="practice: nothing is taken yet" />
  </div>;

  const overPage = <>
    {/* What the cover needs, then one cover or three: each at an image's price. */}
    <SEIDialog open={phase === 'choosing'} onOpenChange={open => { if (!open) setPhase('idle'); }}>
      <SEIDialogContent variant="dark" className="story-cover-dialog reader-glass" bodyClassName="story-cover-dialog-body">
        <span className="story-cover-dialog-seam" aria-hidden="true" />
        <SEIDialogTitle className="story-cover-dialog-title">Manifest cover</SEIDialogTitle>
        <SEIDialogDescription className="story-cover-dialog-intro">Cover art made from your story's own words.</SEIDialogDescription>
        {/* The obvious sign: three chances for this novel, and how many are left. */}
        {!unlimited && <div className="story-cover-chances" data-testid="story-cover-chances" data-left={chancesLeft} role="status">
          <span className="story-cover-chances-pips" aria-hidden="true">
            {Array.from({ length: STORY_COVER_CHANCES }, (_, index) => <span key={index} data-on={index < chancesLeft || undefined} />)}
          </span>
          <span className="story-cover-chances-text">
            <strong>{chancesLeft === 0 ? 'No chances left' : chancesLeft === 1 ? 'Last chance' : `${chancesLeft} of ${STORY_COVER_CHANCES} chances left`}</strong>
            <small>{chancesLeft === 0
              ? `This novel has used its ${STORY_COVER_CHANCES} chances to make cover art. To make another, message SEIHouse.`
              : `You get ${STORY_COVER_CHANCES} chances to make cover art for this novel. One cover or three, each time uses one.`}</small>
          </span>
        </div>}
        {/* The cover needs the main character's portrait; only a missing one is shown, to be made here. */}
        {!protagonist || !pictures
          ? <p role="status" className="text-sm text-amber-200">Add a named main character and their appearance in the Blueprint before making a cover.</p>
          : !pictures.pictureOf(protagonist.key) && <div className="story-cover-references">
              <p className="text-sm text-neutral-200">A cover is drawn from your main character’s portrait. Manifest it first.</p>
              <div className="story-cover-reference">
                <CharacterPortrait key={protagonist.key} character={protagonist} pictures={pictures} />
              </div>
            </div>}
        <div className="story-cover-settings">
          <div className="story-cover-setting">
            <span>Title on the cover</span>
            <button type="button" role="switch" aria-checked={titled} aria-label="Title on the cover" className="story-cover-onoff" onClick={() => setTitled(!titled)}>
              <span data-on={titled || undefined}>On</span>
              <span data-on={!titled || undefined}>Off</span>
            </button>
          </div>
          {others.length > 0 && <div className="story-cover-setting story-cover-second" tabIndex={0} role="group" aria-label="Second cover character" {...swipe(chooseSecond)}>
            <span>Second character</span>
            <span className="story-cover-stepper">
              <button type="button" aria-label="Previous cover character" onClick={() => chooseSecond(-1)}>◀</button>
              <span className="story-cover-second-value">{second && <img src={pictures?.pictureOf(second.key)} alt="" />}<span>{second?.name ?? 'None'}</span></span>
              <button type="button" aria-label="Next cover character" onClick={() => chooseSecond(1)}>▶</button>
            </span>
          </div>}
        </div>
        <div className="story-cover-options" role="group" aria-label="How many covers">
          {STORY_COVER_CHOICES.map(count => <button key={count} type="button" className="story-cover-option" data-count={count}
            onClick={() => void manifest(count)} disabled={!ready}>
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

    {/* Three made: one cover at a time, large, to cycle through; the reader keeps one. */}
    <SEIDialog open={phase === 'picking'} onOpenChange={open => { if (!open && !saving) closePicker(); }}>
      <SEIDialogContent variant="dark" className="story-cover-dialog story-cover-picker reader-glass" bodyClassName="story-cover-dialog-body">
        <span className="story-cover-dialog-seam" aria-hidden="true" />
        <SEIDialogTitle className="story-cover-dialog-title">Choose your cover</SEIDialogTitle>
        <SEIDialogDescription className="story-cover-dialog-intro">Swipe through them, then keep the one you love.</SEIDialogDescription>
        {problem && <p className="story-cover-dialog-note" role="status">{problem}</p>}
        {made[chosen] && <div className="story-cover-carousel" tabIndex={0} role="group" aria-label="Covers to choose from" {...swipe(cycle)}>
          <button type="button" className="story-cover-cycle" aria-label="Previous cover" onClick={() => cycle(-1)} disabled={saving}><ChevronLeft size={22} aria-hidden="true" /></button>
          <figure className="story-cover-stage" data-testid="story-cover-stage">
            <img key={made[chosen]} src={made[chosen]} alt={`Cover ${chosen + 1} of ${made.length} for ${request.title}`} />
            <figcaption className="story-cover-stage-count">Cover {chosen + 1} of {made.length}</figcaption>
            {/* Every cover made can be saved here, kept or not; the ones not kept are let go. */}
            <a className="world-card-base-format story-cover-stage-download" href={made[chosen]} download={coverFileName(request.title, chosen)}
              aria-label={`Download cover ${chosen + 1}`} title="Download">
              <Download size={16} aria-hidden="true" />
            </a>
          </figure>
          <button type="button" className="story-cover-cycle" aria-label="Next cover" onClick={() => cycle(1)} disabled={saving}><ChevronRight size={22} aria-hidden="true" /></button>
        </div>}
        <div className="story-cover-dots" aria-hidden="true">
          {made.map((url, index) => <span key={url} data-on={index === chosen || undefined} />)}
        </div>
        <ManifestButton size="md" icon={Check} className="story-cover-keep" onClick={() => void keepChosen()} disabled={saving}>{saving ? 'Keeping…' : 'Use this cover'}</ManifestButton>
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
