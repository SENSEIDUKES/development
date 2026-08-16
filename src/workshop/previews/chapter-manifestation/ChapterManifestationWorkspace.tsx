import React, { useState, useEffect } from 'react';
import ReferenceAILoadingVeil from '../../../components/chapter-manifestation/reference/AILoadingVeil';
import DevelopmentAILoadingVeil from '../../../components/chapter-manifestation/development/AILoadingVeil';
import { defaultDestinationFor } from '../../../components/chapter-manifestation/development/journey-scrubber/destinations';
import {
  manifestationModeForOperation,
  type MediaRevealState,
  type RevealedMediaAsset,
} from '../../../components/chapter-manifestation/shared/manifestation';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { Square, Sparkles, Minimize2, Compass, Layers, Wand2, Scroll, Box } from 'lucide-react';
import ManifestationRevealPreview from './manifestationRevealPreview';

/**
 * Every operation routable through the Aura Veil's two manifestation modes.
 * Reader Chamber, Codex, and Narration are deliberately absent — they own
 * dedicated manifestation logic and are never previewed here.
 */
type GenerationPhase =
  | 'blueprint' | 'initial-arc' | 'steer' | 'alter-fate' | 'chapter'
  | 'cover' | 'image' | 'audio' | 'visual'
  | null;

const NARRATIVE_OPERATIONS: { id: Exclude<GenerationPhase, null>; label: string }[] = [
  { id: 'blueprint', label: 'World Blueprint' },
  { id: 'initial-arc', label: 'Initial Arc' },
  { id: 'steer', label: 'Steering' },
  { id: 'alter-fate', label: 'Alter Fate' },
  { id: 'chapter', label: 'Chapter' },
];

const MEDIA_OPERATIONS: { id: Exclude<GenerationPhase, null>; label: string }[] = [
  { id: 'cover', label: 'Cover Art' },
  { id: 'image', label: 'Image' },
  { id: 'audio', label: 'Audio' },
  { id: 'visual', label: 'Visual / Motion' },
];

const ALL_OPERATIONS = [...NARRATIVE_OPERATIONS, ...MEDIA_OPERATIONS];

/**
 * The two top-level workshop areas inside this feature. The Aura Veil
 * segment is the existing full-shell simulation (Reference / Development /
 * Compare); the Manifestation Reveal segment is the focused standalone
 * preview for the agnostic mechanic.
 */
type WorkshopArea = 'aura-veil' | 'manifestation-reveal';

/**
 * Journey scrubber cosmetics — Workshop-only preview state for the
 * Development veil's cosmetic slots. Picking a traveler also applies its
 * recommended destination family, but the destination stays independently
 * selectable so every traveler can be tested with every family.
 */
interface ScrubberCosmetics {
  travelerId: string;
  trailStyle: string;
  destinationId: string;
}

const TRAVELER_OPTIONS = [
  { id: 'cultivator', label: 'Cultivator' },
  { id: 'sword-rider', label: 'Sword Rider' },
  { id: 'spirit-beast', label: 'Spirit Beast' },
];

const TRAIL_OPTIONS = [
  { id: 'qi-glow', label: 'Qi Glow' },
  { id: 'scroll-trail', label: 'Scroll Trail' },
  { id: 'starlight-trail', label: 'Starlight Trail' },
];

const DESTINATION_OPTIONS = [
  { id: 'door', label: 'Door / Gate' },
  { id: 'sect', label: 'Sect / Temple' },
  { id: 'cave', label: 'Cave' },
];

function useScrubberCosmetics() {
  const [travelerId, setTravelerId] = useState('cultivator');
  const [trailStyle, setTrailStyle] = useState('qi-glow');
  const [destinationId, setDestinationId] = useState(() => defaultDestinationFor('cultivator'));

  // A traveler switch nominates its recommended destination; the
  // destination control itself remains free, so any combination is testable.
  const pickTraveler = (id: string) => {
    setTravelerId(id);
    setDestinationId(defaultDestinationFor(id));
  };

  return { travelerId, trailStyle, destinationId, pickTraveler, setTrailStyle, setDestinationId };
}

/**
 * Media manifestation preview state — Workshop-only. Drives the media
 * zone's scroll reveal progression and whether the revealed scroll frames
 * the mock asset or the celestial vista placeholder. Defaults to `sealed`
 * so the tap-to-unseal flow is the first thing experienced: tapping the
 * sealed scroll in the veil flips to `unsealing` and auto-advances to
 * `revealed` after ~1.6s. The reveal pills stay as manual overrides and
 * cancel any pending auto-advance.
 *
 * These controls live in the Aura Veil segment only — the standalone
 * Manifestation Reveal preview has its own dedicated control surface in
 * `manifestationRevealPreview.tsx`.
 */
const REVEAL_OPTIONS: { id: MediaRevealState; label: string }[] = [
  { id: 'sealed', label: 'Sealed' },
  { id: 'unsealing', label: 'Unsealing' },
  { id: 'revealed', label: 'Revealed' },
];

const REVEALED_CONTENT_OPTIONS = [
  { id: 'mock', label: 'Mock Asset' },
  { id: 'placeholder', label: 'Placeholder Vista' },
];

const MOCK_REVEALED_ASSET: RevealedMediaAsset = {
  src: '/icons/sacred-tree.svg',
  alt: 'Mock revealed standalone artwork',
};

function useMediaPreview() {
  const [reveal, setRevealState] = useState<MediaRevealState>('sealed');
  const [revealedContent, setRevealedContent] = useState('mock');
  const unsealTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingUnseal = () => {
    if (unsealTimer.current !== null) {
      clearTimeout(unsealTimer.current);
      unsealTimer.current = null;
    }
  };

  // No pending timer may outlive the preview hook.
  useEffect(() => clearPendingUnseal, []);

  // Manual override from the reveal pills — cancels any auto-advance.
  const setReveal = (next: MediaRevealState) => {
    clearPendingUnseal();
    setRevealState(next);
  };

  // Tap-to-unseal: sealed → unsealing → (after ~1.6s) revealed.
  const unsealScroll = () => {
    if (reveal !== 'sealed') return;
    clearPendingUnseal();
    setRevealState('unsealing');
    unsealTimer.current = setTimeout(() => {
      unsealTimer.current = null;
      setRevealState('revealed');
    }, 1600);
  };

  const asset = revealedContent === 'mock' ? MOCK_REVEALED_ASSET : null;
  return { reveal, setReveal, unsealScroll, revealedContent, setRevealedContent, asset };
}

/**
 * One simulated generation run, shared by whichever veil implementation
 * (reference or development, or both in Compare) is currently mounted — so
 * comparisons are judged against identical live state, not two independent
 * simulations.
 */
function useGenerationSimulation() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [phase, setPhase] = useState<GenerationPhase>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [estimatedSecondsRemaining, setEstimatedSecondsRemaining] = useState<number | null>(null);
  const [activeAgentId, setActiveAgentId] = useState<'versa' | 'scout'>('versa');
  const [streamingBlocksCount, setStreamingBlocksCount] = useState(0);
  const [isVeilMinimized, setIsVeilMinimized] = useState(false);
  const [generatingChapterNum] = useState<number | null>(1);
  const [veilPhase, setVeilPhase] = useState<Exclude<GenerationPhase, null>>('chapter');

  useEffect(() => {
    if (isGenerating && phase === 'chapter') {
      const timer = setInterval(() => {
        setStreamingBlocksCount((prev) => (prev >= 20 ? 0 : prev + 1));
        setEstimatedSecondsRemaining((prev) => (prev && prev > 0 ? prev - 1 : 45));
      }, 1500);
      return () => clearInterval(timer);
    }
  }, [isGenerating, phase]);

  const resetRun = () => {
    setStreamingBlocksCount(0);
    setProgressMessage(null);
    setEstimatedSecondsRemaining(null);
  };

  const openVeil = () => {
    resetRun();
    setActiveAgentId('versa');
    setPhase(veilPhase);
    setEstimatedSecondsRemaining(
      veilPhase === 'chapter'
        ? 45
        : manifestationModeForOperation(veilPhase) === 'media'
          ? 35
          : null,
    );
    setIsVeilMinimized(false);
    setIsGenerating(true);
  };

  const openVersaCompact = () => {
    resetRun();
    setActiveAgentId('versa');
    setPhase('chapter');
    setEstimatedSecondsRemaining(45);
    setIsVeilMinimized(true);
    setIsGenerating(true);
  };

  const openScoutCompact = () => {
    resetRun();
    setActiveAgentId('scout');
    setPhase(null);
    setProgressMessage('Scanning the archives...');
    setIsVeilMinimized(false);
    setIsGenerating(true);
  };

  const stopSimulation = () => {
    setIsGenerating(false);
    setPhase(null);
    resetRun();
  };

  return {
    isGenerating,
    phase,
    progressMessage,
    estimatedSecondsRemaining,
    activeAgentId,
    streamingBlocksCount,
    isVeilMinimized,
    setIsVeilMinimized,
    generatingChapterNum,
    veilPhase,
    setVeilPhase,
    openVeil,
    openVersaCompact,
    openScoutCompact,
    stopSimulation,
  };
}

/* ─── Reusable control primitives ──────────────────────────────────────── */

function PillRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Pill({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`px-3 py-1.5 text-[11px] rounded-full border transition-colors ${
        selected
          ? 'bg-amber-500/20 border-amber-500/45 text-amber-100'
          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300'
      }`}
    >
      {label}
    </button>
  );
}

function ControlGroup({
  icon,
  title,
  hint,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="p-5 sm:p-6 space-y-3 border-b border-white/5 last:border-b-0">
      <header className="space-y-0.5">
        <h2 className="text-[11px] font-semibold text-neutral-200 flex items-center gap-2 uppercase tracking-widest">
          {icon}
          {title}
        </h2>
        {hint && <p className="text-[11px] leading-relaxed text-neutral-500">{hint}</p>}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function PillOptionGroup({
  label,
  options,
  selected,
  onPick,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: string;
  onPick: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] text-neutral-500 mb-1.5">{label}</p>
      <PillRow>
        {options.map((o) => (
          <Pill key={o.id} selected={selected === o.id} onClick={() => onPick(o.id)} label={o.label} />
        ))}
      </PillRow>
    </div>
  );
}

/* ─── Aura Veil segment controls ───────────────────────────────────────── */

function AuraVeilSimulationControls({
  sim,
  cosmetics,
  media,
}: {
  sim: ReturnType<typeof useGenerationSimulation>;
  cosmetics: ReturnType<typeof useScrubberCosmetics>;
  media: ReturnType<typeof useMediaPreview>;
}) {
  const veilPhaseIsMedia = manifestationModeForOperation(sim.veilPhase) === 'media';

  return (
    <div className="max-w-2xl bg-neutral-900/50 border border-neutral-800 rounded-xl divide-y divide-white/5">
      <ControlGroup
        icon={<Layers size={14} className="text-human" />}
        title="Operation"
        hint="Selects which generation operation the Aura Veil simulates. Narrative operations show the omen scene; media operations show the Manifestation Reveal."
      >
        <div className="space-y-3">
          <PillOptionGroup
            label="Narrative Manifestation"
            options={NARRATIVE_OPERATIONS}
            selected={sim.veilPhase}
            onPick={(id) => sim.setVeilPhase(id as Exclude<GenerationPhase, null>)}
          />
          <PillOptionGroup
            label="Media Manifestation"
            options={MEDIA_OPERATIONS}
            selected={sim.veilPhase}
            onPick={(id) => sim.setVeilPhase(id as Exclude<GenerationPhase, null>)}
          />
        </div>
      </ControlGroup>

      {veilPhaseIsMedia && (
        <ControlGroup
          icon={<Scroll size={14} className="text-amber-300" />}
          title="Manifestation Reveal (dev chain)"
          hint="Forces the reveal progression and the revealed content while a media operation is selected. With the veil open on Sealed, tap the scroll to unseal — it auto-advances Unsealing → Revealed after ~1.6s; the pills above are manual overrides."
        >
          <PillOptionGroup
            label="Scroll Reveal"
            options={REVEAL_OPTIONS}
            selected={media.reveal}
            onPick={(id) => media.setReveal(id as MediaRevealState)}
          />
          <PillOptionGroup
            label="Revealed Content"
            options={REVEALED_CONTENT_OPTIONS}
            selected={media.revealedContent}
            onPick={media.setRevealedContent}
          />
        </ControlGroup>
      )}

      <ControlGroup
        icon={<Wand2 size={14} className="text-portal" />}
        title="Journey Scrubber"
        hint="Cosmetic slots for the scrubber's traveler, trail, and destination. Picking a traveler also applies its recommended destination; the destination control stays independently selectable."
      >
        <PillOptionGroup
          label="Traveler"
          options={TRAVELER_OPTIONS}
          selected={cosmetics.travelerId}
          onPick={cosmetics.pickTraveler}
        />
        <PillOptionGroup
          label="Aura Trail"
          options={TRAIL_OPTIONS}
          selected={cosmetics.trailStyle}
          onPick={cosmetics.setTrailStyle}
        />
        <PillOptionGroup
          label="Destination"
          options={DESTINATION_OPTIONS}
          selected={cosmetics.destinationId}
          onPick={cosmetics.setDestinationId}
        />
      </ControlGroup>

      <ControlGroup
        icon={<Sparkles size={14} className="text-amber-300" />}
        title="Simulation"
        hint="Open the Aura Veil in primary or compact mode, or stop the running simulation."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={sim.openVeil}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-human/20 border border-human/40 hover:bg-human/30 text-human text-sm font-semibold tracking-wide rounded-lg transition-colors"
          >
            <Sparkles size={15} /> Open Veil
          </button>
          <button
            onClick={sim.stopSimulation}
            disabled={!sim.isGenerating}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-900/20 text-red-400 hover:bg-red-900/40 text-xs rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Square size={13} /> Stop Simulation
          </button>
        </div>
      </ControlGroup>

      <ControlGroup
        icon={<Minimize2 size={14} className="text-portal" />}
        title="Compact Indicators"
        hint="Open a compact background/retrieval task to see the persistent floating indicator."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={sim.openVersaCompact}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-500 text-sm font-medium rounded-lg transition-colors"
          >
            <Minimize2 size={14} /> Versa — Background
          </button>
          <button
            onClick={sim.openScoutCompact}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-portal/10 border border-portal/30 hover:bg-portal/20 text-portal text-sm font-medium rounded-lg transition-colors"
          >
            <Compass size={14} /> Scout — Retrieval
          </button>
        </div>
      </ControlGroup>
    </div>
  );
}

function VeilCanvas({ Veil, sim }: { Veil: typeof ReferenceAILoadingVeil; sim: ReturnType<typeof useGenerationSimulation> }) {
  return (
    <div className="relative min-h-[calc(100vh-11rem)] bg-neutral-950 p-4 sm:p-8 font-sans text-neutral-200">
      <div className="p-6 border border-neutral-800/50 rounded-lg text-neutral-500 text-sm">
        Background app content... (Testing minimize state visibility)
      </div>
      <Veil
        isGenerating={sim.isGenerating}
        generationPhase={sim.phase}
        generationProgressMessage={sim.progressMessage}
        estimatedSecondsRemaining={sim.estimatedSecondsRemaining}
        activeAgentId={sim.activeAgentId}
        streamingBlocksCount={sim.streamingBlocksCount}
        isVeilMinimized={sim.isVeilMinimized}
        setIsVeilMinimized={sim.setIsVeilMinimized}
        generatingChapterNum={sim.generatingChapterNum}
      />
    </div>
  );
}

/**
 * Development-only canvas: identical simulation state, plus the scrubber
 * cosmetics and media reveal overrides from the Workshop controls forwarded
 * into the Development veil.
 */
function DevelopmentVeilCanvas({
  sim,
  cosmetics,
  media,
}: {
  sim: ReturnType<typeof useGenerationSimulation>;
  cosmetics: ScrubberCosmetics;
  media: ReturnType<typeof useMediaPreview>;
}) {
  return (
    <div className="relative min-h-[calc(100vh-11rem)] bg-neutral-950 p-4 sm:p-8 font-sans text-neutral-200">
      <div className="p-6 border border-neutral-800/50 rounded-lg text-neutral-500 text-sm">
        Background app content... (Testing minimize state visibility)
      </div>
      <DevelopmentAILoadingVeil
        isGenerating={sim.isGenerating}
        generationPhase={sim.phase}
        generationProgressMessage={sim.progressMessage}
        estimatedSecondsRemaining={sim.estimatedSecondsRemaining}
        activeAgentId={sim.activeAgentId}
        streamingBlocksCount={sim.streamingBlocksCount}
        isVeilMinimized={sim.isVeilMinimized}
        setIsVeilMinimized={sim.setIsVeilMinimized}
        generatingChapterNum={sim.generatingChapterNum}
        travelerId={cosmetics.travelerId}
        trailStyle={cosmetics.trailStyle}
        destinationId={cosmetics.destinationId}
        mediaReveal={media.reveal}
        mediaAsset={media.asset}
        onMediaUnseal={media.unsealScroll}
      />
    </div>
  );
}

/* ─── Top-level page segment switcher ──────────────────────────────────── */

const AREA_OPTIONS: { id: WorkshopArea; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'aura-veil',
    label: 'Aura Veil',
    description: 'Full-shell simulation: Versa hero, journey scrubber, active manifestation zone.',
    icon: <Layers size={14} />,
  },
  {
    id: 'manifestation-reveal',
    label: 'Manifestation Reveal',
    description: 'Focused standalone preview: every state, content, containment, and activation path on its own.',
    icon: <Box size={14} />,
  },
];

function WorkshopAreaSwitcher({
  area,
  onChange,
}: {
  area: WorkshopArea;
  onChange: (next: WorkshopArea) => void;
}) {
  return (
    <nav
      role="tablist"
      aria-label="Workshop areas"
      className="max-w-7xl mx-auto px-4 sm:px-6 pt-4"
    >
      <div className="inline-flex max-w-full flex-wrap rounded-2xl border border-white/10 bg-white/5 p-1 gap-1">
        {AREA_OPTIONS.map((opt) => {
          const selected = area === opt.id;
          return (
            <button
              key={opt.id}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`area-panel-${opt.id}`}
              data-area={opt.id}
              onClick={() => onChange(opt.id)}
              className={`workshop-touch-target flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors sm:px-4 ${
                selected
                  ? 'bg-amber-500/20 text-amber-100'
                  : 'text-white/55 hover:text-white/80'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-white/45 max-w-2xl">
        {AREA_OPTIONS.find((o) => o.id === area)?.description}
      </p>
    </nav>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */

export function ChapterManifestationWorkspace() {
  const entry = workshopEntries.find((e) => e.id === 'chapter-generation-manifestation')!;
  const sim = useGenerationSimulation();
  const cosmetics = useScrubberCosmetics();
  const media = useMediaPreview();
  const [area, setArea] = useState<WorkshopArea>('aura-veil');

  return (
    <div className="bg-[#04060d] text-slate-300 font-sans">
      <WorkshopAreaSwitcher area={area} onChange={setArea} />

      <div
        role="tabpanel"
        id={`area-panel-${area}`}
        aria-labelledby={`area-${area}`}
        className="pt-4"
        data-active-area={area}
      >
        {area === 'aura-veil' ? (
          <FeatureWorkspace
            entry={entry}
            controls={<AuraVeilSimulationControls sim={sim} cosmetics={cosmetics} media={media} />}
            renderReference={() => <VeilCanvas Veil={ReferenceAILoadingVeil} sim={sim} />}
            renderDevelopment={() => <DevelopmentVeilCanvas sim={sim} cosmetics={cosmetics} media={media} />}
          />
        ) : (
          <ManifestationRevealPreview />
        )}
      </div>
    </div>
  );
}

export default ChapterManifestationWorkspace;
