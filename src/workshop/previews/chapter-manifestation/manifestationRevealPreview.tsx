import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import ManifestationReveal from '../../../components/chapter-manifestation/development/ManifestationReveal';
import CelestialScrollVessel from '../../../components/chapter-manifestation/development/vessels/CelestialScrollVessel';
import {
  MANIFESTATION_REVEAL_STATES,
  type ManifestationRevealState,
  type RevealedContent,
} from '../../../components/chapter-manifestation/shared/manifestationReveal';
import {
  MEDIA_KIND_LABEL,
  type MediaKind,
  type RevealedMediaAsset,
} from '../../../components/chapter-manifestation/shared/manifestation';

const MOCK_REVEALED_ASSET: RevealedMediaAsset = {
  src: '/icons/sacred-tree.svg',
  alt: 'Mock revealed standalone artwork',
};

const CONTAINMENT_OPTIONS: { id: 'compact' | 'full'; label: string; description: string; size: string }[] = [
  {
    id: 'compact',
    label: 'Compact',
    description: 'Side-by-side small previews; minimal vertical space.',
    size: 'min(28vw, 28dvh)',
  },
  {
    id: 'full',
    label: 'Full size',
    description: 'One large preview, full zone containment.',
    size: 'min(78vw, 78dvh)',
  },
];

const REVEAL_TIMING_MS: Record<'sealed' | 'revealed', number> = {
  sealed: 700,
  revealed: 1100,
};

/**
 * How long the reveal holds in `unsealing` while the asset generates.
 * "Instant" models an already-ready asset: it waits just past the opening
 * flourish so the morph still completes before the reveal.
 */
const GENERATION_DELAY_OPTIONS = [
  { id: 'instant', label: 'Instant', ms: 1200 },
  { id: '3s', label: '3s', ms: 3000 },
  { id: '8s', label: '8s', ms: 8000 },
] as const;

type GenerationDelayId = (typeof GENERATION_DELAY_OPTIONS)[number]['id'];

const MEDIA_KIND_OPTIONS: { id: MediaKind; label: string }[] = [
  { id: 'cover-art', label: 'Cover Art' },
  { id: 'image', label: 'Image' },
  { id: 'audio', label: 'Audio' },
  { id: 'visual-motion', label: 'Visual / Motion' },
];

export type ManifestationRevealControlSection = 'states' | 'effects' | 'advanced';

/** One Workshop-only state owner shared by the central controls and stage. */
export function useManifestationRevealPreview(
  initialState: ManifestationRevealState = 'sealed',
  initialContainment: 'compact' | 'full' = 'full',
) {
  const [state, setState] = useState<ManifestationRevealState>(initialState);
  const [contentMode, setContentMode] = useState<'mock' | 'placeholder'>('mock');
  const [mediaKind, setMediaKind] = useState<MediaKind>('image');
  const [unsealEnabled, setUnsealEnabled] = useState(true);
  const [containment, setContainment] = useState<'compact' | 'full'>(initialContainment);
  const [generationDelayId, setGenerationDelayId] = useState<GenerationDelayId>('instant');
  const [replayKey, setReplayKey] = useState(0);
  const sequenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generationDelayMs = useMemo(
    () => GENERATION_DELAY_OPTIONS.find(option => option.id === generationDelayId)?.ms
      ?? GENERATION_DELAY_OPTIONS[0].ms,
    [generationDelayId],
  );

  const clearSequenceTimer = useCallback(() => {
    if (sequenceTimer.current !== null) {
      clearTimeout(sequenceTimer.current);
      sequenceTimer.current = null;
    }
  }, []);

  useEffect(() => clearSequenceTimer, [clearSequenceTimer]);

  const setStateAndCancel = useCallback((next: ManifestationRevealState) => {
    clearSequenceTimer();
    setState(next);
  }, [clearSequenceTimer]);

  const content: RevealedContent = useMemo(() => {
    if (contentMode === 'mock') return MOCK_REVEALED_ASSET;
    return { placeholderLabel: MEDIA_KIND_LABEL[mediaKind] };
  }, [contentMode, mediaKind]);

  const handleUnseal = useCallback(() => {
    if (state !== 'sealed') return;
    clearSequenceTimer();
    setState('unsealing');
    sequenceTimer.current = setTimeout(() => {
      sequenceTimer.current = null;
      setState('revealed');
    }, generationDelayMs);
  }, [state, clearSequenceTimer, generationDelayMs]);

  const replaySequence = useCallback(() => {
    clearSequenceTimer();
    setReplayKey(key => key + 1);
    setState('sealed');
    const step = (index: number) => {
      const next = MANIFESTATION_REVEAL_STATES[index];
      if (!next) {
        sequenceTimer.current = null;
        return;
      }
      setState(next);
      const isLast = index === MANIFESTATION_REVEAL_STATES.length - 1;
      const wait = isLast
        ? 1200
        : next === 'unsealing'
          ? generationDelayMs
          : REVEAL_TIMING_MS[next];
      sequenceTimer.current = setTimeout(() => step(index + 1), wait);
    };
    sequenceTimer.current = setTimeout(() => step(0), 0);
  }, [clearSequenceTimer, generationDelayMs]);

  const reset = useCallback(() => {
    clearSequenceTimer();
    setReplayKey(key => key + 1);
    setState(initialState);
  }, [clearSequenceTimer, initialState]);

  const onUnseal = unsealEnabled && state === 'sealed' ? handleUnseal : undefined;
  const sizing = CONTAINMENT_OPTIONS.find(option => option.id === containment)?.size
    ?? CONTAINMENT_OPTIONS[0].size;

  return {
    state,
    contentMode,
    mediaKind,
    unsealEnabled,
    containment,
    generationDelayId,
    replayKey,
    content,
    onUnseal,
    sizing,
    setStateAndCancel,
    setContentMode,
    setMediaKind,
    setUnsealEnabled,
    setContainment,
    setGenerationDelayId,
    replaySequence,
    reset,
  };
}

export type ManifestationRevealPreviewController = ReturnType<typeof useManifestationRevealPreview>;

/**
 * Focused stage for the agnostic Manifestation Reveal mechanic. Workshop-only
 * controls are deliberately supplied to FeatureWorkspace instead of rendered
 * beside the component under test.
 */
export function ManifestationRevealPreview({
  controller,
}: {
  controller: ManifestationRevealPreviewController;
}) {
  const vessel = useMemo(
    () => (
      <CelestialScrollVessel
        state={controller.state}
        asset={controller.content.src ? MOCK_REVEALED_ASSET : null}
        mediaKind={controller.mediaKind}
      />
    ),
    [controller.content.src, controller.mediaKind, controller.state],
  );

  return (
    <div
      className="w-full min-h-[calc(100vh-9rem)] p-4 sm:p-8"
      data-manifestation-reveal-preview
      data-replay-key={controller.replayKey}
    >
      <section
        className="relative mx-auto flex min-h-[60dvh] max-w-5xl items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-neutral-950"
        aria-label="Manifestation reveal stage"
      >
        <div
          className="relative flex items-center justify-center"
          style={{ width: controller.sizing, height: controller.sizing, transition: 'width 240ms ease, height 240ms ease' }}
          data-containment={controller.containment}
          data-testid="manifestation-reveal-stage"
        >
          <ManifestationReveal
            state={controller.state}
            content={controller.content}
            onUnseal={controller.onUnseal}
            vessel={vessel}
            sealedTapLabel={`Unseal the manifestation (${controller.mediaKind})`}
            data-testid="manifestation-reveal-mechanic"
          />
        </div>

        {controller.containment === 'compact' && (
          <p className="absolute bottom-3 left-3 right-3 text-center text-[10px] uppercase tracking-widest text-white/35">
            Compact containment · {controller.sizing}
          </p>
        )}
      </section>
    </div>
  );
}

export function ManifestationRevealControls({
  controller,
  section,
}: {
  controller: ManifestationRevealPreviewController;
  section: ManifestationRevealControlSection;
}) {
  if (section === 'states') {
    return (
      <div className="space-y-5">
        <ControlGroup
          label="State"
          description="Manually view each progression. Manual picks cancel any in-flight sequence."
        >
          <PillRow>
            {MANIFESTATION_REVEAL_STATES.map(state => (
              <Pill
                key={state}
                selected={controller.state === state}
                onClick={() => controller.setStateAndCancel(state)}
                label={state.charAt(0).toUpperCase() + state.slice(1)}
              />
            ))}
          </PillRow>
        </ControlGroup>

        <ControlGroup
          label="Sequence"
          description="Replay sealed to unsealing to revealed, or reset to the initial sealed state."
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={controller.replaySequence}
              className="workshop-touch-target inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/15 px-3 py-1.5 text-[11px] font-medium text-amber-200 transition-colors hover:bg-amber-500/25"
            >
              <Play size={12} /> Play sequence
            </button>
            <button
              type="button"
              onClick={controller.reset}
              className="workshop-touch-target inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/80 transition-colors hover:bg-white/10"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </ControlGroup>
      </div>
    );
  }

  if (section === 'effects') {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <ControlGroup
          label="Simulated generation delay"
          description="How long unsealing holds while the mock asset generates."
        >
          <PillRow>
            {GENERATION_DELAY_OPTIONS.map(option => (
              <Pill
                key={option.id}
                selected={controller.generationDelayId === option.id}
                onClick={() => controller.setGenerationDelayId(option.id)}
                label={option.label}
              />
            ))}
          </PillRow>
        </ControlGroup>

        <ControlGroup
          label="Revealed content"
          description="Switch between a supplied mock asset and the vessel's empty placeholder."
        >
          <PillRow>
            <Pill selected={controller.contentMode === 'mock'} onClick={() => controller.setContentMode('mock')} label="Mock asset" />
            <Pill selected={controller.contentMode === 'placeholder'} onClick={() => controller.setContentMode('placeholder')} label="Placeholder" />
          </PillRow>
        </ControlGroup>

        <ControlGroup
          label="Vessel kind"
          description="The placeholder uses this label when no asset is supplied."
        >
          <PillRow>
            {MEDIA_KIND_OPTIONS.map(kind => (
              <Pill
                key={kind.id}
                selected={controller.mediaKind === kind.id}
                onClick={() => controller.setMediaKind(kind.id)}
                label={kind.label}
              />
            ))}
          </PillRow>
        </ControlGroup>

        <ControlGroup
          label="Containment"
          description="Compact fits the reveal in a small box; full size shows the natural zone fill."
        >
          <PillRow>
            {CONTAINMENT_OPTIONS.map(option => (
              <Pill
                key={option.id}
                selected={controller.containment === option.id}
                onClick={() => controller.setContainment(option.id)}
                label={option.label}
              />
            ))}
          </PillRow>
        </ControlGroup>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ControlGroup
        label="Tap to unseal"
        description="With unseal on, the sealed scene is a button. With it off, the scene is a non-interactive image."
      >
        <PillRow>
          <Pill selected={controller.unsealEnabled} onClick={() => controller.setUnsealEnabled(true)} label="On" />
          <Pill selected={!controller.unsealEnabled} onClick={() => controller.setUnsealEnabled(false)} label="Off" />
        </PillRow>
      </ControlGroup>

      <dl className="grid max-w-md grid-cols-2 gap-x-4 gap-y-2 border-t border-white/5 pt-4 text-[11px] text-white/45">
        <dt>Current state</dt>
        <dd className="text-right font-medium text-white/80">{controller.state}</dd>
        <dt>OnUnseal</dt>
        <dd className="text-right font-medium text-white/80">{controller.onUnseal ? 'bound' : 'omitted'}</dd>
        <dt>Content</dt>
        <dd className="text-right font-medium text-white/80">{controller.content.src ? 'supplied asset' : 'placeholder'}</dd>
      </dl>
    </div>
  );
}

function ControlGroup({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/85">{label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{description}</p>
      </div>
      {children}
    </section>
  );
}

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
      className={`workshop-touch-target rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
        selected
          ? 'border-amber-500/45 bg-amber-500/20 text-amber-100'
          : 'border-white/10 bg-white/5 text-white/65 hover:border-white/25 hover:text-white/85'
      }`}
    >
      {label}
    </button>
  );
}

export default ManifestationRevealPreview;
