import React, { useState, useEffect } from 'react';
import ReferenceAILoadingVeil from '../../../components/chapter-manifestation/reference/AILoadingVeil';
import DevelopmentAILoadingVeil from '../../../components/chapter-manifestation/development/AILoadingVeil';
import { defaultDestinationFor } from '../../../components/chapter-manifestation/development/journey-scrubber/destinations';
import {
  manifestationModeForOperation,
  type MediaRevealState,
  type RevealedMediaAsset,
} from '../../../components/chapter-manifestation/shared/manifestation';
import {
  FeatureWorkspace,
  type WorkshopControlSection,
  type WorkshopControlsConfig,
} from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { Square, Sparkles, Minimize2, Compass, Layers, Wand2, Scroll, Box } from 'lucide-react';
import {
  ManifestationRevealControls,
  ManifestationRevealPreview,
  useManifestationRevealPreview,
} from './manifestationRevealPreview';

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
  section,
}: {
  sim: ReturnType<typeof useGenerationSimulation>;
  cosmetics: ReturnType<typeof useScrubberCosmetics>;
  media: ReturnType<typeof useMediaPreview>;
  section: 'states' | 'effects' | 'advanced';
}) {
  const veilPhaseIsMedia = manifestationModeForOperation(sim.veilPhase) === 'media';

  if (section === 'effects') {
    return (
      <ControlGroup
        icon={<Wand2 size={14} className="text-portal" />}
        title="Journey Scrubber"
        hint="Cosmetic slots for the scrubber's traveler, trail, and destination. Picking a traveler applies its recommended destination; the destination remains independently selectable."
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
    );
  }

  if (section === 'advanced') {
    return (
      <ControlGroup
        icon={<Minimize2 size={14} className="text-portal" />}
        title="Compact Indicators"
        hint="Open a compact background or retrieval task to inspect the persistent floating indicator."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={sim.openVersaCompact}
            className="workshop-touch-target flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-500 transition-colors hover:bg-amber-500/20"
          >
            <Minimize2 size={14} /> Versa — Background
          </button>
          <button
            type="button"
            onClick={sim.openScoutCompact}
            className="workshop-touch-target flex items-center justify-center gap-2 rounded-lg border border-portal/30 bg-portal/10 px-4 py-3 text-sm font-medium text-portal transition-colors hover:bg-portal/20"
          >
            <Compass size={14} /> Scout — Retrieval
          </button>
        </div>
      </ControlGroup>
    );
  }

  return (
    <div className="divide-y divide-white/5">
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
        icon={<Sparkles size={14} className="text-amber-300" />}
        title="Simulation"
        hint="Open the Aura Veil in primary or compact mode, or stop the running simulation."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={sim.openVeil}
            className="workshop-touch-target flex items-center justify-center gap-2 px-4 py-3 bg-human/20 border border-human/40 hover:bg-human/30 text-human text-sm font-semibold tracking-wide rounded-lg transition-colors"
          >
            <Sparkles size={15} /> Open Veil
          </button>
          <button
            type="button"
            onClick={sim.stopSimulation}
            disabled={!sim.isGenerating}
            className="workshop-touch-target flex items-center justify-center gap-2 px-4 py-3 bg-red-900/20 text-red-400 hover:bg-red-900/40 text-xs rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Square size={13} /> Stop Simulation
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

function WorkshopPageControls({
  area,
  onChange,
}: {
  area: WorkshopArea;
  onChange: (next: WorkshopArea) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {AREA_OPTIONS.map(option => {
        const selected = area === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            data-area={option.id}
            onClick={() => onChange(option.id)}
            className={`workshop-touch-target rounded-xl border px-4 py-3 text-left transition-colors ${
              selected
                ? 'border-amber-500/45 bg-amber-500/15 text-amber-100'
                : 'border-white/10 bg-black/20 text-white/60 hover:bg-white/10 hover:text-white/85'
            }`}
          >
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
              {option.icon}
              {option.label}
            </span>
            <span className="mt-1.5 block text-[11px] normal-case leading-relaxed tracking-normal text-white/45">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */

export function ChapterManifestationWorkspace() {
  const entry = workshopEntries.find((e) => e.id === 'chapter-generation-manifestation')!;
  const sim = useGenerationSimulation();
  const cosmetics = useScrubberCosmetics();
  const media = useMediaPreview();
  const revealPreview = useManifestationRevealPreview();
  const [area, setArea] = useState<WorkshopArea>('aura-veil');

  const controlSections: WorkshopControlSection[] = [
    {
      id: 'pages',
      description: 'Choose the full Aura Veil shell or the focused Development-only reveal mechanic.',
      content: <WorkshopPageControls area={area} onChange={setArea} />,
    },
    ...(area === 'aura-veil'
      ? [
          {
            id: 'states' as const,
            description: 'Choose an operation, force media reveal progression, and run or stop the shared veil simulation.',
            content: <AuraVeilSimulationControls sim={sim} cosmetics={cosmetics} media={media} section="states" />,
          },
          {
            id: 'effects' as const,
            description: 'Tune Development-only traveler, trail, and destination cosmetics.',
            content: <AuraVeilSimulationControls sim={sim} cosmetics={cosmetics} media={media} section="effects" />,
          },
          {
            id: 'advanced' as const,
            description: 'Open compact background-task indicators without changing the component navigation.',
            content: <AuraVeilSimulationControls sim={sim} cosmetics={cosmetics} media={media} section="advanced" />,
          },
        ]
      : [
          {
            id: 'states' as const,
            description: 'Inspect each reveal state or replay the complete sealed-to-revealed sequence.',
            content: <ManifestationRevealControls controller={revealPreview} section="states" />,
          },
          {
            id: 'effects' as const,
            description: 'Tune delay, revealed content, vessel label, and responsive containment.',
            content: <ManifestationRevealControls controller={revealPreview} section="effects" />,
          },
          {
            id: 'advanced' as const,
            description: 'Toggle the activation contract and inspect the current caller bindings.',
            content: <ManifestationRevealControls controller={revealPreview} section="advanced" />,
          },
        ]),
  ];
  const workshopControls: WorkshopControlsConfig = {
    defaultSection: 'pages',
    description: 'All page, state, effect, and simulator options are Workshop-only.',
    sections: controlSections,
  };

  return (
    <FeatureWorkspace
      entry={entry}
      allowCompare={area === 'aura-veil'}
      workshopControls={workshopControls}
      renderReference={() => area === 'aura-veil' ? (
        <VeilCanvas Veil={ReferenceAILoadingVeil} sim={sim} />
      ) : (
        <div className="flex min-h-[50vh] items-center justify-center bg-neutral-950 p-6 text-center text-sm text-white/45">
          Manifestation Reveal is a Development-only mechanic and has no locked Original Reference pane.
        </div>
      )}
      renderDevelopment={() => area === 'aura-veil' ? (
        <DevelopmentVeilCanvas sim={sim} cosmetics={cosmetics} media={media} />
      ) : (
        <ManifestationRevealPreview controller={revealPreview} />
      )}
    />
  );
}

export default ChapterManifestationWorkspace;
